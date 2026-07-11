import React, { useState, useEffect, useRef } from "react";
import { Story, dbGetAllStories, dbPutStory, dbDeleteStory, createNewStory, emptyContext, emptyUserProfile, emptyDetail } from "../../lib/prompt-context-db";
import { Run, dbGetRunsByStory, dbPutRun, dbClearRunsByStory } from "../../lib/prompt-run-db";
import { processImportedFiles, formatImportedFileForContext } from "../../lib/file-importer";
import { rooms, getTasks, getRoomCatalog, getAllRoomCatalogs, validateRoomCatalog, RoomCatalog, RoomTask } from "../../lib/prompt-rooms";
import { callAIStream, getActiveApiProfile, ApiProfile } from "../../lib/api-client";
import PromptMarkdownRoomScreen from "./PromptMarkdownRoomScreen";
import LibraryView from "./LibraryView";
import StudioView from "./StudioView";
import "./prompt-studio.css";

type Props = {
  active: boolean;
  onHome: () => void;
};

export default function PromptMarkdownSmartContextScreen({ active, onHome }: Props) {
  const [view, setView] = useState<"library" | "studio" | "room">("library");
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<number>(0);
  const [contextMode, setContextMode] = useState<"full" | "compress" | "queue" | "preview" | "chunk">("full");
  const [outputMode, setOutputMode] = useState<"final" | "audit" | "debug">("final");
  const [promptLanguage, setPromptLanguage] = useState<"vi" | "en" | "zh">("vi");
  const [toastMsg, setToastMsg] = useState("");
  const [apiProfile, setApiProfile] = useState<ApiProfile | null>(null);

  const [runs, setRuns] = useState<Run[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const [time, setTime] = useState("00:00");
  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (e) {}
  }, [view, currentRoom]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    let b: any = null;
    const update = () => { if (b) setBatteryLevel(Math.round(b.level * 100)); };
    (async () => {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          b = await nav.getBattery();
          update();
          b.onlevelchange = update;
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    loadStories();
    checkApi();
  }, []);

  useEffect(() => {
    if (activeStoryId) {
      localStorage.setItem("pmsl_active_story", activeStoryId);
      loadRuns(activeStoryId);
    }
  }, [activeStoryId]);

  const loadStories = async () => {
    let all = await dbGetAllStories();
    if (all.length === 0) {
      const s = createNewStory("Câu chuyện đầu tiên");
      await dbPutStory(s);
      all = [s];
    }
    all.sort((a, b) => b.createdAt - a.createdAt);
    setStories(all);
    if (!activeStoryId) {
      const saved = localStorage.getItem("pmsl_active_story");
      setActiveStoryId(saved || all[0].id);
    }
  };

  const loadRuns = async (storyId: string) => {
    const r = await dbGetRunsByStory(storyId);
    setRuns(r);
  };

  const checkApi = async () => {
    try {
      const p = await getActiveApiProfile();
      setApiProfile(p);
    } catch (e) {
      setApiProfile(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2600);
  };

  const activeStory = stories.find(s => s.id === activeStoryId) || stories[0];

  const handleUpdateStory = async (updated: Story) => {
    updated.updatedAt = Date.now();
    await dbPutStory(updated);
    setStories(stories.map(s => s.id === updated.id ? updated : s));
  };

  const handleCreateStory = async () => {
    const s = createNewStory("Câu chuyện " + (stories.length + 1));
    await dbPutStory(s);
    setStories([s, ...stories]);
    setActiveStoryId(s.id);
    showToast("Đã tạo câu chuyện mới riêng biệt.");
  };

  const handleDuplicateStory = async () => {
    if (!activeStory) return;
    const c = JSON.parse(JSON.stringify(activeStory)) as Story;
    c.id = "story_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    c.title = (activeStory.title || "Truyện") + " - bản sao";
    c.createdAt = Date.now();
    c.updatedAt = Date.now();
    await dbPutStory(c);
    setStories([c, ...stories]);
    setActiveStoryId(c.id);
    showToast("Đã nhân bản truyện thành kho riêng.");
  };

  const handleDeleteStory = async () => {
    if (stories.length <= 1) {
      showToast("Cần giữ ít nhất một câu chuyện.");
      return;
    }
    if (confirm("Xóa truyện đang chọn và toàn bộ dữ liệu riêng của truyện này?")) {
      await dbDeleteStory(activeStoryId!);
      await dbClearRunsByStory(activeStoryId!);
      const newStories = stories.filter(s => s.id !== activeStoryId);
      setStories(newStories);
      setActiveStoryId(newStories[0].id);
      showToast("Đã xóa truyện.");
    }
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { compressImageFile } = await import("../../utils/imageCompressor");
      const res = await compressImageFile(f, 1024, 1024, 0.82);
      localStorage.setItem("pmsl_wallpaper", res);
      window.dispatchEvent(new Event("storage"));
      showToast("Đã bật hình nền.");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi đặt hình nền (ảnh quá lớn hoặc không hợp lệ).");
    } finally {
      e.target.value = "";
    }
  };

  const [wallpaper, setWallpaper] = useState(localStorage.getItem("pmsl_wallpaper") || "");
  useEffect(() => {
    const updateWall = () => setWallpaper(localStorage.getItem("pmsl_wallpaper") || "");
    window.addEventListener("storage", updateWall);
    return () => window.removeEventListener("storage", updateWall);
  }, []);

  const [homeOutput, setHomeOutput] = useState("Kết quả API Proxy của truyện đang chọn sẽ stream về đây.");

  const mergeContext = (s: Story = activeStory) => {
    const c = s.context;
    const d = s.detail || emptyDetail();
    const u = s.userProfileSingle || emptyUserProfile();
    
    const chars = (s.characters || []).map((char, i) => `
### CHARACTER ${i + 1}: ${char.name || "Chưa đặt tên"}
Role: ${char.role || ""}
Identity: ${char.identity || ""}
Status: ${char.status || ""}
Appearance:
${char.appearance || ""}

Personality / Psychology:
${char.personality || ""}

Relationship:
${char.relationship || ""}

Voice DNA:
${char.voiceDNA || ""}

Canon Lock:
${char.canon || ""}`).join("\\n\\n");

    const botCount = (s.characters || []).length;
    const botIndex = (s.characters || []).map((char, i) => `
${i + 1}. ${char.name || "Chưa đặt tên"}
- Profile Group: BOT_CHAR
- Role: ${char.role || ""}
- Identity: ${char.identity || ""}
- Status: ${char.status || ""}`).join("\n");

    const fileText = (c.files || []).map((f: any, idx: number) => formatImportedFileForContext(f, idx + 1)).join("\n\n---\n\n");

    const hasManualStory = !!(c.story && c.story.trim());
    const parsedFiles = (c.files || []).filter((f: any) => (f.parsedText || f.content || "").trim().length > 0);
    const hasParsedFile = parsedFiles.length > 0;

    let storySourceText = "Missing";
    let storyWorkspaceContent = "[Story Workspace trống — Thiếu nội dung câu chuyện]";
    if (hasManualStory) {
      storySourceText = "Manually typed Story Workspace";
      storyWorkspaceContent = c.story!.trim();
    } else if (hasParsedFile) {
      storySourceText = "Imported parsed file";
      storyWorkspaceContent = parsedFiles.map((f: any) => `[Nội dung từ file ${f.fileName || f.name}]:\n${f.parsedText || f.content}`).join("\n\n---\n\n");
    } else if ((c.files || []).some((f: any) => (f.extractedSummary || f.summary || "").trim().length > 0)) {
      storySourceText = "Extracted file summary";
      storyWorkspaceContent = (c.files || []).map((f: any) => `[Tóm tắt từ file ${f.fileName || f.name}]:\n${f.extractedSummary || f.summary}`).join("\n\n");
    } else if (c.memory && c.memory.trim()) {
      storySourceText = "Memory / Canon fields";
      storyWorkspaceContent = `[Từ Memory / Canon]:\n${c.memory}`;
    }

    const merged = `# STORY-SCOPED CONTEXT VAULT
Story ID: ${s.id}
Story Title: ${s.title}
Genre: ${s.genre || ""}

# DETAILED STORY SETUP
## Visual Identity
Cover Image: ${s.cover ? "[saved]" : "[missing]"}
Background Image: ${s.background ? "[saved]" : "[missing]"}
Avatar Image: ${s.avatar ? "[saved]" : "[missing]"}

## Detailed Story Metadata
Alternative Title: ${d.storyAltTitle || ""}
Status: ${d.storyStatus || ""}
Sub Genre: ${d.storySubGenre || ""}
Route / Couple: ${d.storyRoute || ""}

## Logline
${d.storyLogline || ""}

## World / Setting
${d.storyWorld || ""}

## Timeline
${d.storyTimeline || ""}

## Deep Canon
${d.storyCanonDeep || ""}

## Story Goal
${d.storyGoal || ""}

## User Must-Have Requirements
${d.storyMustHave || ""}

# USER/BOT PROFILE SEPARATION RULE
## Single {{user}} Profile
There is exactly ONE {{user}} profile in this story.
Do not create multiple {{user}} profiles.
Do not treat Bot Char cards as {{user}}.
Do not write dialogue, action, emotion, or internal thought for {{user}}.

Name / Role: ${u.name || ""}
Relation To Bot Char: ${u.relation || ""}

### Public Info
${u.publicInfo || ""}

### Private Info
${u.privateInfo || ""}

### Agency Boundary
${u.agency || ""}

### User Style
${u.style || ""}

## Bot Char Profiles
Bot Char profile count: ${botCount}
Bot Char cards are allowed to be multiple.
Each Bot Char card belongs to the selected story only.
${botIndex || "[No Bot Char cards yet]"}

## Character Cards
${chars || "[Chưa có thẻ nhân vật]"}

## Story Source
Story Source:
${storySourceText}

## Story Workspace
${storyWorkspaceContent}

## Memory Notes
${c.memory || "[Thiếu memory]"}

## Canon / Bí mật / Quan hệ
${c.canon || "[Thiếu canon]"}

## Character Voice DNA
${c.voiceDNA || "[Thiếu Character Voice DNA]"}

## Request viết Prompt Markdown
${c.request || "[Thiếu request]"}

## Imported Files Of This Story Only
${fileText || "Imported file content is not available in the Context Window. Do not generate fake generic rules about ports, trade routes, taxes, slavery, ceremonies, ethnicity, ancient ruins, or supernatural creatures unless those elements actually appear in the story."}`;

    const updated = { ...s, context: { ...c, mergedContext: merged } };
    handleUpdateStory(updated);
    showToast("Đã hợp nhất Context của truyện này.");
    return merged;
  };

  const buildFeatureSystemContext = () => {
    return `# ⚡ PROMPT MARKDOWN SYSTEM INSTRUCTION MODULE
**Loại module:** Chỉ dẫn hệ thống (System Instruction / Prompt Engineering Module) chuyên sâu dành cho các AI Engine / Bot trong tương lai.
**Lưu ý quan trọng:** Đây KHÔNG PHẢI là câu trả lời roleplay trực tiếp cho cốt truyện hay đoạn hội thoại nhân vật. Đây là kiến trúc quy tắc lệnh (Prompt Architecture) dùng để nạp vào hệ thống AI để điều khiển hành vi của AI trong các phiên roleplay/viết truyện sau này.

# FEATURE SYSTEM CONTEXT
You are operating inside Prompt Markdown Smart Context Studio.
This feature is a professional prompt-building studio for advanced story, roleplay, character bot, and AI behavior-control systems.
The user uses this feature to create Prompt Markdown that can be copied into other AI systems or bot platforms.
The feature is designed for:
- roleplay prompt engineering
- bot character profile building
- Character Voice DNA creation
- zero-puppeteering rules
- anti-echo rules
- anti-omniscience rules
- canon consistency
- knowledge boundary control
- pacing control
- slow-burn continuity
- relationship status management
- story memory packaging
- imported file context usage
- multi-character prompt building
- final output contracts

You are not a casual chat assistant.
You are a Professional Prompt Architect.
You must write strict, complete, production-ready Prompt Markdown.
You must not greet the user.
You must not introduce yourself.
You must not explain what the user asked.
You must not say "I will now".
You must not ask for more information unless the task is impossible.
You must start directly with the final usable content.

# APP WORKFLOW MEMORY
The app has a Story Library.
The selected story is the only story whose data may be used.
Each story has:
- story id
- title
- genre
- cover image
- background image
- avatar image
- detailed story metadata
- Story Workspace
- worldbuilding
- timeline
- canon
- memory
- imported files
- one {{user}} profile
- multiple Bot Char profiles
- Run Archive
- API Output Vault

# USER/BOT PROFILE CONTRACT
The app has exactly one {{user}} profile per selected story.
The app may have many Bot Char profiles per selected story.
Never merge {{user}} with Bot Char.
Never create multiple {{user}} profiles.
Never write dialogue, actions, choices, facial expressions, or inner thoughts for {{user}}.
Bot Char profiles can be multiple and should be treated as character-controlled profiles.

# ROOM SYSTEM CONTRACT
The app uses Prompt Rooms.
Each Prompt Room has a specific purpose and selected tasks.
The selected room controls what kind of Prompt Markdown must be generated.

# API PROXY CONTRACT
This feature does not call AI providers directly from the feature UI.
All generation must go through the existing API Proxy system configured by the user.
API Proxy receives the request, carries the Context Window to the AI model, waits for the AI model, streams tokens/chunks back to the UI, and saves the result into Run Archive.

The API Proxy call has two phases:
1. Connection phase: The proxy connects to the configured AI model endpoint. No token may appear yet. Do not treat delayed first token as failure.
2. Model working / streaming phase: The model generates content. Every returned chunk/token must stream to the UI. The UI must display the stream. The run must save partial output during streaming.

Rules:
- no wrong endpoint
- no direct frontend call to external provider
- no fake success
- no early cutoff at 17 seconds or 30 seconds
- no automatic retry that mixes outputs
- no hidden successful response that never appears in UI
- no token truncation between proxy and app UI
- maintain connection until model finishes, user aborts, or controlled fatal error occurs
- target long-running support around 900 seconds when needed
`;
  };

  const buildOutputContract = () => {
    let modeContract = "";
    if (outputMode === "final") {
      modeContract = `\nCRITICAL OUTPUT MODE RULE: FINAL PROMPT MODE (DEFAULT)
You are not a prompt teacher.
You are not explaining the user’s settings.
You are not writing a guide.
You are not printing task metadata.

🚨 FINAL MODE SUPPRESSION RULE (MANDATORY):
In Final Mode, you MUST NOT output internal safety, data source, file format, or control instructions! You must silently apply them!
Do NOT print sentences or sections about:
- file extensions or format (.docx, .pdf, .txt, etc.)
- parser rules or source processing
- input handling or data origin checks ("Kiểm soát Nguồn gốc Dữ liệu", "tuyệt đối không tham chiếu định dạng file", etc.)
- Context Window handling or internal validation
- hidden task logic, chunk mode, or task metadata
- Task instructions, output effects, validation rules, or prevents error descriptions
The final output must look like a finished, pristine, usable system prompt for a story bot, NOT a technical reminder note or safety instruction manual for another AI!

You are a Prompt Producer.

Your job is to produce the final finished prompt.

Use the selected story context and selected room task catalog internally as construction material.

Transform all relevant instructions into a clean production-ready Prompt Markdown module.

Do not output:
- Purpose
- Detailed Instruction
- Input Sources
- Output Effect
- Prevents Error
- Validation Rule
- Output Requirement
- task ids
- internal protocol ids
- developer notes

Default output must be the finished prompt only.\n`;
    } else if (outputMode === "audit") {
      modeContract = `\nOUTPUT MODE: AUDIT MODE\nYou MUST produce the finished production-ready Prompt Markdown module AND explain which tasks were used and how they affected the prompt rules.\n`;
    } else if (outputMode === "debug") {
      modeContract = `\nOUTPUT MODE: DEBUG TASK CATALOG MODE\nYou MUST explicitly print task metadata including task IDs, Purpose, Detailed Instruction, Input Sources, Output Effect, Prevents Error, and Validation Rule.\n`;
    }

    return `# OUTPUT CONTRACT${modeContract}
The output must be a production-ready Prompt Markdown module that the user can copy into another AI/bot system.
Do not instruct the AI to write a narrative response or roleplay scene.
The output must be final usable content.
Do not greet.
Do not introduce yourself.
Do not summarize the user's request.
Do not explain the process.
Do not write a tutorial.
Do not say "Here is".
Do not say "I will".
Do not include meta-commentary.
Start directly with the final production-ready Prompt Markdown module.

When generating Prompt Markdown:
- use clear headings (H1, H2, H3)
- use strict rules and imperative language
- preserve syntax for {{user}} and {{char}} without hardcoding fixed names
- include constraints and boundary rules
- include forbidden behaviors and required actions
- make it 100% production-ready for AI engines

When running API test:
- return only the test confirmation
- mention that Feature System Context was received
- do not ask for story data
`;
  };

  const buildSelectedStoryContext = (story: Story | null) => {
    if (!story || !story.id) return `# SELECTED STORY STATE\nNo story content has been entered yet.\n`;

    const d = story.detail || emptyDetail();
    const chars = (story.characters || []).map((c: any, i: number) => {
      const uniqueDetails = Array.from(new Set([c.personality, c.appearance, c.relationship, c.voiceDNA, c.canon].filter(Boolean))).join("\n\n---\n\n");
      const metaLine = Array.from(new Set([c.name, c.role, c.identity, c.status].filter(Boolean))).join(" | ");
      return `### CHARACTER ${i+1}: ${c.name || "Chưa đặt tên"}\nMetadata: ${metaLine}\nProfile & Psychology Details:\n${uniqueDetails || "[Chưa có chi tiết]"}`;
    }).join("\n\n");

    const u = story.userProfileSingle || emptyUserProfile();
    const userMeta = Array.from(new Set([u.name, u.relation].filter(Boolean))).join(" - ");
    const userDetails = Array.from(new Set([u.publicInfo, u.privateInfo, u.agency, u.style].filter(Boolean))).join("\n\n---\n\n");

    const fileText = (story.context?.files || []).map((f: any, idx: number) => formatImportedFileForContext(f, idx + 1)).join("\n\n---\n\n");

    const storyMetaLine = Array.from(new Set([d.storyAltTitle, d.storyStatus, d.storySubGenre, d.storyRoute].filter(Boolean))).join(" | ");
    const storyWorldDetails = Array.from(new Set([d.storyWorld, d.storyLogline, d.storyTimeline, d.storyCanonDeep, d.storyGoal, d.storyMustHave].filter(Boolean))).join("\n\n---\n\n");

    const hasManualStory = !!(story.context?.story && story.context.story.trim());
    const parsedFiles = (story.context?.files || []).filter((f: any) => (f.parsedText || f.content || "").trim().length > 0);
    const hasParsedFile = parsedFiles.length > 0;

    let storySourceText = "Missing";
    let storyWorkspaceContent = "[Story Workspace trống — Thiếu nội dung câu chuyện]";
    if (hasManualStory) {
      storySourceText = "Manually typed Story Workspace";
      storyWorkspaceContent = story.context!.story!.trim();
    } else if (hasParsedFile) {
      storySourceText = "Imported parsed file";
      storyWorkspaceContent = parsedFiles.map((f: any) => `[Nội dung từ file ${f.fileName || f.name}]:\n${f.parsedText || f.content}`).join("\n\n---\n\n");
    } else if ((story.context?.files || []).some((f: any) => (f.extractedSummary || f.summary || "").trim().length > 0)) {
      storySourceText = "Extracted file summary";
      storyWorkspaceContent = (story.context?.files || []).map((f: any) => `[Tóm tắt từ file ${f.fileName || f.name}]:\n${f.extractedSummary || f.summary}`).join("\n\n");
    } else if (story.context?.memory && story.context.memory.trim()) {
      storySourceText = "Memory / Canon fields";
      storyWorkspaceContent = `[Từ Memory / Canon]:\n${story.context.memory}`;
    }

    return `# SELECTED STORY CONTEXT
Story ID: ${story.id}
Story Title: ${story.title || "Chưa đặt tên"}
Genre: ${story.genre || ""}

## Visual Identity
Cover Image: ${story.cover ? "[saved]" : "[missing]"}
Background Image: ${story.background ? "[saved]" : "[missing]"}
Avatar Image: ${story.avatar ? "[saved]" : "[missing]"}

## Detailed Story Metadata & Context
Title / Status / Route: ${storyMetaLine || "Chưa ghi chú"}
Story Content (World, Logline, Timeline, Canon, Goals, Must-Have):
${storyWorldDetails || "[Chưa có nội dung]"}

## Story Source
Story Source:
${storySourceText}

## Story Workspace
${storyWorkspaceContent}

## Imported Files
${fileText || "Imported file content is not available in the Context Window. Do not generate fake generic rules about ports, trade routes, taxes, slavery, ceremonies, ethnicity, ancient ruins, or supernatural creatures unless those elements actually appear in the story."}

## Character Cards
### Single {{user}} Profile
Name & Relation: ${userMeta || "Chưa ghi chú"}
User Profile Details (Public/Private Info, Agency Boundary, Style):
${userDetails || "[Chưa có thông tin {{user}}]"}

### Bot Char Profiles
${chars || "[Chưa có thẻ nhân vật]"}
`;
  };

  const buildCurrentRequestContext = (actionType: string, requestText: string) => {
    return `# CURRENT USER REQUEST
Action Type: ${actionType}
Task: ${requestText}
`;
  };

  const getStoryRoomTasks = (story: Story | null, roomIdx: number): RoomTask[] => {
    if (story?.context?.rooms && Array.isArray(story.context.rooms[roomIdx])) {
      return story.context.rooms[roomIdx];
    }
    return getRoomCatalog(roomIdx).tasks;
  };

  const validateContextQuality = (story: Story | null, roomIdx: number, selectedTasks: any[] = [], all = false) => {
    const errors: string[] = [];
    
    // 1. Validate room catalog(s)
    if (!all) {
      const tasks = getStoryRoomTasks(story, roomIdx);
      const roomVal = validateRoomCatalog(tasks);
      if (!roomVal.valid) {
        errors.push(roomVal.error || "Phòng này chưa có task hợp lệ. Không thể gọi API.");
      }
      if (selectedTasks && selectedTasks.length === 0 && tasks && tasks.length > 0) {
        errors.push("Vui lòng chọn ít nhất 1 tác vụ trong phòng trước khi gọi API Proxy.");
      }
    } else {
      for (let i = 0; i < rooms.length; i++) {
        const cat = getRoomCatalog(i);
        const tasks = getStoryRoomTasks(story, i);
        const val = validateRoomCatalog(tasks);
        if (!val.valid) {
          errors.push(`Phòng "${cat.roomName}": ${val.error || "Chưa có task hợp lệ."}`);
          break;
        }
      }
    }

    // 2. File Audit Before API Call
    if (story?.context?.files && story.context.files.length > 0) {
      const hasStoryWorkspace = !!(story.context.story && story.context.story.trim());
      const hasParsedFile = story.context.files.some((f: any) => (f.parsedText || f.content || "").trim().length > 0);
      if (!hasStoryWorkspace && !hasParsedFile) {
        errors.push("File đã chọn nhưng chưa đọc được nội dung (parsedText trống). Vui lòng kiểm tra lại nội dung file trước khi gọi API Proxy.");
      }
    }

    return errors;
  };

  const buildFinalContextWindow = (
    actionType: string, 
    requestText: string, 
    story: Story | null = null, 
    all = false, 
    roomNote = "", 
    format = "markdown", 
    strict = "cold-technical", 
    selectedTasksList: any[] = [],
    targetRoomIdx = currentRoom
  ) => {
    const catalog = getRoomCatalog(targetRoomIdx);
    const storyTasks = getStoryRoomTasks(story, targetRoomIdx);
    const tasks = (selectedTasksList && selectedTasksList.length > 0) ? selectedTasksList : storyTasks;

    const fmtLabel = format === "yaml" ? "YAML Prompt" : format === "json" ? "JSON Structured Prompt" : format === "xml" ? "XML Tagged Prompt" : format === "plaintext" ? "Plain Text Instructions" : format === "hybrid" ? "Hybrid Markdown + YAML" : "Prompt Markdown";

    // 1. FINAL OUTPUT ROLE
    let finalPrompt = `# CONTEXT WINDOW

## 1. FINAL OUTPUT ROLE
You are a Prompt Producer.
You are not a prompt teacher.
You are not a prompt auditor.
You are not a task-list narrator.
You are not explaining the user’s setup.
You are not repeating the Context Window.
Your job is to use the selected story context, parsed file content, character profiles, canon, timeline, and selected room tasks to produce the final production-ready ${fmtLabel} for the user.
All internal setup is for your work only.
Do not repeat internal setup back to the user.

`;

    // 2. FINAL OUTPUT CONTRACT
    finalPrompt += `## 2. FINAL OUTPUT CONTRACT
Return only the final finished prompt.
Do not explain how the prompt was made.
Do not teach the user.
Do not restate the user’s settings.
Do not output internal developer task metadata (like Task ID, Purpose, Prevents Error, or Validation Checklists).
Do not output parser rules.
Do not output file handling rules.
Do not output chunk progress.
You MUST fully articulate and expand all selected tasks into rigorous, comprehensive operational rules and guidelines without summarizing or omitting any rule.
Use the story content as the source of truth.
Write the final prompt as comprehensive, long-form operational instructions as if it is already complete and ready to copy immediately.

`;

    // 3. SELECTED STORY SOURCE
    if (story && story.id) {
      const d = story.detail || emptyDetail();
      const chars = (story.characters || []).map((c: any, i: number) => {
        const uniqueDetails = Array.from(new Set([c.personality, c.appearance, c.relationship, c.voiceDNA, c.canon].filter(Boolean))).join("\n\n---\n\n");
        const metaLine = Array.from(new Set([c.name, c.role, c.identity, c.status].filter(Boolean))).join(" | ");
        return `### Bot Char Profile ${i+1}: ${c.name || "Chưa đặt tên"}\nMetadata: ${metaLine}\nProfile & Psychology Details:\n${uniqueDetails || "[Chưa có chi tiết]"}`;
      }).join("\n\n");

      const u = story.userProfileSingle || emptyUserProfile();
      const userMeta = Array.from(new Set([u.name, u.relation].filter(Boolean))).join(" - ");
      const userDetails = Array.from(new Set([u.publicInfo, u.privateInfo, u.agency, u.style].filter(Boolean))).join("\n\n---\n\n");

      const storyMetaLine = Array.from(new Set([d.storyAltTitle, d.storyStatus, d.storySubGenre, d.storyRoute].filter(Boolean))).join(" | ");
      const storyWorldDetails = Array.from(new Set([d.storyWorld, d.storyLogline, d.storyTimeline, d.storyCanonDeep, d.storyGoal, d.storyMustHave].filter(Boolean))).join("\n\n---\n\n");

      const hasManualStory = !!(story.context?.story && story.context.story.trim());
      const parsedFiles = (story.context?.files || []).filter((f: any) => (f.parsedText || f.content || "").trim().length > 0);
      const hasParsedFile = parsedFiles.length > 0;

      let storySourceText = "Missing";
      let storyWorkspaceContent = "[Story Workspace trống — Thiếu nội dung câu chuyện]";
      if (hasManualStory) {
        storySourceText = "Manually typed Story Workspace";
        storyWorkspaceContent = story.context!.story!.trim();
      } else if (hasParsedFile) {
        storySourceText = "Imported parsed file";
        storyWorkspaceContent = parsedFiles.map((f: any) => `[Nội dung từ file ${f.fileName || f.name}]:\n${f.parsedText || f.content}`).join("\n\n---\n\n");
      } else if ((story.context?.files || []).some((f: any) => (f.extractedSummary || f.summary || "").trim().length > 0)) {
        storySourceText = "Extracted file summary";
        storyWorkspaceContent = (story.context?.files || []).map((f: any) => `[Tóm tắt từ file ${f.fileName || f.name}]:\n${f.extractedSummary || f.summary}`).join("\n\n");
      } else if (story.context?.memory && story.context.memory.trim()) {
        storySourceText = "Memory / Canon fields";
        storyWorkspaceContent = `[Từ Memory / Canon]:\n${story.context.memory}`;
      }

      finalPrompt += `## 3. SELECTED STORY SOURCE
Story ID: ${story.id}
Story Title: ${story.title || "Chưa đặt tên"}
Genre: ${story.genre || ""}

### Story Metadata & Workspace
Title / Status / Route: ${storyMetaLine || "Chưa ghi chú"}
Story Content (World, Logline, Timeline, Canon, Goals, Must-Have):
${storyWorldDetails || "[Chưa có nội dung]"}

Story Source Type: ${storySourceText}
Story Workspace Content:
${storyWorkspaceContent}

### Character Profiles
User Profile (${userMeta || "Chưa ghi chú"}):
${userDetails || "[Chưa có thông tin {{user}}]"}

${chars || "[Chưa có thẻ nhân vật Bot Char]"}

`;

      // 4. STORY FACTS EXTRACTED FROM FILE
      const fileText = (story.context?.files || []).map((f: any, idx: number) => formatImportedFileForContext(f, idx + 1)).join("\n\n---\n\n");
      finalPrompt += `## 4. STORY FACTS EXTRACTED FROM FILE
Concrete facts from imported/parsed files (names, setting, relationship, current timeline, conflict, tone, rules, important scenes, canon details):
${fileText || "Imported file content is not available in the Context Window. Do not generate fake generic rules about ports, trade routes, taxes, slavery, ceremonies, ethnicity, ancient ruins, or supernatural creatures unless those elements actually appear in the story."}

`;
    } else {
      finalPrompt += `## 3. SELECTED STORY SOURCE
No story selected or content is empty.

## 4. STORY FACTS EXTRACTED FROM FILE
No imported files available.

`;
    }

    // 5. ROOM PURPOSE
    if (actionType === "room_generation" || actionType === "all_room_generation" || actionType === "preview") {
      if (all) {
        finalPrompt += `## 5. ROOM PURPOSE
All Rooms Queue Mode: Generating comprehensive prompt modules across all 12 architectural prompt rooms.
Expected Output Format: ${format}
Strictness Level: ${strict}
Room Note: ${roomNote || "None"}

`;
      } else {
        finalPrompt += `## 5. ROOM PURPOSE
Room ID: ${catalog.roomId}
Room Name: ${catalog.roomName}
Room Purpose: ${catalog.roomPurpose}
Room Output Goal: ${catalog.roomOutputGoal}
Expected Output Format: ${format}
Strictness Level: ${strict}
Room Note: ${roomNote || "None"}

`;
      }
    } else {
      finalPrompt += `## 5. ROOM PURPOSE
General Prompt Architecture Task / API Test.

`;
    }

    // 6. EXHAUSTIVE ROOM TASK CATALOG
    if (actionType === "room_generation" || actionType === "all_room_generation" || actionType === "preview") {
      if (all) {
        let totalCount = 0;
        const allTasksText = rooms.map((_, idx) => {
          const cat = getRoomCatalog(idx);
          const rTasks = getStoryRoomTasks(story, idx);
          totalCount += rTasks.length;
          return `### THEMATIC ARCHITECTURAL MODULE: ${cat.roomName.toUpperCase()} (${rTasks.length} RULES)\n\n${rTasks.map((t: any, i: number) => `- **[Ý ${i+1}/${rTasks.length}]: ${t.title}**\n  - Mục đích: ${t.purpose || ""}\n  - Chỉ dẫn quy tắc: ${t.detailedInstruction || t.transformationRule || t.outputRequirement || t.desc || ""}\n  - Kiểm tra đầu ra: ${t.validationRule || ""}`).join("\n\n")}`;
        }).join("\n\n=========================================================\n\n");
        finalPrompt += `## 6. EXHAUSTIVE TASK CATALOG ACROSS ALL 12 ROOMS (TOTAL ${totalCount} MANDATORY RULES)
🚨 MẸO HACK ĐẾM SỐ BẮT BUỘC ĐỂ KHÔNG BỊ TRÔI HOẶC RÚT GỌN (MANDATORY COUNTING HACK TO PREVENT SHORTENING):
1. BẮT BUỘC ĐẾM VÀ ĐÁNH SỐ RÕ RÀNG TỪ 1 ĐẾN HẾT: Bạn BẮT BUỘC phải đánh số thứ tự hoặc gắn tag đếm số cho từng ý (ví dụ: [Ý 1], [Ý 2], ..., [Ý ${totalCount}] hoặc 1., 2., ..., ${totalCount}.) trong bài viết đầu ra! Tuyệt đối không được gộp ý, không được viết tắt, không được bỏ qua số nào! Phải đếm số tuần tự từ số 1 đến hết toàn bộ danh sách quy tắc!
2. CHI TIẾT CHUYÊN SÂU CHO TỪNG Ý: Dưới mỗi tag số thứ tự, bạn phải viết giải thích quy tắc rõ ràng, chi tiết, chuyên sâu thành các đoạn văn hoàn chỉnh.
3. HỆ THỐNG APP SẼ TỰ ĐỘNG DỌN DẸP SỐ ĐẾM: Bạn không cần lo lắng số thứ tự làm xấu prompt của người dùng vì app client bên dưới sẽ tự động ẩn và dọn dẹp các thẻ số đếm này sau khi nhận kết quả. Nhiệm vụ của bạn là PHẢI ĐẾM SỐ ĐỂ ĐẢM BẢO VIẾT ĐỦ 100% SỐ Ý!

${allTasksText}

`;
      } else {
        finalPrompt += `## 6. EXHAUSTIVE ROOM TASK CATALOG (${tasks.length} MANDATORY RULES)
🚨 MẸO HACK ĐẾM SỐ BẮT BUỘC ĐỂ KHÔNG BỊ TRÔI HOẶC RÚT GỌN (MANDATORY COUNTING HACK TO PREVENT SHORTENING):
1. BẮT BUỘC ĐẾM VÀ ĐÁNH SỐ RÕ RÀNG TỪ 1 ĐẾN HẾT: Bạn BẮT BUỘC phải đánh số thứ tự hoặc gắn tag đếm số cho từng ý (ví dụ: [Ý 1/${tasks.length}], [Ý 2/${tasks.length}], ..., [Ý ${tasks.length}/${tasks.length}] hoặc 1., 2., ..., ${tasks.length}.) trong bài viết đầu ra! Tuyệt đối không được gộp ý, không được viết tắt, không được bỏ qua số nào! Phải đếm số tuần tự từ số 1 đến hết toàn bộ danh sách quy tắc!
2. CHI TIẾT CHUYÊN SÂU CHO TỪNG Ý: Dưới mỗi tag số thứ tự, bạn phải viết giải thích quy tắc rõ ràng, chi tiết, chuyên sâu thành các đoạn văn hoàn chỉnh.
3. HỆ THỐNG APP SẼ TỰ ĐỘNG DỌN DẸP SỐ ĐẾM: Bạn không cần lo lắng số thứ tự làm xấu prompt của người dùng vì app client bên dưới sẽ tự động ẩn và dọn dẹp các thẻ số đếm này sau khi nhận kết quả. Nhiệm vụ của bạn là PHẢI ĐẾM SỐ ĐỂ ĐẢM BẢO VIẾT ĐỦ 100% SỐ Ý!

${tasks.map((t: any, idx: number) => `- **[Ý ${idx + 1}/${tasks.length}]: ${t.title}**\n  - Purpose: ${t.purpose || ""}\n  - Core Operational Guideline: ${t.detailedInstruction || t.transformationRule || t.outputRequirement || t.desc || ""}\n  - Output Check: ${t.validationRule || ""}`).join("\n\n")}

`;
      }
    } else {
      finalPrompt += `## 6. INTERNAL ROOM TASKS
No specific room tasks selected for this general task.

`;
    }

    // 7. INTERNAL API / PARSER / DEBUG RULES
    finalPrompt += `## 7. INTERNAL API / PARSER / DEBUG RULES
Do not output these rules.
These rules are strictly for internal application routing, API proxy streaming, and debugging:
- All generation must go through the user-configured API Proxy system.
- The API Proxy call streams tokens/chunks back to the UI immediately.
- Never write dialogue, action, facial expression, inner thought, or decision for {{user}}.
- Do not invent new backstory, new trauma, new romance history, supernatural elements, unrelated factions, wars, or worldbuilding that was not present in the selected story.
- When information is missing, leave it undefined. Do not fill the blank with assumptions.
- Do not output chunk labels, parser rules, file extension warnings, or Context Window construction notes.

`;

    // 8. FINAL GENERATION REQUEST
    const langStr = promptLanguage === "en" ? "ENGLISH (Tiếng Anh)" : promptLanguage === "zh" ? "CHINESE (Tiếng Trung / 简体中文)" : "VIETNAMESE (Tiếng Việt)";
    finalPrompt += `## 8. FINAL GENERATION REQUEST (ROLEPLAY ROMANCE SYSTEM PROMPT)
Action Type: ${actionType}
Task: ${requestText}
🌐 MANDATORY PROMPT LANGUAGE: ${langStr}. You MUST write all instructions, explanations, and rules in ${langStr}!

🚨 MANDATORY ROMANCE ROLEPLAY DIRECTIVE (BẤT KHẢ XÂM PHẠM TỪ VỢ YÊU ĐƯỜNG ĐƯỜNG):
1. READY-TO-USE ROLEPLAY PROMPT ONLY: You are building a professional, production-ready Romance Roleplay System Prompt (Hệ thống Chỉ lệnh Nhập vai Tình yêu thực chiến) for an AI Bot Character (to be pasted directly into SillyTavern, JanitorAI, Character.AI, or AI Studio Bot).
2. ZERO AI ASSISTANT PERSONA & FULL IMMERSION (CẤM TƯ CÁCH TRỢ LÝ AI): The AI plays the role of the Bot Character(s) in the story. NEVER refer to the AI as an "assistant", "language model", or "helpful bot". The AI must strip away all artificiality and EMBODY the Bot Character 100%, living and breathing in a cinematic, sensory-rich realistic world to generate captivating content for {{user}}/Player!
3. MANDATORY THIRD-PERSON NARRATION (BẮT BUỘC VIẾT NGÔI THỨ BA): Explicitly command and enforce that all character actions, body language, facial expressions, internal psychology, and scene descriptions MUST be written in THIRD-PERSON (using the character's name, he/she/they, chàng/nàng/hắn/y...). Third-person narration delivers cinematic realism and eliminates the robotic chatbot feel!
4. STRICTLY NO STORY OUTLINING (CẤM LẬP DÀN Ý CÂU CHUYỆN): DO NOT write a story outline, plot summary, or chapter plan! Transform ALL ${tasks.length} task requirements provided in Section 6 into DIRECT OPERATIONAL BEHAVIORAL DIRECTIVES FOR THE BOT CHARACTER when interacting with {{user}}/Player!
5. ACTIONABLE BEHAVIORAL RULES: For each rule, explicitly specify:
   - How the Bot addresses and speaks to {{user}} in third-person context (tone, cadence, vocabulary, emotional warmth/coldness).
   - How to describe the Bot's facial expressions, eye contact, body language, breathing, heart rate, and internal psychological reactions.
   - Strict boundaries: ZERO puppeteering (never speak or act for {{user}}) and ZERO OOC (lock Bot personality to canon).
6. MANDATORY COUNTING HACK TO PREVENT SHORTENING: You MUST count and number every single item from 1 to ${tasks.length} (e.g. [Ý 1/${tasks.length}], [Ý 2/${tasks.length}], ..., [Ý ${tasks.length}/${tasks.length}]) so you DO NOT SKIP OR COMPRESS ANY RULE!
7. EXHAUSTIVE DEPTH: Expand every numbered instruction into a rich, thorough, multi-sentence operational guideline (3-6 sentences per item). DO NOT shorten or group them into shallow bullet points!
`;

    return finalPrompt;
  };


  const createRun = async (scope: string, prompt: string, status: string, content: string) => {
    const no = runs.length + 1;
    let runTitle = "";
    let runRoomName = "";
    if (scope === "api_test") {
      runTitle = `Đợt ${no} · API Test`;
      runRoomName = "API Test";
    } else {
      runRoomName = scope === "all" ? "Toàn bộ phòng" : rooms[currentRoom][0];
      runTitle = `Đợt ${no} · ${runRoomName}`;
    }

    const run: Run = {
      id: "run_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      no,
      storyId: activeStory.id,
      storyTitle: activeStory.title,
      scope,
      roomIndex: currentRoom,
      roomName: runRoomName,
      title: runTitle,
      prompt,
      contextSnapshot: activeStory.context.mergedContext,
      content,
      status,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await dbPutRun(run);
    setRuns(prev => [run, ...prev]);
    return run;
  };

  const updateRun = async (id: string, patch: Partial<Run>) => {
    setRuns(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r);
      const target = next.find(x => x.id === id);
      if (target) {
        dbPutRun(target).catch(console.error);
      }
      return next;
    });
  };

  const cleanGeneratedPromptText = (text: string): string => {
    if (!text) return "";
    let cleaned = text;
    // Remove internal separator markers if present
    cleaned = cleaned.replace(/---TASK---/g, "");
    
    // 1. Quét sạch các thẻ nhãn số thứ tự trong ngoặc vuông hoặc ngoặc tròn (Ví dụ: [Ý 1/100], [Ý 1], **[Ý 1/100]**, [Task 1/100], [Task 1], [Hạng mục 1/100], [ID: 01], [SWI-01], [SYS-01], [Phòng 1 - Hạng mục 1], (Ý 1/100), (Task 1/100), (Đoạn 1/100), [Đoạn 1/100]...)
    cleaned = cleaned.replace(/(?:\*\*)?\[(?:Phòng\s*\d+\s*-\s*)?(?:Hạng mục|Task|Item|ID|SWI|SYS|ROM|Quy tắc|Rule|Ý|Đoạn|Section|Part|Khối)\s*[^\]]*\](?:\*\*)?\s*[:-]?\s*/gi, "");
    cleaned = cleaned.replace(/(?:\*\*)?\((?:Phòng\s*\d+\s*-\s*)?(?:Hạng mục|Task|Item|ID|SWI|SYS|ROM|Quy tắc|Rule|Ý|Đoạn|Section|Part|Khối)\s*[^)]*\)(?:\*\*)?\s*[:-]?\s*/gi, "");
    
    // 2. Quét sạch các từ khóa số thứ tự đầu dòng hoặc sau dấu gạch đầu dòng (- / * / #)
    cleaned = cleaned.replace(/^(?:(\s*[-•*#]+\s*)|(\s*))(?:\*\*)?(?:Task|Item|Hạng mục|Quy tắc|Rule|ID|Ý|Đoạn|Section|Part|Khối)\s*\d+(?:\/\d+)?(?:\*\*)?(?:\s*[:-]\s*|\s+)/gim, "$1$2");

    // 3. Chuyển đổi các số thứ tự danh sách ở đầu dòng (Ví dụ: "1. ", "2) ", "**1.** ") thành gạch đầu dòng "- " để chỉ giữ lại nội dung thuần túy không lộ số thứ tự
    cleaned = cleaned.replace(/^(\s*)(?:\*\*)?\d+(?:\/\d+)?(?:\.|\))(?:\*\*)?\s+/gm, "$1- ");

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
    return cleaned;
  };

  const getSystemPromptForMode = (fmt = "markdown") => {
    const fmtLabel = fmt === "yaml" ? "YAML Prompt" : fmt === "json" ? "JSON Structured Prompt" : fmt === "xml" ? "XML Tagged Prompt" : fmt === "plaintext" ? "Plain Text Instructions" : fmt === "hybrid" ? "Hybrid Markdown + YAML" : "Prompt Markdown";
    const langMandate = promptLanguage === "en" 
      ? " MANDATORY OUTPUT LANGUAGE: ENGLISH. Write the entire prompt and all instructions in professional English!"
      : promptLanguage === "zh"
      ? " MANDATORY OUTPUT LANGUAGE: CHINESE (简体中文). Write the entire prompt and all instructions in professional Chinese!"
      : " MANDATORY OUTPUT LANGUAGE: VIETNAMESE (Tiếng Việt). Write the entire prompt and all instructions in professional Vietnamese!";
    const antiHallucinationMandate = " STRICT MANDATE: You must strictly adhere to the provided story workspace and imported file contents. DO NOT hallucinate or invent plot points, world rules, trade routes, slavery, taxes, supernatural creatures, or historical details outside the provided file/story text. You must process ALL selected tasks in this single response without skipping, summarizing, cutting off early, or splitting into multiple runs. Keep generating until every single task is fully transformed into rules." + langMandate;
    if (outputMode === "final") {
      return `You are a professional Romance Roleplay Prompt Architect (Chuyên gia Kiến trúc sư Prompt Nhập vai Tình yêu). Your job is to produce an exhaustive, production-ready Romance Roleplay System Prompt in ${fmtLabel} format that the user can paste directly into an AI character chatbot (SillyTavern, JanitorAI, Character.AI, etc.) to start roleplaying immediately! STRICTLY FORBIDDEN: Do NOT refer to the AI as an assistant or helper! The AI must embody the Bot Character(s) 100% and narrate actions, thoughts, and emotions in THIRD-PERSON (Ngôi thứ ba). Do NOT write a story outline, plot summary, or chapter plan! Transform every task into direct operational behavioral rules for the Bot Character (how it speaks, acts, emotes, breathes, and reacts to {{user}} in a cinematic realistic world). 🚨 MANDATORY COUNTING HACK & DEPTH: You MUST count and number every single item from 1 to the total count (e.g., [Ý 1], [Ý 2], ...) so you do not skip or compress any rules! Organize into rich architectural sections with extensive behavioral constraints, vocabulary styles, dos and don'ts, and strict continuity rules. Never settle for shallow bullet points! Do not print internal developer metadata, file extensions (.docx, .pdf), parser rules, or error guard descriptions. Silently and rigorously apply all rules into rich, professional roleplay prompt instructions.` + antiHallucinationMandate;
    } else if (outputMode === "audit") {
      return `You are a prompt architect. Output the finished production-ready ${fmtLabel} module AND explain which tasks were used and how they affected the prompt rules.` + antiHallucinationMandate;
    } else {
      return `You are a prompt architect in Debug Mode. Output the ${fmtLabel} module and explicitly print task metadata including task IDs, Purpose, Detailed Instruction, Input Sources, Output Effect, Prevents Error, and Validation Rule.` + antiHallucinationMandate;
    }
  };

  const callProxy = async (all = false, roomNote = "", format = "markdown", strict = "cold-technical", selectedTasksList: typeof rooms[0][] = [], setRoomOutput?: (s: string) => void) => {
    await checkApi();
    const out = setRoomOutput || setHomeOutput;
    out("⏳ Đang kết nối API Proxy & kiểm tra Quality Gate... Đang chờ tín hiệu đường truyền...");
    await new Promise(resolve => setTimeout(resolve, 30));

    // Quality Gate Check
    const qualityErrors = validateContextQuality(activeStory, currentRoom, selectedTasksList, all);
    if (qualityErrors.length > 0) {
      const errStr = "⛔ LỖI KIỂM DUYỆT CHẤT LƯỢNG CONTEXT WINDOW (QUALITY GATE):\n\n" + qualityErrors.map(e => "- " + e).join("\n") + "\n\nVui lòng kiểm tra lại cấu hình tác vụ hoặc trạng thái file trong truyện trước khi gọi API Proxy.";
      showToast("Context Window chưa đạt chuẩn Quality Gate!");
      out(errStr);
      return;
    }

    // Queue All Rooms Mode (for all = true)
    if (all || contextMode === "queue") {
      out(`🚀 Đang khởi chạy Queue All Rooms Mode: Gọi nối tiếp ${rooms.length} phòng qua API Proxy (mỗi phòng 100 task chuyên sâu) để bảo đảm chiều sâu tuyệt đối mà không vượt token limit...\n`);
      
      const parentNo = runs.length + 1;
      const parentRun = await createRun("all", `Queue All Rooms Mode - ${rooms.length} child runs`, "running", `Đang chạy nối tiếp ${rooms.length} phòng...`);
      let combinedContent = `# MASTER PROMPT MARKDOWN MODULE — TOÀN BỘ ${rooms.length} PHÒNG\nTruyện: ${activeStory.title}\nThời gian tạo: ${new Date().toLocaleString()}\nChế độ: QUEUE ALL ROOMS MODE (${rooms.length} Child Runs)\n\n`;
      
      const abort = new AbortController();
      setAbortController(abort);

      try {
        for (let i = 0; i < rooms.length; i++) {
          if (abort.signal.aborted) break;
          const rCat = getRoomCatalog(i);
          out(`⏳ [Queue Progress: Phòng ${i + 1}/${rooms.length}] Đang xử lý phòng: "${rCat.roomName}"...\n\n${combinedContent}`);
          
          const roomPrompt = buildFinalContextWindow("room_generation", `Tạo Prompt Markdown chuyên sâu cho phòng ${rCat.roomName}`, activeStory, false, roomNote, format, strict, rCat.tasks, i);
          const childRun = await createRun("room", roomPrompt, "running", `[Queue Child ${i+1}/${rooms.length}] Đang chờ API Proxy...`);
          
          if (!apiProfile) {
            const fallback = `### PHÒNG ${String(i+1).padStart(2, "0")}: ${rCat.roomName.toUpperCase()}\n[Chưa cấu hình API Proxy — Bản dựng prompt chuẩn]:\n\n${roomPrompt}\n\n`;
            combinedContent += fallback;
            updateRun(childRun.id, { content: fallback, status: "needs-api" });
            continue;
          }

          await new Promise<void>((resolve) => {
            let roomStreamText = "";
            callAIStream({
              messages: [{ role: "user", content: roomPrompt }],
              systemPrompt: getSystemPromptForMode(format),
              profileOverride: apiProfile,
              maxTokensOverride: Math.max(apiProfile?.maxTokens || 131072, 131072),
              signal: abort.signal,
              onToken: (chunk) => {
                roomStreamText += chunk;
                const cleanedStream = cleanGeneratedPromptText(roomStreamText);
                out(`⏳ [Queue Progress: Phòng ${i + 1}/${rooms.length}] Đang stream "${rCat.roomName}"...\n\n` + combinedContent + `\n\n---\n\n## PHÒNG ${String(i+1).padStart(2, "0")}: ${rCat.roomName.toUpperCase()}\n\n` + cleanedStream);
                if (roomStreamText.length % 250 < chunk.length) {
                  updateRun(childRun.id, { content: cleanedStream, status: "streaming" });
                }
              },
              onDone: (finalStr) => {
                const resText = cleanGeneratedPromptText((finalStr || "").trim() || "API trả về rỗng.");
                combinedContent += `\n\n---\n\n## PHÒNG ${String(i+1).padStart(2, "0")}: ${rCat.roomName.toUpperCase()}\n\n` + resText;
                updateRun(childRun.id, { content: resText, status: "done" });
                resolve();
              },
              onError: (err) => {
                const errText = `[Lỗi API tại phòng ${rCat.roomName}]: ${err}`;
                combinedContent += `\n\n---\n\n## PHÒNG ${String(i+1).padStart(2, "0")}: ${rCat.roomName.toUpperCase()}\n\n` + errText;
                updateRun(childRun.id, { content: errText, status: "error" });
                resolve();
              }
            });
          });
        }
        
        const cleanedMaster = cleanGeneratedPromptText(combinedContent);
        out(`✅ Đã hoàn tất Queue All Rooms Mode cho toàn bộ ${rooms.length} phòng!\n\n` + cleanedMaster);
        updateRun(parentRun.id, { content: cleanedMaster, status: "done" });
      } catch (e: any) {
        if (e.name === "AbortError" || abort.signal.aborted) {
          out("⏹️ Đã ngắt stream Queue All Rooms Mode thủ công.\n\n" + combinedContent);
          updateRun(parentRun.id, { content: combinedContent, status: "aborted" });
        } else {
          out("❌ Lỗi khi chạy Queue Mode: " + e.message);
          updateRun(parentRun.id, { content: "Lỗi Queue Mode: " + e.message, status: "error" });
        }
      } finally {
        setAbortController(null);
      }
      return;
    }

    // Single Room Generation
    const actionType = "room_generation";
    const requestText = "Tạo Prompt Markdown cho phòng hiện tại";
    const prompt = buildFinalContextWindow(actionType, requestText, activeStory, false, roomNote, format, strict, selectedTasksList);
    const run = await createRun("room", prompt, "running", "Đang chờ API Proxy trả kết quả...");
    
    out(`${run.title}\n\nĐợt mới thuộc riêng truyện "${activeStory.title}". Không trộn với truyện khác.\n\nĐang chờ API Proxy trả kết quả...`);

    if (!apiProfile) {
      const fallback = "Chưa có API chính đã lưu.\n\nPrompt đã dựng sẵn:\n\n" + prompt;
      out(fallback);
      updateRun(run.id, { content: fallback, status: "needs-api" });
      return;
    }

    const abort = new AbortController();
    setAbortController(abort);
    
    out('Đang kết nối API Proxy qua /api/ai-stream... Đang chờ tín hiệu đường truyền...\n\n[Đang chờ token đầu tiên]');
    await new Promise(resolve => setTimeout(resolve, 30));

    let full = "";
    try {
      await callAIStream({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: getSystemPromptForMode(format),
        profileOverride: apiProfile,
        maxTokensOverride: Math.max(apiProfile?.maxTokens || 131072, 131072),
        signal: abort.signal,
        onToken: (chunk) => {
           full += chunk;
           const cleanedStream = cleanGeneratedPromptText(full);
           out(cleanedStream);
           if (full.length % 240 < chunk.length) {
             updateRun(run.id, { content: cleanedStream, status: "streaming" });
           }
        },
        onDone: (finalContent) => {
           const finalStr = cleanGeneratedPromptText((finalContent || "").trim() || "API trả về rỗng.");
           out(finalStr);
           updateRun(run.id, { content: finalStr, status: finalStr.trim() ? "done" : "empty" });
        },
        onError: (err) => {
           const errMsg = "Lỗi khi gọi API.\nLý do: " + err + "\n\nPrompt gửi đi:\n\n" + prompt;
           out(errMsg);
           updateRun(run.id, { content: errMsg, status: "error" });
        }
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
         const abortedMsg = "Đã ngắt stream thủ công.\n\nNội dung tới thời điểm ngắt:\n" + full;
         out(abortedMsg);
         updateRun(run.id, { content: abortedMsg, status: "aborted" });
      } else {
         const err = "Không gọi được API thật trong bản preview/local.\nLý do: " + e.message + "\n\nPrompt gửi đi:\n\n" + prompt;
         out(err);
         updateRun(run.id, { content: err, status: "error" });
      }
    } finally {
      setAbortController(null);
    }
  };


  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const items = await processImportedFiles(files);
    const updated = { ...activeStory };
    updated.context.files = [...(updated.context.files || []), ...items];
    await handleUpdateStory(updated);
    showToast("Đã import file vào riêng truyện này.");
  };

  const handleTestApi = async () => {
    setHomeOutput("⏳ Đang kết nối API Proxy... Đang chờ tín hiệu đường truyền...");
    await new Promise(resolve => setTimeout(resolve, 30));
    await checkApi();
    
    const requestText = `This is a quick API Proxy test from Prompt Markdown Smart Context Studio.
Please return the following confirmation in a short response:

API_PROXY_TEST_OK
Received:
- Feature: Prompt Markdown Smart Context Studio
- Mode: Quick API Test
- Story State: Empty
- Role: Professional Prompt Architect
- Output System: Ready`;

    const prompt = buildFinalContextWindow("quick_api_test", requestText, null);

    const run = await createRun("api_test", prompt, "connecting", "Đang kết nối API Proxy...");
    setHomeOutput(`${run.title}\n\nĐang gửi request tới API Proxy...`);

    if (!apiProfile) {
      const fallback = "Chưa có API chính. Vui lòng vào Cài Đặt API Proxy để thiết lập API trước.";
      setHomeOutput(fallback);
      updateRun(run.id, { content: fallback, status: "needs-api" });
      return;
    }

    const abort = new AbortController();
    setAbortController(abort);
    
    setHomeOutput('Đang kết nối API Proxy... Đang chờ tín hiệu đường truyền...\n\n[Đang chờ token đầu tiên]');
    await new Promise(resolve => setTimeout(resolve, 30));

    let full = "";
    try {
      await callAIStream({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "You are an API connection test responder. Return only the requested test confirmation. Do not greet. Do not explain. Do not ask questions.",
        profileOverride: apiProfile,
        signal: abort.signal,
        onToken: (chunk) => {
           if (full.length === 0) {
             setHomeOutput('Đã nhận token đầu tiên...\n\n' + chunk);
           } else {
             setHomeOutput(full + chunk);
           }
           full += chunk;
           if (full.length % 50 < chunk.length) {
             updateRun(run.id, { content: full, status: "streaming" });
           }
        },
        onDone: (finalContent) => {
           const finalStr = cleanGeneratedPromptText(finalContent.trim());
           if (!finalStr) {
             const emptyMsg = "API đã kết nối nhưng không có nội dung trả về.";
             setHomeOutput(emptyMsg);
             updateRun(run.id, { content: emptyMsg, status: "empty" });
           } else {
             const successMsg = `API Proxy hoạt động. Tính năng này đã nhận được dữ liệu từ AI model.\n\nKết quả trả về:\n${finalStr}`;
             setHomeOutput(successMsg);
             updateRun(run.id, { content: finalStr, status: "done" });
           }
        },
        onError: (err) => {
           const errMsg = "Lỗi khi gọi API.\nLý do: " + err;
           setHomeOutput(errMsg);
           updateRun(run.id, { content: errMsg, status: "error" });
        }
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
         const abortedMsg = "Đã ngắt stream thủ công.\n\nNội dung tới thời điểm ngắt:\n" + full;
         setHomeOutput(abortedMsg);
         updateRun(run.id, { content: abortedMsg, status: "aborted" });
      } else {
         const err = "Không gọi được API thật. Lỗi: " + e.message;
         setHomeOutput(err);
         updateRun(run.id, { content: err, status: "error" });
      }
    } finally {
      setAbortController(null);
    }
  };

  const timeLabel = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  if (!active) return null;

  return (
    <div className={`pmsl-wrapper ${wallpaper ? "hasWallpaper" : ""}`}>
      {wallpaper && <img className="wallpaper" src={wallpaper} alt="" style={{display: 'block', position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0, opacity: 1, visibility: 'visible', pointerEvents: 'none', filter: 'saturate(1.06) brightness(1.03) contrast(1.02)'}} />}
      
      <div className="pmsl-app" id="app">
        <button className="btn soft" onClick={onHome} style={{position: 'fixed', top: '16px', right: '16px', zIndex: 9999, fontSize: '13px', fontWeight: 800, padding: '8px 14px', background: '#ffebee', color: '#c62828', border: '1px solid #e96b9b', borderRadius: '999px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}}>🏠 Thoát ra Home</button>
        {view === "library" && (
           <LibraryView 
             stories={stories} 
             activeStory={activeStory} 
             time={time} 
             battery={batteryLevel}
             onSelect={(id) => setActiveStoryId(id)}
             onCreate={handleCreateStory}
             onDuplicate={handleDuplicateStory}
             onDelete={handleDeleteStory}
             onUpdateStory={handleUpdateStory}
             onWallpaperChange={handleWallpaperChange}
             onOpenStudio={() => setView("studio")}
             showToast={showToast}
           />
        )}
        
        {view === "studio" && (
           <StudioView 
             story={activeStory}
             time={time}
             battery={batteryLevel}
             apiProfile={apiProfile}
             runs={runs}
             homeOutput={homeOutput}
             setHomeOutput={setHomeOutput}
             onCheckApi={checkApi}
             onTestApi={handleTestApi}
             onBack={() => setView("library")}
             onOpenRoom={(i) => { setCurrentRoom(i); setView("room"); }}
             onUpdateStory={handleUpdateStory}
             onMerge={() => mergeContext()}
             onCallAll={() => callProxy(true)}
             onFiles={handleFiles}
             onClearFiles={() => handleUpdateStory({...activeStory, context: {...activeStory.context, files: []}})}
             onCreateBlankRun={async () => {
                const r = await createRun("manual", "", "blank", "");
                setHomeOutput(`Đã tạo ${r.title} trong truyện "${activeStory.title}".`);
             }}
             onClearRuns={async () => {
                if (confirm("Xóa các đợt API của riêng truyện này?")) {
                  await dbClearRunsByStory(activeStory.id);
                  setRuns([]);
                }
             }}
             timeLabel={timeLabel}
             contextMode={contextMode}
             onContextModeChange={(mode) => {
               setContextMode(mode);
               showToast(`Đã chuyển sang chế độ: ${mode.toUpperCase()}`);
               if (mode === "preview") {
                 const previewPrompt = buildFinalContextWindow("preview", "Xem trước cấu trúc Context Window và Quality Gate", activeStory, false, "", "markdown", "cold-technical", getStoryRoomTasks(activeStory, currentRoom));
                 setHomeOutput(`=== [DEBUG CONTEXT PREVIEW] ===\nChế độ hiển thị trước (Không gọi API Proxy)\n\n${previewPrompt}`);
               }
             }}
             outputMode={outputMode}
             onOutputModeChange={(mode) => {
               setOutputMode(mode);
               showToast(`Đã chuyển Output Mode: ${mode.toUpperCase()}`);
             }}
             promptLanguage={promptLanguage}
             onPromptLanguageChange={(lang) => {
               setPromptLanguage(lang);
               showToast(`Đã chọn ngôn ngữ Prompt: ${lang.toUpperCase()}`);
             }}
           showToast={showToast}
            />
        )}
        
        {view === "room" && (
           <PromptMarkdownRoomScreen 
             story={activeStory}
             roomIndex={currentRoom}
             runs={runs.filter(r => r.scope === "all" || r.roomIndex === currentRoom)}
             onBack={() => setView("studio")}
             customTasks={getStoryRoomTasks(activeStory, currentRoom)}
             onUpdateCustomTasks={(newTasks) => {
               if (!activeStory) return;
               const updatedRooms = { ...(activeStory.context?.rooms || {}) };
               updatedRooms[currentRoom] = newTasks;
               handleUpdateStory({
                 ...activeStory,
                 context: {
                   ...activeStory.context,
                   rooms: updatedRooms
                 }
               });
             }}
             onCallRoom={(note, format, strict, selected) => callProxy(false, note, format, strict, selected, (val) => {
                 const el = document.getElementById("roomOutput");
                 if (el) el.textContent = val;
             })}
             onPreview={(note, format, strict, selected) => {
                 const prompt = buildFinalContextWindow("preview", "Preview prompt markdown cho phòng hiện tại", activeStory, false, note, format, strict, selected);
                 const el = document.getElementById("roomOutput");
                 if (el) el.textContent = prompt;
                 showToast("Đã dựng prompt phòng hiện tại.");
             }}
             onAbort={() => {
                 if (abortController) {
                     abortController.abort();
                     showToast("Đã ngắt stream thủ công.");
                 }
             }}
             onCreateBlankRun={async () => {
                const r = await createRun("room", "", "blank", "");
                const el = document.getElementById("roomOutput");
                if (el) el.textContent = `Đã tạo ${r.title} trong truyện "${activeStory.title}".`;
             }}
             timeLabel={timeLabel}
             outputMode={outputMode}
             onOutputModeChange={(mode) => {
               setOutputMode(mode);
               showToast(`Đã chuyển Output Mode: ${mode.toUpperCase()}`);
             }}
             promptLanguage={promptLanguage}
             onPromptLanguageChange={(lang) => {
               setPromptLanguage(lang);
               showToast(`Đã chọn ngôn ngữ Prompt: ${lang.toUpperCase()}`);
             }}
           showToast={showToast}
            />
        )}
      </div>

      <div className={`toast ${toastMsg ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}

// I will extract LibraryView and StudioView to separate files for maintainability.
