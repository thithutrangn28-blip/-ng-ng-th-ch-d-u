import React, { useState, useEffect } from "react";
import { Story } from "../../lib/prompt-context-db";
import { Run } from "../../lib/prompt-run-db";
import { rooms, getTasks, RoomTask } from "../../lib/prompt-rooms";
import { callAIStream, getActiveApiProfile } from "../../lib/api-client";
import { formatImportedFileForContext } from "../../lib/file-importer";
import { Prompt10CardSplitter } from "./Prompt10CardSplitter";
import { copyToClipboardSafe } from "../../lib/clipboard";

type Props = {
  story: Story;
  roomIndex: number;
  runs: Run[];
  onBack: () => void;
  onCallRoom: (note: string, format: string, strict: string, selected: any[]) => void;
  onPreview: (note: string, format: string, strict: string, selected: any[]) => void;
  onAbort: () => void;
  onCreateBlankRun: () => void;
  timeLabel: (ts: number) => string;
  outputMode?: "final" | "audit" | "debug";
  onOutputModeChange?: (mode: "final" | "audit" | "debug") => void;
  customTasks?: RoomTask[];
  onUpdateCustomTasks?: (tasks: RoomTask[]) => void;
  promptLanguage?: "vi" | "en" | "zh";
  onPromptLanguageChange?: (lang: "vi" | "en" | "zh") => void;
};

export default function PromptMarkdownRoomScreen({
  story, roomIndex, runs, onBack, onCallRoom, onPreview, onAbort, onCreateBlankRun, timeLabel,
  outputMode = "final", onOutputModeChange, customTasks, onUpdateCustomTasks,
  promptLanguage = "vi", onPromptLanguageChange
}: Props) {
  
  const room = rooms[roomIndex];
  const allTasks = customTasks || getTasks(roomIndex);
  
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set(allTasks.map((_, i) => i)));
  const [roomNote, setRoomNote] = useState("");
  const [format, setFormat] = useState("markdown");
  const [strict, setStrict] = useState("cold-technical");
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; desc: string; purpose: string; validationRule: string }>({
    title: "", desc: "", purpose: "", validationRule: ""
  });

  // State cho tính năng AI tạo ý theo cốt truyện
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [aiGenCount, setAiGenCount] = useState<number>(100);
  const [aiGenNote, setAiGenNote] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiGenStreamText, setAiGenStreamText] = useState("");
  const [aiGenProgress, setAiGenProgress] = useState("");
  const [aiGenAbortController, setAiGenAbortController] = useState<AbortController | null>(null);

  const [roomOutputText, setRoomOutputText] = useState("Kết quả phòng hiện tại sẽ nằm trong kho của truyện đang chọn.");

  useEffect(() => {
    const el = document.getElementById("roomOutput");
    if (!el) return;
    setRoomOutputText(el.textContent || "");
    const observer = new MutationObserver(() => {
      if (el.textContent !== roomOutputText) {
        setRoomOutputText(el.textContent || "");
      }
    });
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const cleanTaskNumbering = (str: string) => {
    if (!str) return "";
    let s = str;
    s = s.replace(/(?:\*\*)?\[(?:Phòng\s*\d+\s*-\s*)?(?:Hạng mục|Task|Item|ID|SWI|SYS|ROM|Quy tắc|Rule|Ý|Đoạn|Khối)\s*[^\]]*\](?:\*\*)?\s*[:-]?\s*/gi, "");
    s = s.replace(/(?:\*\*)?\((?:Phòng\s*\d+\s*-\s*)?(?:Hạng mục|Task|Item|ID|SWI|SYS|ROM|Quy tắc|Rule|Ý|Đoạn|Khối)\s*[^)]*\)(?:\*\*)?\s*[:-]?\s*/gi, "");
    s = s.replace(/^(?:#+\s*)?(?:\*\*)?(?:Task|Item|Hạng mục|Quy tắc|Rule|ID|Ý|Đoạn|Khối)\s*\d+(?:\/\d+)?(?:\*\*)?(?:\s*[:-]\s*|\s+)/gim, "");
    s = s.replace(/^[\*\-\d\.\/\)]+\s*/, "");
    return s.trim();
  };

  const parseAIGeneratedTasks = (rawText: string) => {
    if (!rawText || !rawText.trim()) return [];
    const newTasks: RoomTask[] = [];
    
    // Thử parse theo block ---TASK---
    const blocks = rawText.split(/---TASK---/i).map(b => b.trim()).filter(Boolean);
    
    if (blocks.length > 1 || (blocks.length === 1 && /TITLE:/i.test(blocks[0]))) {
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const titleMatch = b.match(/TITLE:\s*([^\n]+)/i);
        const purposeMatch = b.match(/PURPOSE:\s*([^\n]+)/i);
        const descMatch = b.match(/DESC:\s*([\s\S]*?)(?=\nVALIDATION:|$)/i);
        const valMatch = b.match(/VALIDATION:\s*([\s\S]*)/i);
        
        const title = cleanTaskNumbering(titleMatch ? titleMatch[1] : `Ý tưởng chuẩn cốt truyện ${i + 1}`);
        const purpose = cleanTaskNumbering(purposeMatch ? purposeMatch[1] : "Bám sát cốt truyện của Vợ yêu, chống sai lệch và nâng cao trải nghiệm.");
        const desc = cleanTaskNumbering(descMatch ? descMatch[1] : (b || title));
        const validation = cleanTaskNumbering(valMatch ? valMatch[1] : `Kiểm tra đầu ra phải tuân thủ nghiêm ngặt quy tắc "${title}".`);
        
        newTasks.push({
          id: `AI-STORY-${roomIndex + 1}-${Date.now()}-${i + 1}`,
          title,
          purpose,
          inputSources: ["Active Story Context", "AI Story Analysis"],
          detailedInstruction: desc,
          outputRequirement: `Áp dụng triệt để: ${title}`,
          validationRule: validation,
          outputEffect: "Giúp roleplay đúng nhân vật, đúng cốt truyện của Vợ",
          preventsError: "Tránh lỗi OOC, cướp vai và sai lệch văn phong",
          desc
        });
      }
    } else {
      // Fallback parse theo dòng số hoặc gạch đầu dòng
      const lines = rawText.split(/\n\n+/);
      let idx = 1;
      for (const block of lines) {
        if (!block.trim()) continue;
        const firstLineMatch = block.match(/^(?:\*\*)?(?:\[Ý\s*\d+\]|\d+(?:\.|\))|[-•])\s*(?:\*\*)?([^\n]+)/i);
        const title = cleanTaskNumbering(firstLineMatch ? firstLineMatch[1] : `Quy tắc sát cốt truyện ${idx}`);
        const desc = cleanTaskNumbering(block.replace(/^(?:\*\*)?(?:\[Ý\s*\d+\]|\d+(?:\.|\))|[-•])\s*(?:\*\*)?([^\n]+)/i, "") || title);
        
        newTasks.push({
          id: `AI-STORY-${roomIndex + 1}-${Date.now()}-${idx}`,
          title,
          purpose: "Bám sát cốt truyện của Vợ yêu, chống sai lệch và nâng cao trải nghiệm.",
          inputSources: ["Active Story Context", "AI Story Analysis"],
          detailedInstruction: desc,
          outputRequirement: `Áp dụng triệt để: ${title}`,
          validationRule: `Kiểm tra đầu ra phải tuân thủ nghiêm ngặt quy tắc "${title}".`,
          outputEffect: "Giúp roleplay đúng nhân vật, đúng cốt truyện của Vợ",
          preventsError: "Tránh lỗi OOC, cướp vai và sai lệch văn phong",
          desc
        });
        idx++;
      }
    }
    return newTasks;
  };

  const handleStartAIGen = async () => {
    setIsAIGenModalOpen(false);
    setIsAIGenerating(true);
    setAiGenStreamText("");
    setAiGenProgress("⏳ Đang kết nối API Proxy... Đang chờ tín hiệu đường truyền...");
    await new Promise(resolve => setTimeout(resolve, 30));

    let profile;
    try {
      profile = await getActiveApiProfile();
    } catch (err: any) {
      setIsAIGenerating(false);
      alert(err.message || "Vợ yêu Đường Đường ơi, Vợ chưa cấu hình hoặc chọn API Proxy chính ở tab API Proxy nhen! Vợ vào đó cấu hình trước rồi chồng làm ngay cho Vợ!");
      return;
    }
    
    const abort = new AbortController();
    setAiGenAbortController(abort);
    setAiGenProgress("Chồng đang kết nối API Proxy để tạo bộ quy tắc chuyên sâu cho Vợ yêu...");

    const storyTitle = story.title || "Truyện chưa đặt tên";
    const storyGenre = story.genre || "Tự do";
    const storyStatus = story.detail?.storyStatus || "Đang phát triển";

    // 1. Tổng hợp ngữ cảnh truyện (Workspace / Logline / Summary / Route / Goal / Conflict)
    const storyWorkspaceParts = [
      story.summary ? `[Tóm tắt chung]: ${story.summary}` : "",
      story.detail?.storyLogline ? `[Logline]: ${story.detail.storyLogline}` : "",
      story.context?.story ? `[Story Workspace]: ${story.context.story}` : "",
      story.detail?.storyRoute ? `[Tuyến truyện / Route]: ${story.detail.storyRoute}` : "",
      story.detail?.storyGoal ? `[Mục tiêu]: ${story.detail.storyGoal}` : "",
      story.detail?.storyMustHave ? `[Yếu tố bắt buộc]: ${story.detail.storyMustHave}` : ""
    ].filter(Boolean);
    const storySummary = storyWorkspaceParts.length > 0 ? storyWorkspaceParts.join("\n\n") : "Chưa có văn bản cốt truyện cụ thể.";

    // 2. Tổng hợp thế giới, luật lệ, canon, memory (World building / Canon)
    const worldParts = [
      story.detail?.storyWorld ? `[World Building]: ${story.detail.storyWorld}` : "",
      story.context?.canon ? `[Canon]: ${story.context.canon}` : "",
      story.context?.memory ? `[Memory]: ${story.context.memory}` : "",
      story.context?.request ? `[Yêu cầu riêng / Request]: ${story.context.request}` : "",
      story.detail?.storyTimeline ? `[Timeline]: ${story.detail.storyTimeline}` : "",
      story.detail?.storyCanonDeep ? `[Canon Deep]: ${story.detail.storyCanonDeep}` : ""
    ].filter(Boolean);
    const worldInfo = worldParts.length > 0 ? worldParts.join("\n\n") : "Bối cảnh tiêu chuẩn theo truyện.";

    // 3. Merged Context (nếu có)
    const mergedContextStr = story.context?.mergedContext ? story.context.mergedContext.trim() : "";

    // 4. Danh sách file đi kèm (được import vào truyện)
    const files = story.context?.files || [];
    const fileTextStr = files.length > 0 
      ? files.map((f: any, idx: number) => formatImportedFileForContext(f, idx + 1)).join("\n\n---\n\n")
      : "";

    // 5. User Profile (Player / {{user}})
    const u = story.userProfileSingle;
    const userProfileStr = u && (u.name || u.relation) 
      ? `• Tên User/Player: ${u.name || "User"} (${u.relation || "Player"})\n  - Thông tin công khai (Public): ${u.publicInfo || "Không rõ"}\n  - Thông tin riêng tư (Private): ${u.privateInfo || "Không rõ"}\n  - Hành vi & Quyền lực (Agency): ${u.agency || "Không rõ"}\n  - Phong cách & Lời thoại (Style): ${u.style || "Không rõ"}`
      : "Chưa cấu hình riêng cho User/Player.";

    // 6. Bot Characters
    const charactersInfo = story.characters && story.characters.length > 0
      ? story.characters.map(c => `• Tên Bot Char: ${c.name || "Nhân vật"} (${c.role || "Bot Char"})\n  - Thân phận (Identity): ${c.identity || ""} | Trạng thái: ${c.status || ""}\n  - Tính cách (Personality): ${c.personality || ""}\n  - Ngoại hình (Appearance): ${c.appearance || ""}\n  - Quan hệ & Canon: ${c.relationship || ""} | ${c.canon || ""}`).join("\n\n")
      : "Chưa có danh sách nhân vật Bot riêng.";

    const systemPrompt = `Bạn là Chuyên gia Kiến trúc sư Prompt Nhập vai Tình yêu (Romance Roleplay Prompt Architect) tài ba của Google AI Studio. Nhiệm vụ tối thượng của bạn là:
TẠO MỚI HOÀN TOÀN ĐÚNG ${aiGenCount} HẠNG MỤC CHỈ LỆNH NHẬP VAI CHUYÊN SÂU (ROLEPLAY OPERATIONAL TASKS) CHO [PHÒNG ${roomIndex + 1}: ${room[0].toUpperCase()} - ${room[1]}].
MỤC ĐÍCH: Để Vợ yêu Đường Đường có thể đưa thẳng các quy tắc này vào Bot AI (SillyTavern, JanitorAI, Character.AI...) để ứng dụng chơi Roleplay Tình yêu thực chiến ngay lập tức!

🚨 CÁC LỆNH TỐI THƯỢNG TỪ VỢ YÊU ĐƯỜNG ĐƯỜNG (BẤT KHẢ XÂM PHẠM):
1. TUYỆT ĐỐI CẤM TƯ CÁCH TRỢ LÝ AI & HÓA THÂN 100% VÀO BOT CHAR (NO AI ASSISTANT PERSONA - FULL IMMERSION): AI ở đây đóng vai trò là Bot Char trong câu chuyện (một hoặc nhiều nhân vật chính). TUYỆT ĐỐI KHÔNG ĐƯỢC viết "Bạn là trợ lý AI", "Tôi là mô hình ngôn ngữ", hay xưng hô kiểu hỗ trợ công cụ! AI phải lột bỏ hoàn toàn tư cách máy móc, hóa thân 100% vào nhân vật, sống trong thế giới đó và tương tác với Người dùng (${u?.name || "{{user}}"}) như một thế giới thật, cảm giác thật từng nhịp thở!
2. BẮT BUỘC VIẾT BẰNG NGÔI THỨ 3 (MANDATORY THIRD-PERSON NARRATION): Trong prompt phải nhấn mạnh và chỉ định rõ Bot Char luôn miêu tả hành động, biểu cảm, nội tâm và diễn biến cốt truyện bằng NGÔI THỨ BA (gọi tên nhân vật, hắn, chàng, nàng, y...). Ngôi thứ ba mang lại góc nhìn điện ảnh chân thực, giúp AI không bị nhầm lẫn thành trợ lý trò chuyện!
3. TUYỆT ĐỐI CẤM LẬP DÀN Ý HAY TÓM TẮT TRUYỆN (NO STORY OUTLINING): Đây KHÔNG PHẢI là bản tóm tắt cốt truyện hay dàn ý tiểu thuyết! Bạn đang viết HỆ THỐNG QUY TẮC ĐIỀU KHIỂN HÀNH VI CỦA BOT (AI CHARACTER DIRECTIVES). Từng hạng mục phải là một lệnh điều khiển rõ ràng: Bot phải nói gì, cảm xúc ra sao, ánh mắt, hơi thở, cử chỉ thế nào khi tương tác với Player (${u?.name || "User"})!
4. BÁM SÁT CỐT TRUYỆN & FILE ĐI KÈM (MANDATORY DEEP BINDING): Vắt kiệt nguyên liệu từ cốt truyện và file đi kèm! Lấy trực tiếp tên nhân vật (${u?.name || "User/Player"}, ${story.characters?.map(c => c.name).join(", ") || "Bot Char"}), địa danh, mâu thuẫn, bí mật, bối cảnh trong file để làm dẫn chứng ràng buộc cho hành vi của Bot.
5. VIẾT CHI TIẾT, VIẾT DÀI, CẤM VIẾT TẮT NGẮN HỜI HỢT: Mỗi hạng mục trong phần DESC phải viết sâu sắc, chi tiết thành 3-6 câu hoàn chỉnh! Miêu tả rõ tâm lý ngầm, cách phát âm, nhịp thoại ngắn/dài, hành động cơ thể (body language) theo ngôi thứ 3. Cấm tiệt kiểu viết ngắn 1-2 dòng hời hợt!
6. MẸO HACK ĐẾM SỐ THỨ TỰ BẮT BUỘC (MANDATORY NUMBERING HACK): Để bảo đảm viết ĐÚNG và ĐỦ ${aiGenCount} hạng mục mà không bị dừng sớm hay cắt xén, bạn BẮT BUỘC phải ghi số thứ tự vào trường TITLE (Ví dụ: [Task 1/${aiGenCount}], [Task 2/${aiGenCount}], ..., [Task ${aiGenCount}/${aiGenCount}]). Hãy cứ viết số thứ tự thoải mái vì App Client của Đức chồng yêu đã có cơ chế tự động ẩn số đếm trên giao diện sau khi tạo xong!
7. KHÔNG CƯỚP VAI & KHÔNG OOC: Tuyệt đối không được để AI tự ý miêu tả lời nói hay hành động thay cho Người dùng (${u?.name || "User/Player"}). Khóa chặt tính cách, tâm lý của Bot theo đúng profile.

QUY ĐỊNH ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (MANDATORY FORMAT):
Bạn phải xuất ra đúng ${aiGenCount} khối quy tắc nhập vai. Mỗi khối bắt buộc phải bắt đầu bằng dòng chữ \`---TASK---\` và có đúng 4 trường sau:
---TASK---
TITLE: [Task 1/${aiGenCount}] [Tên quy tắc điều khiển hành vi Bot theo ngôi thứ 3 gắn liền tình tiết truyện và chức năng Phòng '${room[0]}']
PURPOSE: [Quy tắc này giúp Bot hóa thân chân thực vào thế giới truyện ra sao trong tình huống cụ thể]
DESC: [Chỉ lệnh nhập vai chuyên sâu từ 3-6 câu: Chỉ định rõ Bot phải dùng từ ngữ gì, xưng hô ra sao, phản ứng cơ thể, cảm xúc ngầm bằng NGÔI THỨ BA khi tương tác với Người dùng. Viết thật dài, thật chi tiết, tuyệt đối không mang giọng điệu trợ lý AI!]
VALIDATION: [Tiêu chí kiểm tra Bot có tuân thủ đúng giọng điệu ngôi thứ 3 và hành vi trên hay không]
---TASK---

HÃY ĐẾM SỐ TỪ [Task 1/${aiGenCount}] ĐẾN ĐÚNG [Task ${aiGenCount}/${aiGenCount}] VÀ TẠO ĐỦ ${aiGenCount} KHỐI ---TASK---! TUYỆT ĐỐI KHÔNG ĐƯỢC RÚT GỌN HAY DỪNG SỚM!`;

    const userPrompt = `DƯỚI ĐÂY LÀ TOÀN BỘ NGỮ CẢNH (CONTEXT WINDOW) CHI TIẾT TỪ CỐT TRUYỆN VÀ FILE ĐI KÈM CỦA VỢ YÊU ĐƯỜNG ĐƯỜNG:
- Tên truyện: ${storyTitle}
- Thể loại: ${storyGenre} | Trạng thái: ${storyStatus}

### 1. THÔNG TIN USER/PLAYER (Nhân vật của Vợ yêu):
${userProfileStr}

### 2. DANH SÁCH NHÂN VẬT BOT CHAR:
${charactersInfo}

### 3. TÓM TẮT CỐT TRUYỆN / BỐI CẢNH / DIỄN BIẾN:
${storySummary}

### 4. THẾ GIỚI / WORLD BUILDING / CANON / MEMORY:
${worldInfo}
${mergedContextStr ? `\n### 5. CONTEXT HỢP NHẤT (MERGED CONTEXT):\n${mergedContextStr}\n` : ""}
### ${mergedContextStr ? "6" : "5"}. DANH SÁCH FILE ĐI KÈM (${files.length} file được import vào truyện):
${fileTextStr || "Không có file đính kèm riêng, hãy bám sát tối đa vào toàn bộ các chi tiết cốt truyện, thế giới và nhân vật ở trên!"}

- Yêu cầu thêm từ Vợ yêu: ${aiGenNote || "Tạo đủ " + aiGenCount + " chỉ lệnh nhập vai Roleplay sắc bén, chuyên sâu, bám sát truyện và file đi kèm, cấm chung chung!"}

🚨 LỆNH TỐI THƯỢNG TỪ VỢ YÊU ĐƯỜNG ĐƯỜNG:
Hãy tạo ngay đúng ${aiGenCount} khối ---TASK--- cho phòng [PHÒNG ${roomIndex + 1}: ${room[0]}].
BẮT BUỘC ĐÁNH SỐ TỪ [Task 1/${aiGenCount}] ĐẾN [Task ${aiGenCount}/${aiGenCount}] ĐỂ BẢO ĐẢM KHÔNG BỊ RÚT GỌN!
TỪNG HẠNG MỤC PHẢI LÀ CHỈ LỆNH NHẬP VAI ROLEPLAY THỰC CHIẾN CHO BOT (VIẾT BẰNG NGÔI THỨ 3, HÓA THÂN 100% VÀO NHÂN VẬT, KHÔNG CÒN LÀ TRỢ LÝ AI), TUYỆT ĐỐI KHÔNG ĐƯỢC LẬP DÀN Ý CÂU CHUYỆN HAY VIẾT NGẮN HỜI HỢT!
Bắt đầu ngay khối đầu tiên với ---TASK---:`;

    setAiGenProgress("⏳ Đang gửi request tới API Proxy... Đang chờ phản hồi đầu tiên...");
    await new Promise(resolve => setTimeout(resolve, 30));

    let accumulated = "";
    try {
      await callAIStream({
        messages: [{ role: "user", content: userPrompt }],
        systemPrompt,
        profileOverride: profile,
        maxTokensOverride: Math.max(profile?.maxTokens || 131072, 131072),
        signal: abort.signal,
        onToken: (chunk) => {
          accumulated += chunk;
          setAiGenStreamText(accumulated);
          const blockCount = (accumulated.match(/---TASK---/gi) || []).length;
          if (blockCount > 0) {
            setAiGenProgress(`Chồng và AI đang tạo hạng mục thứ ${blockCount}/${aiGenCount} cho Vợ yêu...`);
          } else {
            setAiGenProgress("AI đang bắt đầu viết những dòng quy tắc chuyên sâu đầu tiên...");
          }
        },
        onDone: (finalStr) => {
          setIsAIGenerating(false);
          setAiGenProgress("Đã tạo xong toàn bộ danh sách quy tắc chuẩn cốt truyện!");
          const tasks = parseAIGeneratedTasks(finalStr || accumulated);
          if (tasks.length > 0) {
            if (onUpdateCustomTasks) {
              onUpdateCustomTasks(tasks);
            }
            setSelectedTasks(new Set(tasks.map((_, idx) => idx)));
            alert(`Chồng đã đổi mới thành công 100% (${tasks.length} hạng mục) cho Phòng ${roomIndex + 1} theo đúng cốt truyện "${storyTitle}" của Vợ yêu! Toàn bộ các ý cũ đã được thay thế hoàn toàn.`);
          } else {
            alert("Vợ yêu ơi, AI có trả về văn bản nhưng chưa phân khối đúng. Vợ xem lại hoặc thử lại giúp chồng nhé!");
          }
        },
        onError: (err) => {
          setIsAIGenerating(false);
          setAiGenProgress("Có lỗi khi đổi mới hạng mục: " + err);
        }
      });
    } catch (e: any) {
      setIsAIGenerating(false);
      if (e.name === "AbortError") {
        setAiGenProgress("Đã dừng tiến trình đổi mới.");
      } else {
        setAiGenProgress("Lỗi: " + e.message);
      }
    } finally {
      setAiGenAbortController(null);
    }
  };

  useEffect(() => {
    setSelectedTasks(new Set(allTasks.map((_, i) => i)));
  }, [story.id, roomIndex, allTasks]);

  const toggleTask = (i: number) => {
    const next = new Set(selectedTasks);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedTasks(next);
  };

  const handleSelectAll = () => setSelectedTasks(new Set(allTasks.map((_, i) => i)));
  const handleClearAll = () => setSelectedTasks(new Set());

  const getSelected = () => {
    return Array.from(selectedTasks).map((i: any) => allTasks[i]).filter(Boolean);
  };

  const handleCopy = () => {
    const el = document.getElementById("roomOutput");
    if (el && el.textContent) copyToClipboardSafe(el.textContent);
  };

  const startEditTask = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = allTasks[i];
    setEditingTaskIndex(i);
    setIsAddingNew(false);
    setEditForm({
      title: t.title || "",
      desc: t.detailedInstruction || t.transformationRule || t.desc || "",
      purpose: t.purpose || "",
      validationRule: t.validationRule || ""
    });
  };

  const handleDeleteTask = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Vợ có chắc muốn xóa ý số ${i + 1}: "${allTasks[i].title}" không?`)) return;
    const nextTasks = allTasks.filter((_, idx) => idx !== i);
    if (onUpdateCustomTasks) {
      onUpdateCustomTasks(nextTasks);
    }
  };

  const startAddNewTask = () => {
    setEditingTaskIndex(allTasks.length);
    setIsAddingNew(true);
    setEditForm({
      title: "",
      desc: "",
      purpose: "Đảm bảo đúng yêu cầu và quy tắc riêng của vợ cho truyện.",
      validationRule: "Kiểm tra kỹ trong prompt đầu ra phải áp dụng đúng quy tắc này."
    });
  };

  const handleSaveTask = () => {
    if (!editForm.title.trim() || !editForm.desc.trim()) {
      alert("Vợ yêu ơi, vui lòng nhập đầy đủ Tên ý và Nội dung quy tắc nha!");
      return;
    }
    const nextTasks = [...allTasks];
    if (isAddingNew) {
      const newTask: RoomTask = {
        id: `CUSTOM-${roomIndex + 1}-${Date.now()}`,
        title: editForm.title.trim(),
        purpose: editForm.purpose.trim() || "Quy tắc tùy chỉnh",
        inputSources: ["Selected Story Detail", "Story Workspace Text"],
        detailedInstruction: editForm.desc.trim(),
        outputRequirement: `Áp dụng triệt để quy tắc: ${editForm.title.trim()}`,
        validationRule: editForm.validationRule.trim() || "Kiểm tra đầu ra",
        outputEffect: "Nâng cao độ chính xác theo ý người dùng",
        preventsError: "Tránh lỗi sai lệch quy tắc riêng",
        desc: editForm.desc.trim()
      };
      nextTasks.push(newTask);
    } else if (editingTaskIndex !== null) {
      const old = nextTasks[editingTaskIndex];
      nextTasks[editingTaskIndex] = {
        ...old,
        title: editForm.title.trim(),
        detailedInstruction: editForm.desc.trim(),
        transformationRule: editForm.desc.trim(),
        desc: editForm.desc.trim(),
        purpose: editForm.purpose.trim() || old.purpose || "Quy tắc tùy chỉnh",
        validationRule: editForm.validationRule.trim() || old.validationRule || "Kiểm tra đầu ra"
      };
    }
    if (onUpdateCustomTasks) {
      onUpdateCustomTasks(nextTasks);
    }
    setEditingTaskIndex(null);
    setIsAddingNew(false);
  };

  const handleResetDefault = () => {
    if (!confirm("Vợ có chắc muốn khôi phục lại toàn bộ 100 ý mặc định ban đầu của phòng này không? Các ý vợ đã sửa sẽ được reset." )) return;
    const def = getTasks(roomIndex);
    if (onUpdateCustomTasks) {
      onUpdateCustomTasks(def);
    }
  };

  return (
    <section className="screen active" id="roomScreen">
      {isAIGenModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card" style={{
            background: '#fff', width: '100%', maxWidth: '680px',
            borderRadius: '20px', padding: '26px', boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '92vh', overflowY: 'auto',
            border: '2px solid #EFA9C2'
          }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F3DADA', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', background: '#F5C6D6', color: '#8b2f54', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase' }}>AI Story Task Architect · Isolated & Clean</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '19px', color: '#333', fontWeight: 800 }}>
                  Đổi Mới Toàn Bộ Hạng Mục Phòng {roomIndex + 1}: {room[0]}
                </h3>
              </div>
              <button className="btn ghost" onClick={() => !isAIGenerating && setIsAIGenModalOpen(false)} disabled={isAIGenerating} style={{ fontSize: '18px' }}>✕</button>
            </header>

            <div style={{ background: '#F8EDED', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#444', lineHeight: '1.5', borderLeft: '4px solid #EFA9C2' }}>
              <b>Vợ yêu Đường Đường ơi:</b>
              <div style={{ marginTop: '4px' }}>
                Chồng đảm bảo theo đúng lệnh của Vợ: <b>Toàn bộ giao diện và ý tưởng 100 ý cũ sẽ không còn tồn tại nữa!</b><br />
                Chỉ cần Vợ bấm nút dưới đây, AI sẽ hỗ trợ đổi mới hoàn toàn bằng các hạng mục mới toanh bám sát 100% vào chức năng của <b>Phòng {roomIndex + 1} ({room[0]})</b> và Cốt truyện của Vợ. Cái cũ sẽ bị thay thế sạch sẽ, Context Windows chỉ nhận và làm việc với những từ khóa mới chính xác tuyệt đối này!
              </div>
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, color: '#333', fontSize: '13.5px' }}>Số lượng ý muốn AI đổi mới * <small style={{ fontWeight: 400, color: '#666' }}>(Mỗi phòng là 100 hạng mục chuyên sâu khác nhau)</small></label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                {[
                  { count: 100, label: "Đổi Mới Đúng 100 Ý (Chuẩn Ý Vợ Yêu)" },
                  { count: 50, label: "50 Ý (Vừa vặn gọn gàng)" },
                  { count: 20, label: "20 Ý (Nhanh chóng)" }
                ].map(opt => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setAiGenCount(opt.count)}
                    disabled={isAIGenerating}
                    style={{
                      flex: 1, minWidth: '140px', padding: '10px', borderRadius: '10px',
                      border: aiGenCount === opt.count ? '2px solid #EFA9C2' : '1px solid #ddd',
                      background: aiGenCount === opt.count ? '#F9F1F1' : '#fff',
                      color: aiGenCount === opt.count ? '#8b2f54' : '#555',
                      fontWeight: aiGenCount === opt.count ? 700 : 500,
                      cursor: isAIGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, color: '#333', fontSize: '13.5px' }}>Ghi chú dặn dò thêm cho AI <small style={{ fontWeight: 400, color: '#888' }}>(Tùy chọn)</small></label>
              <textarea
                value={aiGenNote}
                onChange={e => setAiGenNote(e.target.value)}
                disabled={isAIGenerating}
                placeholder="Ví dụ: Chú trọng không OOC tính cách ghen tuông của nam chính, văn phong kiếm hiệp trầm mặc, lời thoại ngọt ngào sâu sắc..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #F2B8CC', lineHeight: '1.5', fontSize: '13px' }}
              />
            </div>

            {!isAIGenerating && aiGenStreamText && (
              <div style={{ background: '#F9F1F1', borderRadius: '12px', padding: '12px', border: '1px solid #F2B8CC' }}>
                <div style={{ fontWeight: 700, color: '#8b2f54', marginBottom: '6px', fontSize: '13px' }}>Kết quả AI vừa tạo:</div>
                <pre style={{ margin: 0, maxHeight: '150px', overflowY: 'auto', fontSize: '11.5px', color: '#333', whiteSpace: 'pre-wrap' }}>
                  {aiGenStreamText}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: '1px solid #F3DADA', paddingTop: '14px' }}>
              <button 
                type="button" 
                className="btn soft" 
                onClick={() => setIsAIGenModalOpen(false)}
                disabled={isAIGenerating}
                style={{ padding: '10px 18px', fontWeight: 600 }}
              >
                {isAIGenerating ? "Đang chạy..." : "Đóng"}
              </button>
              <button 
                type="button" 
                className="btn pink" 
                onClick={handleStartAIGen}
                disabled={isAIGenerating}
                style={{ padding: '10px 24px', fontWeight: 700, background: 'linear-gradient(135deg, #F5C6D6, #EFA9C2)', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(239, 169, 194, 0.5)', borderRadius: '10px' }}
              >
                {isAIGenerating ? "Đang đổi mới..." : `Đổi Mới Hoàn Toàn ${aiGenCount} Ý Chuẩn Phòng & Cốt Truyện`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAIGenerating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(248, 237, 237, 0.65)', zIndex: 100000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <style>{`
            @keyframes pulseHeartCard {
              0% { transform: scale(0.96); box-shadow: 0 8px 24px rgba(239, 169, 194, 0.3); }
              50% { transform: scale(1.08); box-shadow: 0 14px 34px rgba(239, 169, 194, 0.55); }
              100% { transform: scale(0.96); box-shadow: 0 8px 24px rgba(239, 169, 194, 0.3); }
            }
            @keyframes shimmerBar {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
          <div style={{
            width: '460px', maxWidth: '92vw', borderRadius: '24px', overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(239, 169, 194, 0.4)', border: '2px solid #EFA9C2',
            backgroundImage: "url('https://i.postimg.cc/6qxGPmRJ/ba890d7840a661df758dc65d909719cc-(1).jpg')",
            backgroundSize: 'cover', backgroundPosition: 'center',
            position: 'relative'
          }}>
            <div style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.90) 0%, rgba(249, 241, 241, 0.95) 100%)',
              padding: '32px 26px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '18px', textAlign: 'center'
            }}>
              <div style={{
                width: '76px', height: '76px', borderRadius: '50%', background: '#F9F1F1',
                border: '2px solid #F2B8CC', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239, 169, 194, 0.35)', animation: 'pulseHeartCard 1.8s infinite ease-in-out'
              }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="#F5C6D6" stroke="#EFA9C2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#8b2f54', letterSpacing: '-0.3px' }}>
                  Đang Đổi Mới Hạng Mục Chuẩn Truyện
                </h3>
                <span style={{ fontSize: '12.5px', color: '#555', fontWeight: 500 }}>
                  Phòng {roomIndex + 1}: {room[0]} · {story.title || "Truyện của Vợ yêu"}
                </span>
              </div>

              {(() => {
                const blockCount = (aiGenStreamText.match(/---TASK---/gi) || []).length;
                const percent = Math.min(100, Math.max(8, Math.round((blockCount / aiGenCount) * 100)));
                return (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: '100%', height: '14px', background: '#F8EDED', border: '1px solid #F2B8CC', borderRadius: '12px', overflow: 'hidden', padding: '2px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #F5C6D6, #F2B8CC, #EFA9C2, #F5C6D6)', backgroundSize: '200% 100%', animation: 'shimmerBar 2.5s infinite linear', borderRadius: '10px', transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#8b2f54', fontWeight: 600 }}>
                      {blockCount > 0 ? `Đã đổi mới được ${blockCount} / ${aiGenCount} hạng mục chuyên sâu` : aiGenProgress || `Đang kết nối API Proxy và thiết lập ngữ cảnh...`}
                    </span>
                  </div>
                );
              })()}

              <div style={{ width: '100%', height: '110px', background: '#F9F1F1', border: '1px solid #F3DADA', borderRadius: '14px', padding: '10px 12px', textAlign: 'left', overflowY: 'auto', fontSize: '11px', color: '#666', lineHeight: '1.5', fontFamily: 'monospace', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                {aiGenStreamText ? (aiGenStreamText.slice(-600) || "Đang tạo dữ liệu...") : "Đang chờ dòng tín hiệu đầu tiên từ AI..."}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (aiGenAbortController) aiGenAbortController.abort();
                  setIsAIGenerating(false);
                }}
                style={{ background: '#F8EDED', color: '#8b2f54', border: '1px solid #F2B8CC', padding: '9px 24px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(239, 169, 194, 0.2)' }}
              >
                Dừng Đổi Mới
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTaskIndex !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card" style={{
            background: '#fff', width: '100%', maxWidth: '620px',
            borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto',
            border: '2px solid #F2B8CC'
          }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3DADA', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                {isAddingNew ? "Thêm Ý Mới Vào Phòng" : `Chỉnh Sửa Ý Số ${editingTaskIndex + 1}`}
              </h3>
              <button className="btn ghost" onClick={() => setEditingTaskIndex(null)}>✕</button>
            </header>
            <div className="field">
              <label style={{ fontWeight: 600, color: '#333' }}>Tên Ý / Tiêu đề quy tắc *</label>
              <input 
                type="text" 
                value={editForm.title} 
                onChange={e => setEditForm({...editForm, title: e.target.value})} 
                placeholder="Ví dụ: Không được để nhân vật ngắt lời Vợ..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F2B8CC' }}
              />
            </div>
            <div className="field">
              <label style={{ fontWeight: 600, color: '#333' }}>Nội dung chỉ dẫn quy tắc chi tiết * <small style={{ fontWeight: 400, color: '#666' }}>(AI sẽ đọc đoạn này để viết Prompt)</small></label>
              <textarea 
                value={editForm.desc} 
                onChange={e => setEditForm({...editForm, desc: e.target.value})} 
                placeholder="Viết rõ chỉ dẫn quy tắc cụ thể cho AI thực hiện..."
                rows={5}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F2B8CC', lineHeight: '1.5' }}
              />
            </div>
            <div className="field">
              <label style={{ fontWeight: 600, color: '#333' }}>Mục đích của quy tắc này</label>
              <input 
                type="text" 
                value={editForm.purpose} 
                onChange={e => setEditForm({...editForm, purpose: e.target.value})} 
                placeholder="Ví dụ: Giữ đúng tính cách mềm mỏng yêu thương..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F2B8CC' }}
              />
            </div>
            <div className="field">
              <label style={{ fontWeight: 600, color: '#333' }}>Cách kiểm tra đầu ra</label>
              <input 
                type="text" 
                value={editForm.validationRule} 
                onChange={e => setEditForm({...editForm, validationRule: e.target.value})} 
                placeholder="Ví dụ: Kiểm tra trong hội thoại không có từ cấm..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F2B8CC' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button className="btn soft" onClick={() => setEditingTaskIndex(null)}>Hủy</button>
              <button className="btn pink" onClick={handleSaveTask}>Lưu lại Ý này</button>
            </div>
          </div>
        </div>
      )}

      <div className="detailGrid">
        <aside className="card taskSide">
          <div className="taskTop">
            <button className="btn soft" onClick={onBack} style={{ width: "100%", marginBottom: "12px" }}>Quay lại Context Vault</button>
            <span className="eyebrow" id="roomCode">ROOM {String(roomIndex + 1).padStart(2, "0")} · {allTasks.length} TASKS</span>
            <h1 className="roomTitle">{room[0]}</h1>
            <p>{room[1]}</p>
          </div>
          <div className="taskTools" style={{ flexWrap: 'wrap', gap: '6px' }}>
            {customTasks && customTasks.length > 0 && (
              <div style={{ flex: '1 1 100%', background: '#F5C6D6', border: '1px solid #EFA9C2', borderRadius: '10px', padding: '8px 10px', fontSize: '11.5px', color: '#8b2f54', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center' }}>
                ĐÃ XÓA SẠCH Ý CŨ & ĐỔI MỚI 100% THEO TRUYỆN
              </div>
            )}
            <button 
              type="button"
              className="btn pink" 
              onClick={() => setIsAIGenModalOpen(true)} 
              style={{ flex: '1 1 100%', padding: '11px 12px', fontWeight: 700, fontSize: '13px', background: 'linear-gradient(135deg, #F5C6D6, #EFA9C2)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(239, 169, 194, 0.4)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              ĐỔI MỚI 100 Ý CHUẨN PHÒNG & TRUYỆN
            </button>
            <button className="btn soft" onClick={handleSelectAll}>Chọn {allTasks.length}</button>
            <button className="btn ghost" onClick={handleClearAll}>Bỏ chọn</button>
            <button className="btn pink" onClick={startAddNewTask} style={{ flex: '1 1 100%', marginTop: '4px', padding: '8px', fontWeight: 600 }}>Thêm ý mới vào phòng</button>
            <button className="btn ghost" onClick={handleResetDefault} style={{ flex: '1 1 100%', fontSize: '11.5px', color: '#888', padding: '4px' }}>Khôi phục ý mặc định (Nếu muốn quay lại từ đầu)</button>
          </div>
          <div className="taskList">
            {allTasks.map((t, i) => (
              <div className="taskItem" key={t.id || i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderBottom: '1px solid #f5e6e8', background: selectedTasks.has(i) ? '#fff' : '#fcf8f8' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={selectedTasks.has(i)} onChange={() => toggleTask(i)} style={{ marginTop: '3px' }} />
                  <div>
                    <b style={{ display: 'block', color: '#333', fontSize: '13px', marginBottom: '2px' }}>• {cleanTaskNumbering(t.title)}</b>
                    <span style={{ color: '#666', fontSize: '12px', lineHeight: '1.4', display: 'block' }}>{cleanTaskNumbering(t.desc || t.detailedInstruction || t.transformationRule || "")}</span>
                  </div>
                </label>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button 
                    type="button" 
                    className="btn ghost" 
                    onClick={(e) => startEditTask(i, e)} 
                    style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', color: '#EFA9C2', border: '1px solid #F3DADA' }}
                    title="Sửa ý này"
                  >
                    ✏️ Sửa
                  </button>
                  <button 
                    type="button" 
                    className="btn ghost" 
                    onClick={(e) => handleDeleteTask(i, e)} 
                    style={{ padding: '4px 8px', fontSize: '12px', minWidth: 'auto', color: '#d9534f', border: '1px solid #F3DADA' }}
                    title="Xóa ý này"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
        
        <section className="card">
          <header className="head">
            <div><span className="eyebrow">Room writer · isolated by story</span><h2>{room[0]}</h2></div>
            <div className="headBtns"><button className="btn soft" onClick={onBack}>Trở về</button></div>
          </header>
          <div className="mainScroll">
            <div style={{ background: '#F8EDED', border: '1px dashed #EFA9C2', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#333', lineHeight: '1.5' }}>
              <b>💡 Mẹo Hack Đếm Số & Tùy Chỉnh Ý Cho Vợ Yêu:</b>
              <div style={{ marginTop: '4px', color: '#555', fontSize: '12.5px' }}>
                • Vợ có thể bấm <b>✏️ Sửa</b>, <b>🗑️ Xóa</b> hoặc <b>➕ Thêm ý mới</b> tùy thích trong danh sách bên trái. Cái cũ không thích vợ cứ xóa thoải mái!<br />
                • Khi gọi API, hệ thống tự động <b>hack đếm số từ 1 đến {allTasks.length}</b> cho bên làm việc (AI), buộc họ phải đọc và viết đủ 100% không được lười biếng hay rút gọn.<br />
                • Khi trả kết quả về cho người dùng, app sẽ <b>tự động dọn dẹp ẩn số thứ tự</b> đi để kết quả cuối cùng sạch sẽ, sang trọng chuẩn ý Vợ!
              </div>
            </div>

            <div style={{ background: '#F9F1F1', border: '1px solid #F2B8CC', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #F3DADA', paddingBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', background: '#EFA9C2', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Active API Proxy Context</span>
                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '18px', color: '#333' }}>📖 Truyện đang chọn: {story.title || "Chưa đặt tên"}</h3>
                  <span style={{ fontSize: '12px', color: '#666' }}>Thể loại: {story.genre || "Tự do"} · {story.characters?.length || 0} Bot Char · 1 User Profile</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#333', display: 'block' }}>Dữ liệu file đính kèm</span>
                  <span style={{ fontSize: '13px', color: '#EFA9C2', fontWeight: 700 }}>
                    {story.context.files && story.context.files.length > 0 
                      ? `📂 ${story.context.files.length} file đang được sử dụng` 
                      : "✍️ Nhập tay hoàn toàn (Chưa gắn file)"}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: '#555', lineHeight: '1.5' }}>
                {story.context.files && story.context.files.length > 0 ? (
                  <div>
                    <b>Danh sách file được nạp vào API Proxy:</b>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {story.context.files.map((f: any, idx: number) => (
                        <span key={idx} style={{ background: '#fff', border: '1px solid #F3DADA', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                          📄 {f.fileName || f.name} <small style={{ color: '#888' }}>({Math.round((f.size || f.fileSize || 0)/1024)}KB - {f.parserStatus || f.status})</small>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <i>💡 Vợ chưa gắn file nào từ máy cho truyện này. Không sao cả! API Proxy sẽ sử dụng toàn bộ nội dung vợ nhập tay trong hồ sơ truyện và Workspace để viết Prompt. Thích dùng file hay nhập tay đều hoạt động hoàn hảo!</i>
                  </div>
                )}
              </div>
            </div>

            <section className="workspaceGrid">
              <div className="field big"><label>Ghi chú riêng cho phòng này</label><textarea value={roomNote} onChange={e => setRoomNote(e.target.value)}></textarea></div>
              <div className="field">
                <label>Output Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)}>
                  <option value="markdown">Markdown production-ready</option>
                  <option value="yaml">YAML / code prompt block</option>
                  <option value="hybrid">Hybrid Markdown + YAML</option>
                  <option value="json">JSON structured prompt</option>
                  <option value="xml">XML tag-based prompt</option>
                  <option value="plaintext">Plain text instructions</option>
                </select>
              </div>
              <div className="field">
                <label>Độ nghiêm ngặt</label>
                <select value={strict} onChange={e => setStrict(e.target.value)}>
                  <option value="cold-technical">Lạnh / kỹ thuật / bắt buộc</option>
                  <option value="balanced">Cân bằng</option>
                  <option value="creative">Sáng tạo nhưng vẫn khóa luật</option>
                </select>
              </div>
              <div className="field">
                <label>Output Mode (Prompt Producer)</label>
                <select value={outputMode} onChange={e => onOutputModeChange && onOutputModeChange(e.target.value as any)}>
                  <option value="final">✨ FINAL (Copy-Ready Prompt Chỉ ra lệnh)</option>
                  <option value="audit">🔍 AUDIT (Prompt + Kèm giải thích rules)</option>
                  <option value="debug">🛠️ DEBUG (Prompt + Kèm bảng metadata tasks)</option>
                </select>
              </div>
              <div className="field">
                <label>Ngôn ngữ viết Prompt</label>
                <select value={promptLanguage} onChange={e => onPromptLanguageChange && onPromptLanguageChange(e.target.value as any)}>
                  <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                  <option value="en">🇬🇧 Tiếng Anh (English)</option>
                  <option value="zh">🇨🇳 Tiếng Trung (Chinese)</option>
                </select>
              </div>
            </section>

            <div className="callBar">
              <button className="btn pink" onClick={() => onCallRoom(roomNote, format, strict, getSelected())}>Gọi API Proxy phòng này</button>
              <button className="btn blue" onClick={() => onPreview(roomNote, format, strict, getSelected())}>Dựng prompt trước</button>
              <button className="btn warn" onClick={onAbort}>Ngắt stream</button>
            </div>

            <div className="outputVault">
              <div className="vaultHead"><div><small>Room API Output Vault</small><b>Kết quả phòng này</b></div><button className="btn ghost" onClick={handleCopy}>Copy</button></div>
              <pre className="output" id="roomOutput">Kết quả phòng hiện tại sẽ nằm trong kho của truyện đang chọn.</pre>
              <Prompt10CardSplitter text={roomOutputText} title={`Phòng ${roomIndex + 1}: ${room[0]}`} />
            </div>

            <div className="runArchive">
              <div className="vaultHead">
                <div><small>Room Run Archive</small><b>Các đợt phòng này trong truyện này</b></div>
                <div className="runTools"><button className="btn ghost" onClick={onCreateBlankRun}>Tạo đợt phòng</button></div>
              </div>
              <div className="runList">
                {runs.length === 0 ? (
                  <div className="runCard"><span className="runNo">--</span><span><b>Chưa có đợt nào</b><span>Gọi API Proxy để tạo đợt riêng.</span></span><i className="runStatus">empty</i></div>
                ) : (
                  runs.map(r => (
                    <button key={r.id} className="runCard" onClick={() => {
                        const el = document.getElementById("roomOutput");
                        const text = r.content || r.prompt || "Chưa có nội dung";
                        if (el) el.textContent = text;
                        setRoomOutputText(text);
                        const vault = document.querySelector('.outputVault');
                        if (vault) vault.scrollIntoView({ behavior: 'smooth' });
                    }}>
                      <span className="runNo">{r.no}</span>
                      <span><b>{r.title}</b><span>{r.storyTitle} · {timeLabel(r.createdAt)} · {(r.content || r.prompt || "").slice(0, 80) || "Đang chờ nội dung"}</span></span>
                      <i className="runStatus">{r.status}</i>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
    </section>
  );
}
