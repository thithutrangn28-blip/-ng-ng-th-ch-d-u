import React, { useState, useRef, useEffect } from "react";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { PRESET_BACKGROUNDS } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { v4 as uuidv4 } from "uuid";
import StyleAnalyzer from "./StyleAnalyzer";

function PromptFivePartsViewer({ output, toast, isApiRunning, cardTitle }: { output: string; toast: any; isApiRunning: boolean; cardTitle: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const rawText = (output || "").trim();

  // 1. Bản Prompt liền mạch (One-line / Paragraph) sạch tiêu đề để dán vào Midjourney/SD không lỗi cú pháp
  const cleanOneLinePrompt = rawText
    .replace(/(?:^|\n)###\s*[^\n]*/g, " ")
    .replace(/(?:^|\n)\*\*\s*(?:PART|PHẦN)\s*\d+[^\n]*/gi, " ")
    .replace(/(?:^|\n)(?:PART|PHẦN)\s*\d+:[^\n]*/gi, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 2. Bóc tách thành 5 phần theo tiêu đề ### hoặc **PART...
  const partRegex = /(?:^|\n)###\s*(.*?)(?=(?:\n###\s*|\n---|\n\*\*\*|$))/gs;
  let matches = [...rawText.matchAll(partRegex)];

  // Fallback nếu AI dùng **PART 1:...** hoặc chưa dùng ###
  if (matches.length === 0) {
    const altRegex = /(?:^|\n)(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*(\d+[^:\n]*?:?)(.*?)(?=(?:\n(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*\d+|\n---|$))/gsi;
    const altMatches = [...rawText.matchAll(altRegex)];
    if (altMatches.length > 0) {
      matches = altMatches.map(m => [m[0], `PART ${m[1]}\n${m[2]}`] as any);
    }
  }

  const parts: { title: string; subtitle: string; content: string; icon: string; id: string; color: string; bg: string }[] = [];

  if (matches.length > 0) {
    matches.forEach((m, idx) => {
      const firstLineEnd = m[1].indexOf('\n');
      const fullHeader = firstLineEnd !== -1 ? m[1].slice(0, firstLineEnd).trim() : m[1].trim();
      const content = firstLineEnd !== -1 ? m[1].slice(firstLineEnd).trim() : "";

      let icon = "✨";
      let subtitle = "Mô tả chi tiết thẩm mỹ";
      let color = "#d23a73";
      let bg = "rgba(210, 58, 115, 0.05)";

      if (fullHeader.match(/part\s*1|subject|pose|nhân vật|kiểu dáng/i) || idx === 0) {
        icon = "🧑";
        subtitle = "Nhân vật, cử chỉ tạo dáng & ngôn ngữ cơ thể (Bám sát 85%-95% ảnh)";
        color = "#c2185b";
        bg = "rgba(194, 24, 91, 0.05)";
      } else if (fullHeader.match(/part\s*2|outfit|styling|trang phục|chất liệu/i) || idx === 1) {
        icon = "👗";
        subtitle = "Trang phục silhouette, chất liệu vải & phụ kiện đi kèm";
        color = "#8e24aa";
        bg = "rgba(142, 36, 170, 0.05)";
      } else if (fullHeader.match(/part\s*3|environment|background|bối cảnh|không gian/i) || idx === 2) {
        icon = "🌌";
        subtitle = "Không gian bối cảnh, kiến trúc, thiên nhiên & chiều sâu";
        color = "#1976d2";
        bg = "rgba(25, 118, 210, 0.05)";
      } else if (fullHeader.match(/part\s*4|lighting|color|atmosphere|ánh sáng|màu sắc/i) || idx === 3) {
        icon = "💡";
        subtitle = "Ánh sáng direction, bảng màu chủ đạo & chất cảm bầu không khí";
        color = "#e65100";
        bg = "rgba(230, 81, 0, 0.05)";
      } else if (fullHeader.match(/part\s*5|camera|angle|perspective|composition|góc chụp|thị giác/i) || idx === 4) {
        icon = "📸";
        subtitle = "Góc chụp (low/high/eye), tiêu cự, depth of field & bố cục thị giác";
        color = "#00897b";
        bg = "rgba(0, 137, 123, 0.05)";
      } else {
        icon = `🔹`;
        subtitle = `Phần ${idx + 1} trong cấu trúc Prompt`;
      }

      parts.push({
        title: fullHeader || `Phần ${idx + 1}`,
        subtitle,
        content: content || (isApiRunning ? "⏳ Đang stream tiếp nội dung phần này..." : ""),
        icon,
        id: `part_${idx + 1}`,
        color,
        bg
      });
    });
  }

  const handleCopyPart = (contentToCopy: string, label: string) => {
    const text = contentToCopy.trim();
    if (!text) {
      toast?.("Phần này chưa có nội dung!", "error");
      return;
    }
    navigator.clipboard?.writeText(text);
    toast?.(`💖 Vợ ơi, chồng đã copy xong ${label}!`, "success");
  };

  const handleCopyOneLine = () => {
    if (!cleanOneLinePrompt) {
      toast?.("Chưa có nội dung Prompt để copy vợ ơi!", "error");
      return;
    }
    navigator.clipboard?.writeText(cleanOneLinePrompt);
    toast?.("⚡ Chồng đã copy trọn bộ Prompt gộp liền mạch cho vợ dán thẳng vào Midjourney/SD/Flux nhé!", "success");
  };

  const handleCopyFullText = () => {
    if (!rawText) {
      toast?.("Chưa có văn bản để copy vợ ơi!", "error");
      return;
    }
    navigator.clipboard?.writeText(rawText);
    toast?.("📑 Chồng đã copy trọn văn bản chia 5 phần có tiêu đề cho vợ!", "success");
  };

  return (
    <div className="flex flex-col gap-3 w-full mt-2">
      {/* THANH CÔNG CỤ COPY ANH TÀI - SIÊU TIỆN LỢI CHO VỢ */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-[#f48fb1]/30 bg-gradient-to-r from-[#fff0f6] to-[#fce4ec] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-bounce">💖</span>
          <div>
            <div className="text-xs font-bold text-[#b83260] uppercase tracking-wider">
              Prompt hoàn chỉnh chia 5 phần chuẩn chỉnh
            </div>
            <div className="text-[11px] text-gray-600">
              Vợ có thể sao chép riêng từng phần bên dưới hoặc copy gộp liền mạch dán vào AI
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyOneLine}
            disabled={!cleanOneLinePrompt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#d23a73] to-[#e64a19] text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            title="Copy toàn bộ nội dung đã gạt bỏ tiêu đề, liền mạch 1 đoạn văn để dán thẳng vào Midjourney/SD/Flux"
          >
            <span>⚡ Copy Gộp Liền Mạch (Dùng Ngay)</span>
          </button>
          <button
            onClick={handleCopyFullText}
            disabled={!rawText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#f48fb1] text-[#b83260] font-semibold text-xs hover:bg-[#fff0f6] active:scale-95 transition-all disabled:opacity-50"
          >
            <span>📑 Copy Văn Bản 5 Phần</span>
          </button>
        </div>
      </div>

      {/* DANH SÁCH 5 THẺ KHỐI PROMPT */}
      {parts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {parts.map((part, index) => (
            <div
              key={part.id}
              className="relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-sm"
              style={{
                borderColor: `${part.color}40`,
                backgroundColor: part.bg
              }}
            >
              {/* Header của từng thẻ khối */}
              <div
                className="flex items-center justify-between px-3.5 py-2.5 border-b"
                style={{
                  borderColor: `${part.color}25`,
                  backgroundColor: `${part.color}10`
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg select-none shrink-0">{part.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: part.color }}>
                      {part.title}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium truncate">
                      {part.subtitle}
                    </div>
                  </div>
                </div>

                {/* Nút copy riêng phần này */}
                <button
                  onClick={() => handleCopyPart(part.content, `[Phần ${index + 1}: ${part.title.replace(/###|\*|PART \d+:/gi, "").trim()}]`)}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-[11px] shadow-xs transition-all active:scale-95 hover:brightness-110 ml-2 text-white"
                  style={{ backgroundColor: part.color }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Phần {index + 1}</span>
                </button>
              </div>

              {/* Nội dung của phần đó */}
              <div className="p-3.5 font-mono text-xs text-gray-800 leading-relaxed whitespace-pre-wrap bg-white/70">
                {part.content ? (
                  part.content
                ) : (
                  <span className="text-gray-400 italic">⏳ Đang đợi AI sinh nội dung phần này...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FALLBACK: Khi AI trả về văn bản thường chưa có thẻ ### (đang stream những chữ đầu tiên hoặc format khác) */
        <div className="relative flex flex-col rounded-xl border border-[#f48fb1]/40 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-[#b83260] flex items-center gap-1.5">
              <span>✨ Nội dung Prompt đang hiển thị nguyên văn:</span>
            </span>
            <button
              onClick={() => handleCopyPart(rawText, "Toàn bộ Prompt")}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#d23a73] text-white text-xs font-bold hover:bg-[#b83260] active:scale-95"
            >
              <span>📋 Copy Ngay</span>
            </button>
          </div>
          <div className="font-mono text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
            {rawText || (isApiRunning ? "⏳ AI đang bắt đầu viết Prompt..." : "Chưa có nội dung.")}
          </div>
        </div>
      )}

      {/* Nút bật tắt chế độ xem văn bản gốc đầy đủ */}
      <div className="flex items-center justify-end mt-1">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[11px] font-semibold text-gray-400 hover:text-[#d23a73] underline transition-colors"
        >
          {showRaw ? "▲ Ẩn hộp văn bản gốc (Raw Text)" : "▼ Xem hộp văn bản gốc (Raw Text) để sửa thủ công"}
        </button>
      </div>

      {showRaw && (
        <div className="mt-1">
          <textarea
            value={rawText}
            readOnly
            rows={8}
            className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#d23a73]"
            placeholder="Văn bản gốc AI sinh ra..."
          />
        </div>
      )}
    </div>
  );
}

export default function RoomView({ roomDef, roomState, currentStory, state, save, toast, onBack, onHome, onOpenDrawer, progress, setProgress, isCompactHeader, onToggleCompact }: any) {
  const [showPreset, setShowPreset] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visualTarget, setVisualTarget] = useState<"cover" | "avatar" | "background" | null>(null);
  const [selectedHistoryPayload, setSelectedHistoryPayload] = useState<any>(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [showImageReviewPanel, setShowImageReviewPanel] = useState(false);
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [previewTab, setPreviewTab] = useState<'human' | 'json'>('human');
  const [selectedFileDetail, setSelectedFileDetail] = useState<any>(null);
  const [selectedImgDetail, setSelectedImgDetail] = useState<any>(null);
  const [showDebugSignals, setShowDebugSignals] = useState(false);
  const [apiSignals, setApiSignals] = useState<{
    requestStarted: boolean;
    contextBuilt: boolean;
    apiRequestSent: boolean;
    responseStarted: boolean;
    firstChunkReceived: boolean;
    chunksReceived: number;
    charactersReceived: number;
    estimatedTokensReceived: number;
    lastChunkAt: string | null;
    elapsedSeconds: number;
    streaming: boolean;
    completed: boolean;
    error: string | null;
    stage: 'idle' | 'preparing_context' | 'reading_references' | 'connecting_api' | 'first_response' | 'streaming' | 'parsing_result' | 'saving' | 'done';
    stageLabel: string;
    stageDetail: string;
  }>({
    requestStarted: false,
    contextBuilt: false,
    apiRequestSent: false,
    responseStarted: false,
    firstChunkReceived: false,
    chunksReceived: 0,
    charactersReceived: 0,
    estimatedTokensReceived: 0,
    lastChunkAt: null,
    elapsedSeconds: 0,
    streaming: false,
    completed: false,
    error: null,
    stage: 'idle',
    stageLabel: '',
    stageDetail: ''
  });

  // Non-blocking streaming buffer refs and UI state
  const streamBufferRef = useRef<string>("");
  const lastFlushTimeRef = useRef<number>(0);
  const flushTimerRef = useRef<any>(null);
  const chunksCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const firstChunkReportedRef = useRef<boolean>(false);
  const [livePreviewText, setLivePreviewText] = useState<string>("");
  const [autoScrollPreview, setAutoScrollPreview] = useState<boolean>(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [isApiRunning, setIsApiRunning] = useState<boolean>(false);
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const rootEl = document.querySelector('.lipstick-root');
    if (rootEl) {
      if (isApiRunning) rootEl.classList.add('is-api-running');
      else rootEl.classList.remove('is-api-running');
    }
  }, [isApiRunning]);

  useEffect(() => {
    if (autoScrollPreview && previewScrollRef.current) {
      previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
    }
  }, [livePreviewText, autoScrollPreview]);

  useEffect(() => {
    let timer: any;
    if (apiSignals.requestStarted && !apiSignals.completed && !apiSignals.error) {
      timer = setInterval(() => {
        setApiSignals(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [apiSignals.requestStarted, apiSignals.completed, apiSignals.error]);

  const buildContextPayload = () => {
    const rs = roomState;
    const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
    const target = rs.targetMode || 'bot';
    const cards = roomDef.cards || [];
    
    const botCharactersList = currentStory.botCharacters && currentStory.botCharacters.length > 0
      ? currentStory.botCharacters
      : (currentStory.botProfiles ? [{
          characterId: "bot_01",
          displayName: "Bot Char",
          profileText: currentStory.botProfiles,
          referenceImages: []
        }] : []);

    const botCharsFormatted = botCharactersList
      .map((c: any, i: number) => `[Bot Char #${i+1}: ${c.displayName || 'Unnamed'}]\n${c.profileText}`)
      .join("\n\n---\n\n");

    const manualInput = {
      storyText: currentStory.story || "",
      userProfile: currentStory.userProfile || "",
      botProfiles: currentStory.botProfiles || botCharsFormatted,
      botCharacters: botCharactersList,
      sideCharacters: currentStory.sideCharacters || "",
      imageRequirements: currentStory.requirements || ""
    };

    const importedFiles = (currentStory.files || []).map((f: any) => ({
      fileId: f.fileId || f.id,
      fileName: f.fileName || f.name,
      mimeType: f.mimeType || f.type,
      parserStatus: f.parserStatus || 'parsed',
      fileSizeBytes: f.fileSizeBytes || f.size || 0,
      fileSizeReadable: f.fileSizeReadable || `${Math.round((f.size || 0)/1024)} KB`,
      characterCount: f.characterCount || (f.text || "").length,
      wordCount: f.wordCount || (f.text || "").trim().split(/\s+/).length,
      estimatedTokenCount: f.estimatedTokenCount || Math.ceil((f.text || "").length / 3.5),
      extractedText: f.extractedText || f.text || "",
      summary: f.summary
    }));

    const manualChars = Object.values(manualInput).join(" ").length;
    const manualWords = Object.values(manualInput).join(" ").trim().split(/\s+/).length;
    const filesChars = importedFiles.reduce((acc: number, f: any) => acc + (f.characterCount || 0), 0);
    const filesWords = importedFiles.reduce((acc: number, f: any) => acc + (f.wordCount || 0), 0);

    const saRefs = (sa.refs || []).map((r: any) => ({
      imageId: r.imageId || r.id || uuidv4(),
      storyId: currentStory.id,
      roomId: roomDef.id,
      roomTitle: roomDef.title,
      cardId: "style_analyzer",
      cardTitle: "Style Analyzer (DNA Thẩm mỹ & Nét vẽ)",
      imageType: "style_analyzer_reference",
      fileName: r.fileName || r.name || "style_ref.png",
      purpose: "style_reference (phong cách tổng thể, nét vẽ, màu sắc, render)",
      mimeType: r.mimeType || r.type || "image/png",
      fileSizeBytes: r.fileSizeBytes || r.size || 0,
      previewUrl: r.previewUrl || r.data,
      storageUrl: r.storageUrl || r.data,
      analysisStatus: r.analysisStatus || (r.imageAnalysisText ? 'analyzed' : 'pending'),
      imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích",
      imageAnalysisJson: r.imageAnalysisJson || null
    }));

    const workCards = cards.map((c: any) => {
      const cs = rs.cards[c.id] || { note: "", refs: [], output: "" };
      const cRefs = (cs.refs || []).map((r: any) => {
        let purp = `${c.id}_reference (${c.desc || c.title})`;
        const idLower = (c.id || "").toLowerCase();
        const titleLower = (c.title || "").toLowerCase();
        if (idLower.includes('hair') || titleLower.includes('tóc')) purp = "hair_reference (kiểu tóc, màu tóc, độ dài, mái)";
        else if (idLower.includes('pose') || titleLower.includes('dáng') || titleLower.includes('pose')) purp = "pose_reference (tư thế, góc máy, chuyển động)";
        else if (idLower.includes('outfit') || titleLower.includes('trang phục') || titleLower.includes('áo') || titleLower.includes('dada') || titleLower.includes('outfit')) purp = "outfit_reference (trang phục, chất liệu, phụ kiện)";
        else if (idLower.includes('face') || idLower.includes('mat') || titleLower.includes('mặt') || titleLower.includes('khuôn mặt')) purp = "face_reference (phong cách vẽ mặt, makeup, biểu cảm)";
        else if (idLower.includes('bg') || idLower.includes('background') || titleLower.includes('bối cảnh') || titleLower.includes('nền')) purp = "background_reference (bối cảnh, không gian, ánh sáng)";

        return {
          imageId: r.imageId || r.id || uuidv4(),
          storyId: currentStory.id,
          roomId: roomDef.id,
          roomTitle: roomDef.title,
          cardId: c.id,
          cardTitle: c.title,
          imageType: `${c.id}_reference`,
          fileName: r.fileName || r.name || "card_ref.png",
          purpose: r.purpose || purp,
          mimeType: r.mimeType || r.type || "image/png",
          fileSizeBytes: r.fileSizeBytes || r.size || 0,
          previewUrl: r.previewUrl || r.data,
          storageUrl: r.storageUrl || r.data,
          analysisStatus: r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending'),
          imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích",
          imageAnalysisJson: r.imageAnalysisJson || null
        };
      });

      return {
        cardId: c.id,
        title: c.title,
        purpose: c.desc,
        quickKeywords: c.quick,
        userNote: cs.note || "",
        referenceImages: cRefs
      };
    });

    const botCharRefs = botCharactersList.flatMap((c: any, idx: number) => (c.referenceImages || []).map((r: any) => ({
      imageId: r.id || r.imageId || uuidv4(),
      storyId: currentStory.id,
      roomId: roomDef.id,
      roomTitle: roomDef.title,
      cardId: `bot_profile_${c.id || idx + 1}`,
      cardTitle: `Hồ sơ Bot Char: ${c.displayName || 'Unnamed'}`,
      imageType: "bot_character_reference",
      fileName: r.name || r.fileName || "bot_ref.png",
      purpose: "bot_character_reference (khí chất, tạo hình đặc trưng, độ tuổi thị giác)",
      mimeType: r.mimeType || r.type || "image/png",
      fileSizeBytes: r.fileSizeBytes || r.size || 0,
      previewUrl: r.previewUrl || r.data,
      storageUrl: r.storageUrl || r.data,
      analysisStatus: r.analysisStatus || 'analyzed',
      imageAnalysisText: r.imageAnalysisText || r.analysisResult || `Ảnh tham chiếu riêng cho nhân vật ${c.displayName || 'Bot Char'}`,
      imageAnalysisJson: r.imageAnalysisJson || null
    })));

    const allImages = [...saRefs, ...botCharRefs, ...workCards.flatMap((c: any) => c.referenceImages)];
    const analyzedImages = allImages.filter((img: any) => img.analysisStatus === 'analyzed');
    const totalTokensEst = Math.ceil((manualChars + filesChars) / 3.5) + (allImages.length * 250);

    const referenceImageManifest = allImages.map((img: any) => ({
      storyId: img.storyId,
      roomId: img.roomId,
      roomTitle: img.roomTitle || roomDef.title,
      cardId: img.cardId,
      cardTitle: img.cardTitle || img.cardId,
      imageId: img.imageId,
      fileName: img.fileName,
      purpose: img.purpose || "reference_image",
      analysisStatus: img.analysisStatus,
      imageAnalysisText: img.imageAnalysisText
    }));

    return {
      feature: "Lipstick Prompt Rooms",
      task: "write_image_prompt",
      apiMode: "use_existing_app_api_settings",
      referenceImageManifest,
      currentStory: {
        storyId: currentStory.id,
        title: currentStory.title,
        cover: currentStory.cover,
        avatar: currentStory.avatar,
        manualInput,
        importedFiles
      },
      currentRoom: {
        roomId: roomDef.id,
        roomTitle: roomDef.title,
        roomPurpose: roomDef.subtitle
      },
      selectedTarget: {
        mode: target,
        label: target === 'bot' ? 'Bot char' : target === 'user' ? '{{user}}' : 'Couple',
        keywords: target === 'bot' ? 'focus on bot character' : target === 'user' ? 'focus on user character' : 'focus on both characters couple interaction'
      },
      styleAnalyzer: {
        analysisStatus: saRefs.length > 0 ? (saRefs.every((r: any) => r.analysisStatus === 'analyzed') ? 'analyzed' : 'pending') : 'empty',
        selectedStyles: (sa.selected || []).map((k: string) => ({
          styleId: k,
          styleName: k.split("|||")[1] || k,
          group: k.split("|||")[0] || ""
        })),
        referenceImages: saRefs
      },
      workCards,
      mergedStoryContext: {
        sourceOrder: ["manualInput", "importedFiles"],
        finalStoryContext: `=== 1. MANUAL STORY & CHARACTERS ===\nPlot: ${manualInput.storyText}\nUser Profile: ${manualInput.userProfile}\nBot Characters (${botCharactersList.length}):\n${botCharsFormatted}\nSide Characters: ${manualInput.sideCharacters}\nRequirements: ${manualInput.imageRequirements}\n\n=== 2. IMPORTED FILES (${importedFiles.length} files) ===\n${importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus}]\n${f.summary ? `Summary: ${f.summary}\n` : ""}${f.extractedText}`).join("\n\n---\n\n")}`
      },
      contextStats: {
        manualCharacterCount: manualChars,
        manualWordCount: manualWords,
        filesCount: importedFiles.length,
        filesTotalCharacters: filesChars,
        filesTotalWords: filesWords,
        imagesCount: allImages.length,
        analyzedImagesCount: analyzedImages.length,
        estimatedTotalTokens: totalTokensEst
      },
      negativePromptGuard: "bad hands, mutated anatomy, extra limbs, blurry, watermark, text, low resolution, distorted faces, bad eyes",
      outputRequirement: "Return final copy-ready image prompt only."
    };
  };

  const handleVisualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && visualTarget) {
      const reader = new FileReader();
      reader.onload = () => {
        const rs = { ...roomState };
        rs[visualTarget] = reader.result as string;
        currentStory.rooms[roomDef.id] = rs;
        save(state);
        toast("Đã cập nhật hình ảnh phòng.");
      };
      reader.readAsDataURL(file);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const getAllRoomImages = () => {
    const rs = roomState;
    const list: any[] = [];
    if (rs.styleAnalyzer?.refs) {
      rs.styleAnalyzer.refs.forEach((r: any) => {
        list.push({
          ...r,
          cardId: 'style_analyzer',
          cardTitle: 'Style Analyzer (Nét vẽ & Phong cách)',
          analysisStatus: r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending'),
          imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích"
        });
      });
    }
    for (const c of roomDef.cards || []) {
      const cs = rs.cards[c.id];
      if (cs?.refs) {
        cs.refs.forEach((r: any) => {
          list.push({
            ...r,
            cardId: c.id,
            cardTitle: c.title,
            analysisStatus: r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending'),
            imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích"
          });
        });
      }
    }
    const botChars = currentStory.botCharacters || [];
    botChars.forEach((bc: any) => {
      if (bc.referenceImages) {
        bc.referenceImages.forEach((r: any) => {
          list.push({
            ...r,
            cardId: 'bot_character_ref',
            cardTitle: `Bot Char: ${bc.displayName || 'Unnamed'}`,
            analysisStatus: r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending'),
            imageAnalysisText: r.imageAnalysisText || r.analysisResult || `Ảnh tham chiếu nhân vật ${bc.displayName}`
          });
        });
      }
    });
    return list;
  };

  const analyzeSingleImage = async (imgRef: any, cardId: string, cardTitle: string) => {
    toast(`⏳ Đang phân tích AI Vision cho ảnh: ${imgRef.name || imgRef.fileName}...`);
    const rs = { ...roomState };
    
    let targetRef: any = null;
    if (cardId === 'style_analyzer' && rs.styleAnalyzer?.refs) {
      targetRef = rs.styleAnalyzer.refs.find((x: any) => (x.id || x.imageId) === (imgRef.id || imgRef.imageId));
    } else if (rs.cards[cardId]?.refs) {
      targetRef = rs.cards[cardId].refs.find((x: any) => (x.id || x.imageId) === (imgRef.id || imgRef.imageId));
    }
    if (!targetRef) targetRef = imgRef;

    targetRef.analysisStatus = 'analyzing';
    currentStory.rooms[roomDef.id] = rs;
    save(state);

    try {
      const sysPrompt = `You are the professional vision analysis module inside Lipstick Prompt Rooms.
You MUST analyze and extract the visual traits from this reference image to support downstream AI image generation under the core rule: "High Reference Fidelity, Transformative Adaptation (85%–95% aesthetic, camera perspective, framing, pose & style fidelity; only transformative adaptation for story character facial identity)":
CRITICAL RULE: The reference image is used to learn visual language and aesthetic DNA (art style, rendering, mood, line quality, lighting, color palette, outfit spirit, composition rhythm, EXACT CAMERA ANGLE, PERSPECTIVE, FRAMING, DEPTH OF FIELD, and EXACT BODY POSE / STANCE / GESTURE). You MUST strictly preserve camera shot, perspective, depth of field, framing, pose, silhouette, and gesture! You MUST ONLY replace the real-world face/identity with the user story's character profile!

You MUST analyze and extract these mandatory layers:
1. Nhận diện thẩm mỹ tổng thể (giới tính trình bày, độ tuổi thị giác, khí chất thẩm mỹ, độ mềm/sắc/lạnh/ngọt/sang)
2. Phong cách vẽ & Chất cọ / texture / rendering (watercolor, manhua fantasy, soft ink-wash, oil painting, digital anime..., độ mềm của line, độ loang màu, độ trong mờ)
3. Bảng màu chính & Ánh sáng (nhiệt độ màu, độ bão hòa, độ tương phản, hướng sáng, pastel / dark / ethereal / warm)
4. Mood / Khí chất / Không khí thị giác (ethereal, poetic, dreamy, quiet, floral, regal, retro, dark...)
5. Motif hình ảnh (hoa, sen, nước, ruy băng, khung trang trí, thiên nhiên, gió, khói...)
6. Trang phục / Outfit Fidelity (tinh thần trang phục, form dáng silhouette, độ rủ, lớp layer, mật độ chi tiết, cảm giác chất liệu, trim/lace/ribbon/embroidery tendencies, elegance/fantasy level)
7. Góc chụp & Thị giác / Camera & Perspective Fidelity (eye-level, low-angle, high-angle, Dutch tilt, cinematic close-up, medium shot, wide establishing shot, focal length feel, depth of field, bokeh, spatial layering)
8. Kiểu dáng & Cử chỉ / Pose & Gesture Fidelity (dáng đứng/ngồi/tạo dáng, độ nghiêng đầu, cử chỉ tay, thần thái cơ thể, hướng ánh mắt, vị trí không gian của nhân vật trong khung hình)
9. Bố cục thị giác / Composition Fidelity (visual hierarchy, focal structure, eye-flow/visual path, negative space rhythm, directional movement của tóc/vải/light)
10. Reference Fidelity Breakdown (Những chi tiết bắt buộc giữ 85%-95%: góc chụp, thị giác, kiểu dáng pose, màu sắc, phong cách, trang phục; và những chi tiết thay đổi: chỉ khuôn mặt/danh tính nhân vật theo truyện)

Return ONLY valid JSON with this exact schema:
{
  "imageId": "${targetRef.imageId || targetRef.id || uuidv4()}",
  "storyId": "${currentStory.id}",
  "roomId": "${roomDef.id}",
  "cardId": "${cardId}",
  "imageType": "${cardId}_reference",
  "analysisStatus": "analyzed",
  "summary": "Tóm tắt Aesthetic, Camera Perspective & Pose DNA theo quy tắc High Reference Fidelity bằng tiếng Việt",
  "visualStyleExtracted": "Chi tiết phong cách vẽ, medium texture, chất cọ, độ loang, cổ phong/manhua/anime/semi-realistic...",
  "colorPaletteExtracted": "Bảng màu chính, màu điểm nhấn, độ trong/mờ, nhiệt độ màu, ánh sáng",
  "lineAndRenderExtracted": "Độ mềm/clean của nét line, kỹ thuật shading, độ bóng, translucent washes...",
  "moodExtracted": "Không khí thị giác tổng thể, vibe cảm xúc (ethereal, poetic, dreamy, regal...)",
  "compositionExtracted": "Nhịp bố cục, visual hierarchy, eye-flow, negative space rhythm, directional movement của tóc/vải/light",
  "outfitExtracted": "Hướng trang phục, silhouette, layering logic, cảm giác chất liệu, mật độ trang trí, elegance/fantasy level",
  "cameraAndPerspectiveExtracted": "Chi tiết góc chụp (low-angle, eye-level...), tiêu cự, depth of field, bokeh, framing, độ sâu không gian",
  "poseAndGestureExtracted": "Chi tiết dáng đứng/ngồi/tạo dáng, cử chỉ tay, độ nghiêng đầu, ngôn ngữ cơ thể, vị trí trong khung hình",
  "detailsToPreserve": "Danh sách chi tiết bắt buộc giữ lại 85%-95% (camera angle, perspective, pose, stance, gesture, color atmosphere, floral mood, outfit direction...)",
  "detailsToAdapt": "Danh sách chi tiết thay đổi theo cốt truyện (chỉ khuôn mặt nhân vật mới theo truyện, bối cảnh phụ nếu có note riêng)",
  "detailsNotToCopyExactly": "Danh sách chi tiết không copy (0% real-world person facial identity / khuôn mặt người thật ngoài đời)",
  "layer1_overall": { "genderPresentation": "", "ageVibe": "", "auraVibe": "", "softnessSharpness": "" },
  "layer2_face": { "faceShape": "", "eyes": "", "nose": "", "mouth": "", "eyelashes": "", "makeupLevel": "", "maturity": "" },
  "layer3_hair": { "color": "", "length": "", "thickness": "", "texture": "", "bangs": "", "style": "" },
  "layer4_outfit": { "category": "", "silhouette": "", "materialFeel": "", "dominantColor": "", "accessories": "" },
  "layer5_artStyle": { "artFamily": "", "lineCleanliness": "", "lineSoftness": "", "shading": "", "texture": "", "glossiness": "", "detailLevel": "" },
  "layer6_color": { "dominantPalette": [], "colorTemp": "", "saturation": "", "contrast": "" },
  "layer7_composition": { "shotSize": "", "characterPlacement": "", "negativeSpace": "", "cameraAngle": "", "cinematicFeel": "", "depthOfField": "", "pose": "" },
  "layer8_vibe": { "coreVibe": "" },
  "subject": { "mainSubject": "", "characterCount": 1, "genderPresentation": "", "ageVibe": "", "pose": "", "expression": "" },
  "style": { "artFamily": "", "lineArt": "", "rendering": "", "texture": "", "coloringMethod": "", "detailLevel": "" },
  "color": { "mainPalette": [], "accentColors": [], "temperature": "", "saturation": "", "contrast": "" },
  "composition": { "shotSize": "", "cameraAngle": "", "focalPoint": "", "characterPlacement": "", "negativeSpace": "", "leadingLines": "", "depthOfField": "" },
  "characterDetails": { "face": "", "eyes": "", "hair": "", "outfit": "", "accessories": "", "makeup": "", "pose": "" },
  "background": { "environment": "", "objects": [], "typography": "", "graphicElements": "" },
  "promptKeywords": [],
  "selectedStyleCandidates": [],
  "negativePromptSuggestions": [],
  "referenceControl": { "visualSimilarityTarget": "High Reference Fidelity (85%–95% camera perspective, pose, style & outfit fidelity)", "adaptationAllowance": "Only transformative adaptation for story character facial identity", "identityCopy": "0% real-world facial cloning", "priority": "100% story character identity first, 85%-95% camera/pose/aesthetic style DNA second" }
}`;
      const messages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this reference image for "${cardTitle}" and return structured JSON only.` },
            { type: "image_url", image_url: { url: targetRef.data || targetRef.previewUrl || targetRef.storageUrl } }
          ]
        }
      ];
      const resultText = await callAIText({ messages, systemPrompt: sysPrompt, maxTokensOverride: 2000 });
      targetRef.imageAnalysisText = resultText;
      targetRef.analysisResult = resultText;
      
      let jsonObj = null;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonObj = JSON.parse(jsonMatch[0]);
      } catch (err) {}
      
      targetRef.imageAnalysisJson = jsonObj;
      targetRef.analysisStatus = 'analyzed';
      
      currentStory.rooms[roomDef.id] = { ...rs };
      save(state);
      toast(`✅ Đã đọc xong ảnh: ${targetRef.name || targetRef.fileName}`);
      return true;
    } catch (e: any) {
      targetRef.analysisStatus = 'failed';
      targetRef.analysisResult = e.message;
      targetRef.imageAnalysisText = "Error: " + e.message;
      currentStory.rooms[roomDef.id] = { ...rs };
      save(state);
      toast(`❌ Lỗi đọc ảnh ${targetRef.name || targetRef.fileName}: ${e.message}`);
      return false;
    }
  };

  const analyzeAllPendingImages = async () => {
    setIsAnalyzingImages(true);
    const rs = { ...roomState };
    const pendingList: { ref: any, cardId: string, cardTitle: string }[] = [];
    
    if (rs.styleAnalyzer?.refs) {
      for (const r of rs.styleAnalyzer.refs) {
        if (!r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed') {
          pendingList.push({ ref: r, cardId: 'style_analyzer', cardTitle: 'Style Analyzer' });
        }
      }
    }
    for (const c of roomDef.cards || []) {
      const cs = rs.cards[c.id];
      if (cs?.refs) {
        for (const r of cs.refs) {
          if (!r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed') {
            pendingList.push({ ref: r, cardId: c.id, cardTitle: c.title });
          }
        }
      }
    }

    if (pendingList.length === 0) {
      toast("✅ Tất cả ảnh tham chiếu trong phòng đã được AI Vision phân tích hoàn tất!");
      setIsAnalyzingImages(false);
      return;
    }

    toast(`⏳ Bắt đầu tự động phân tích AI Vision cho ${pendingList.length} ảnh chưa đọc...`);
    for (const item of pendingList) {
      await analyzeSingleImage(item.ref, item.cardId, item.cardTitle);
    }
    toast("✅ Đã hoàn tất phân tích toàn bộ ảnh tham chiếu!");
    setIsAnalyzingImages(false);
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const files = e.target.files;
    if (!files) return;
    const rs = { ...roomState };
    if (!rs.cards[cardId]) rs.cards[cardId] = { note: "", refs: [], output: "" };
    
    const newRefs: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await toBase64(file);
      const imgId = uuidv4();
      const now = new Date().toISOString();
      const newRefObj = {
        imageId: imgId,
        storyId: currentStory.id,
        roomId: roomDef.id,
        cardId: cardId,
        imageType: `${cardId}_reference`,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
        previewUrl: data,
        storageUrl: data,
        analysisStatus: 'in_context',
        id: imgId,
        name: file.name,
        type: file.type,
        data: data,
        time: now
      };
      rs.cards[cardId].refs.push(newRefObj);
      newRefs.push(newRefObj);
    }
    currentStory.rooms[roomDef.id] = rs;
    save(state);
    toast("✅ Đã đính kèm ảnh! Sẵn sàng trong Context Windows để AI đọc trực tiếp khi bấm Tạo Prompt.");
  };


  const replayHistory = (item: any) => {
    const rs = { ...roomState };
    rs.result = item.result || "";
    if (item.cards && typeof item.cards === 'object') {
      rs.cards = JSON.parse(JSON.stringify(item.cards));
    }
    currentStory.rooms[roomDef.id] = rs;
    save(state);
    toast("✨ Đã khôi phục hiển thị kết quả từ lịch sử (Không gọi lại API)!");
  };

  const runRoom = async () => {
    if (progress > 0 && progress < 100) {
      toast("⏳ API đang chạy, vui lòng chờ...");
      return;
    }
    
    setApiError(null);

    const cards = roomDef.cards;
    if (!cards || cards.length === 0) {
      toast("⚠️ Lỗi: Phòng làm việc này không có thẻ công việc nào! API bị chặn để tiết kiệm token.");
      return;
    }

    if (showContextPreview) setShowContextPreview(false);
    setProgress(5);
    streamBufferRef.current = "";
    lastFlushTimeRef.current = performance.now();
    chunksCountRef.current = 0;
    firstChunkReportedRef.current = false;
    startTimeRef.current = performance.now();
    setLivePreviewText("");
    setIsApiRunning(true);
    setIsWidgetCollapsed(false);

    setApiSignals({
      requestStarted: true,
      contextBuilt: false,
      apiRequestSent: false,
      responseStarted: false,
      firstChunkReceived: false,
      chunksReceived: 0,
      charactersReceived: 0,
      estimatedTokensReceived: 0,
      lastChunkAt: null,
      elapsedSeconds: 0,
      streaming: false,
      completed: false,
      error: null,
      stage: 'preparing_context',
      stageLabel: '1. Preparing Context',
      stageDetail: 'Đang gom Context Window (Story / hồ sơ / yêu cầu) & toàn bộ Work Cards...'
    });
    toast("⏳ Bắt đầu quy trình 8 bước xử lý API viết prompt...");

    const rs = { ...roomState };
    const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
    const target = rs.targetMode || 'bot';

    const payloadObj = buildContextPayload();
    const allRefsList = [...payloadObj.styleAnalyzer.referenceImages, ...payloadObj.workCards.flatMap(c => c.referenceImages)];

    setApiSignals(prev => ({
      ...prev,
      stage: 'reading_references',
      stageLabel: '2. Reading References',
      stageDetail: `Đang kiểm tra & đọc AI Vision cho ${allRefsList.length} ảnh tham chiếu đính kèm...`
    }));
    setProgress(15);

    // Step 2: Đã gom tất cả ảnh vào Payload. Tuyệt đối không gọi API vụn vặt từng ảnh trước khi viết Prompt!
    const refreshedPayload = buildContextPayload();
    const refreshedRefsList = [...refreshedPayload.styleAnalyzer.referenceImages, ...refreshedPayload.workCards.flatMap(c => c.referenceImages)];
    if (refreshedRefsList.length > 0) {
      toast(`✅ Đã đính kèm ${refreshedRefsList.length} ảnh tham chiếu vào request duy nhất để AI tự phân tích & tạo Prompt!`);
      setApiSignals(prev => ({
        ...prev,
        stageDetail: `✅ Gom đủ ${refreshedRefsList.length} ảnh tham chiếu. Chuẩn bị gọi 1 request duy nhất tới API Proxy...`
      }));
    }

    const prompt = `You are the professional Lipstick Prompt Rooms engine. Generate highly cohesive, copy-ready prompts for the room: "${roomDef.title}".

### CURRENT CONTEXT WINDOW (MANUAL & IMPORTED FILES)
- Story Title: ${currentStory.title}
- Story Plot: ${currentStory.story || "Chưa có cốt truyện."}
- User Profile ({{user}}): ${currentStory.userProfile || "Chưa thiết lập."}
- Bot Characters (${refreshedPayload.currentStory.manualInput.botCharacters ? refreshedPayload.currentStory.manualInput.botCharacters.length : 1} characters):
${refreshedPayload.currentStory.manualInput.botCharacters ? refreshedPayload.currentStory.manualInput.botCharacters.map((c: any, idx: number) => `  * [Char #${idx+1}: ${c.displayName || 'Unnamed'}]:\n    - Profile: ${c.profileText || 'Trống'}\n    - Attached Ref Images (${(c.referenceImages || []).length} images - DO NOT OUTPUT FILENAMES, TRANSLATE VISUAL TRAITS TO WORDS)`).join("\n\n") : (currentStory.botProfiles || "Chưa thiết lập.")}
- Side Characters: ${currentStory.sideCharacters || "Chưa có."}
- Story Requirements: ${currentStory.requirements || "Không có yêu cầu thêm."}
- Target Mode Selected: ${target} (${target === 'bot' ? 'Focus on Bot char' : target === 'user' ? 'Focus on {{user}}' : 'Focus on Both Couple'})

### ATTACHED STORY FILES (${refreshedPayload.currentStory.importedFiles.length} files)
${refreshedPayload.currentStory.importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus} | ~${f.wordCount} words]\n${f.summary ? `Summary: ${f.summary}\n` : ""}Content excerpt:\n${f.extractedText.slice(0, 15000)}`).join("\n\n---\n\n")}

### REFERENCE IMAGE MANIFEST (EXACT LOCATION & PURPOSE MAPPING)
Below is the complete manifest of all attached reference images across this story, room, and individual work cards. You MUST strictly respect the location and purpose of EACH image. Do NOT mix up images from different cards (e.g. never use a hair reference image for pose or outfit).
\`\`\`json
${JSON.stringify({
  referenceImageManifest: refreshedPayload.referenceImageManifest
}, null, 2)}
\`\`\`

### REFERENCE IMAGE PRIORITY HIERARCHY & MAPPING RULES
When generating the prompt for a specific Work Card:
1. **1st Priority (Card-Specific Reference Images)**: Images belonging to the current card (\`cardId === currentCardId\`) have HIGHEST priority for that specific visual trait (e.g., hair references for hair card, pose references for pose card, outfit references for outfit card).
2. **2nd Priority (User Note in Work Card)**: User notes inside that Work Card define how to apply and adapt the reference image.
3. **3rd Priority (Style Analyzer)**: Images with \`cardId === "style_analyzer"\` govern the overall art style, brushwork, linework, color palette, and rendering quality across all cards. Never let Style Analyzer override a card's specific reference for pose, hair, or outfit!
4. **4th Priority (General Room References / Vibe)**: General room visual direction and mood.
5. **5th Priority (Story & Character Profile)**: Ensure the final character identity strictly belongs to the user's story (100% Story & Character Identity). Do NOT copy or clone the face/identity of reference images (0% Identity Copy).

### SELECTED ART STYLES & VISION ANALYSIS
- Selected Style Keywords: ${(sa.selected || []).join(", ") || "None selected"}
- Style Analyzer Summary: ${sa.analysis || "None"}
- Attached Style Reference Images (${(sa.refs || []).length} images):
${(sa.refs || []).map((r: any, idx: number) => `  * [Style Ref #${idx+1} (DO NOT OUTPUT FILENAME - TRANSLATE VISUAL TRAITS TO WORDS): "${r.name || r.fileName || 'Image'}" | Status: ${r.analysisStatus || 'analyzed'} | Purpose: style_reference (3rd Priority: style/render/color only, do NOT override card-specific refs)]:\n    - Vision Report: ${r.imageAnalysisText || r.analysisResult || "Chưa phân tích"}${r.imageAnalysisJson ? `\n    - Style Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}\n    - Art Family/Rendering: ${JSON.stringify(r.imageAnalysisJson.style || {})}\n    - Visual Style: ${JSON.stringify(r.imageAnalysisJson.visualStyleExtracted || {})}\n    - Color Palette: ${JSON.stringify(r.imageAnalysisJson.colorPaletteExtracted || {})}` : ""}`).join("\n\n") || "  * No style reference images attached."}

### WORKROOM CARDS & SPECIFIC NOTES (WITH ATTACHED REFERENCE IMAGES & VISION ANALYSIS)
${cards.map((c: any) => {
  const cs = rs.cards[c.id] || { note: "", refs: [], output: "" };
  const refsDesc = cs.refs.map((r: any, idx: number) => {
    const status = r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending');
    const analysisText = r.imageAnalysisText || r.analysisResult || "⚠️ Chưa phân tích AI Vision";
    const jsonStr = r.imageAnalysisJson ? `\n    - Subject Details: ${JSON.stringify(r.imageAnalysisJson.subject || {})}\n    - Style & Color: ${JSON.stringify(r.imageAnalysisJson.style || {})} | ${JSON.stringify(r.imageAnalysisJson.color || {})}\n    - Composition & Details: ${JSON.stringify(r.imageAnalysisJson.composition || {})} | ${JSON.stringify(r.imageAnalysisJson.characterDetails || {})}\n    - Prompt Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}\n    - Visual Style Extracted: ${JSON.stringify(r.imageAnalysisJson.visualStyleExtracted || {})}\n    - Color Palette Extracted: ${JSON.stringify(r.imageAnalysisJson.colorPaletteExtracted || {})}\n    - Outfit Fidelity Extracted: ${JSON.stringify(r.imageAnalysisJson.outfitExtracted || r.imageAnalysisJson.layer4_outfit || {})}\n    - Composition Rhythm Extracted: ${JSON.stringify(r.imageAnalysisJson.compositionExtracted || r.imageAnalysisJson.composition || {})}\n    - Details To Preserve (70%-85%): ${JSON.stringify(r.imageAnalysisJson.detailsToPreserve || "N/A")}\n    - Details To Adapt (15%-30%): ${JSON.stringify(r.imageAnalysisJson.detailsToAdapt || "N/A")}\n    - Details Not To Copy (0%): ${JSON.stringify(r.imageAnalysisJson.detailsNotToCopyExactly || "N/A")}` : "";
    return `  * [Card Ref #${idx+1} (DO NOT OUTPUT FILENAME - TRANSLATE VISUAL TRAITS TO WORDS): "${r.name || r.fileName || 'Image'}" | ID: ${r.id || r.imageId} | Status: ${status} | Purpose: ${r.purpose || c.title + ' reference'} (1st Priority for this card)]:\n    - Vision Analysis Text: ${analysisText}${jsonStr}`;
  }).join("\n\n");
  return `#### Card: "${c.title}" (ID: ${c.id})
- Quick Guidelines: ${c.quick}
- User Note: ${cs.note || "None"}
- Attached Reference Images (${cs.refs.length} images):
${refsDesc || "  * No reference images attached to this card."}`;
}).join("\n\n---\n\n")}

### CRITICAL VISUAL REFERENCE DNA INSTRUCTIONS (HIGH REFERENCE FIDELITY, TRANSFORMATIVE ADAPTATION RULE)
When attached reference images or Vision Analysis reports are present for any work card:
1. **Core Principle: High Reference Fidelity (85%–95% Camera Angle, Perspective, Depth of Field, Pose, Style & Outfit Fidelity; only transformative adaptation for story character facial identity)**:
   - When using reference images, extract and preserve aesthetic DNA, camera perspective, framing, depth of field, and character pose.
   - You MUST NOT copy or clone the real-world exact facial identity of a real person in the reference image (0% exact real-world face copy).
   - You MUST adhere strictly to the reference images across these aesthetic and structural layers: art style, medium texture (e.g., watercolor, manhua fantasy, soft ink-wash), color palette, light & shadow, opacity/translucency, mood/vibe, visual motifs, flowing movement of hair, **CAMERA SHOT & PERSPECTIVE FIDELITY** (exact camera angle, low/high/eye-level shot, focal length feel, depth of field, background blur, bokeh, spatial framing), **CHARACTER POSE & GESTURE FIDELITY** (exact body stance, posture, head tilt, hand placement, body language, silhouette, spatial positioning in the frame), **Outfit Fidelity** (garment spirit, form, silhouette, drape, layering logic, detail density, material feel, trim/lace/ribbon/embroidery tendencies, color scheme, elegance/fantasy level), and **Composition Fidelity** (visual hierarchy, focal structure, eye-flow/visual path, subject placement logic, negative space rhythm).
2. **6-Step Mandatory Execution Process**:
   - Step 1: Read each attached reference image and its Vision Analysis report.
   - Step 2: Extract the visual DNA of each image (camera angle, perspective, depth of field, pose, style, color, line, mood, composition, outfit).
   - Step 3: Translate the visual DNA into rich, descriptive natural language.
   - Step 4: Map that visual DNA accurately to the specific Work Card and Room.
   - Step 5: When writing the final prompt, explicitly embed the learned camera perspective, pose, aesthetic traits, outfit direction, and composition rhythm.
   - Step 6: NEVER generate a generic prompt based solely on story plot while ignoring reference camera angles, pose, or aesthetic DNA!
3. **Strict Priority & Retention Hierarchy**:
   - **1st Priority (100% Story & Character Profile Identity)**: The final character's facial features, name, and identity MUST belong to the user's story, preserving their unique aura, personality, and profile defined in the story settings.
   - **2nd Priority (85%–95% Camera Angle, Perspective, Depth of Field, Pose, Stance, Style DNA, Outfit & Composition Fidelity - CRITICAL)**: Adhere strictly to camera perspective, framing, depth of field, character body pose, stance, hand gesture, rendering style, color palette, lighting, mood, brushwork, and outfit structure from the reference image.
   - **3rd Priority (Creative Adaptation when explicitly requested by user note)**: Adjust minor supporting props or background details ONLY when required by the story plot or user notes.
   - **4th Priority (0% Real-World Person Facial Cloning)**: Absolute prohibition on cloning the exact real-world face/identity of a reference photo.
4. **Multi-Image Intersection (DNA Giao Nhau)**: If a card has multiple attached reference images, you MUST read ALL of them, identify their intersection/common aesthetic DNA (camera perspective, pose, color, art style, rendering, mood, outfit spirit, composition), and synthesize them into a single cohesive visual instruction.
5. **ABSOLUTE PROHIBITION ON BARE FILENAMES IN OUTPUT PROMPT (KHÔNG ĐƯỢC CHỈ NHẮC TÊN FILE ẢNH)**:
   - You are STRICTLY FORBIDDEN from writing bare image filenames, file extensions, or image IDs (e.g. "Use references: 1000012463.jpg, 1000012560.jpg", "Character inspired by 1000012463.jpg", or "inspired by image 1.png") inside the generated prompt!
   - When reference images are present, your task is to READ the vision analysis reports, extract their aesthetic layers, camera angles, and poses, and SYNTHESIZE them into rich, descriptive natural language inside the output prompt.
   - A valid output prompt is a complete, standalone descriptive instruction where all aesthetic and structural traits from reference images have been translated into explicit descriptive words ready for direct image generation!

### MANDATORY OUTPUT STRUCTURE & RULES
You MUST generate the final copy-ready image prompt for EACH work card individually.
Return the result for EACH card listed above individually. Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the following format, without any <think> blocks or conversational prefixes. YOU MUST USE EXACTLY THIS FORMAT TO SEPARATE THE CARDS:

${cards.map((c: any) => `[CARD_ID: ${c.id}]
[REFERENCE FIDELITY REPORT]
- Card Title: "${c.title}"
- Room ID: "${roomDef.id}"
- Attached Reference Images: (List each image ID/name internally, and detail the visual DNA analysis: Camera Angle, Perspective, Depth of Field, Pose, Stance, Style, Palette, Light, Texture, Mood, Outfit, Composition)
---
[FINAL PROMPT]
(Write the final copy-ready standalone image prompt for "${c.title}" here. CRITICAL MANDATE: You MUST divide the prompt into exactly 5 STANDALONE PARTS using standard Markdown headers so the user can copy each part or the whole prompt easily!
Structure exactly as follows:

### 🧑 PART 1: SUBJECT, POSE & GESTURE (Nhân vật & Kiểu dáng tạo dáng)
[Detailed character description, body stance, pose, gesture, head tilt, expression, and body language strictly adhering to the reference image]

### 👗 PART 2: OUTFIT, MATERIAL & STYLING (Trang phục, Chất liệu & Phụ kiện)
[Detailed outfit silhouette, fabric drape, layering, lace, embroidery, jewelry, and styling strictly adhering to the reference image]

### 🌌 PART 3: ENVIRONMENT & BACKGROUND (Bối cảnh & Không gian xung quanh)
[Detailed background setting, architecture, nature, spatial depth, and supporting elements]

### 💡 PART 4: LIGHTING, COLOR PALETTE & ATMOSPHERE (Ánh sáng, Màu sắc & Bầu không khí)
[Detailed lighting direction, rim light, dominant color palette, contrast, artistic render quality, and emotional mood]

### 📸 PART 5: CAMERA ANGLE, PERSPECTIVE & COMPOSITION (Góc chụp, Thị giác & Bố cục máy ảnh)
[Exact camera perspective (eye-level, low-angle, high-angle...), focal length feel, depth of field, bokeh, framing, and visual hierarchy strictly adhering to the reference image]

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)`).join("\n\n")}
`;

    rs.result = "";
    for (const c of cards) {
      if (!rs.cards[c.id]) rs.cards[c.id] = { note: "", refs: [], output: "", report: "" };
      rs.cards[c.id].output = "";
      rs.cards[c.id].report = "";
    }

    // Clear UI completely before stream starts
    currentStory.rooms[roomDef.id] = { ...rs };
    save(state);

    const contentArray: any[] = [{ type: "text", text: prompt }];
    for (const img of allRefsList) {
      if (img.data || img.previewUrl || img.storageUrl) {
        contentArray.push({
          type: "image_url",
          image_url: { url: img.data || img.previewUrl || img.storageUrl }
        });
        // Khi gửi vào Context Windows, cập nhật sang trạng thái đã đọc thành công để UI không bị treo "⏳ Đang đọc..."
        img.analysisStatus = 'analyzed';
        if (!img.imageAnalysisText || img.imageAnalysisText === 'Chưa phân tích' || img.imageAnalysisText.startsWith('⏳')) {
          img.imageAnalysisText = '✅ AI đã đọc trực tiếp trong Context Windows (Smart In-Context Vision)';
        }
      }
    }
    save(state);

    setApiSignals(prev => ({
      ...prev,
      contextBuilt: true,
      stage: 'connecting_api',
      stageLabel: '3. Connecting API',
      stageDetail: 'Đang kết nối API Proxy & gửi request... (Đang chờ phản hồi đầu tiên)'
    }));
    setProgress(25);

    try {
      setTimeout(() => {
        setApiSignals(prev => ({ ...prev, apiRequestSent: true }));
        setProgress(35);
      }, 300);

      const parseCardStreamContent = (raw: string) => {
        if (!raw) return { report: "", output: "" };
        let report = "";
        let output = raw;

        const finalPromptRegex = /\[FINAL PROMPT\]|\[FINAL_PROMPT\]|\n---\n|\n\*\*\*\n/i;
        const match = raw.match(finalPromptRegex);
        if (match && match.index !== undefined) {
          report = raw.slice(0, match.index).replace(/\[REFERENCE FIDELITY REPORT\]|\[FIDELITY REPORT\]/ig, "").trim();
          output = raw.slice(match.index + match[0].length).trim();
        } else if (raw.includes("[REFERENCE FIDELITY REPORT]")) {
          report = raw.replace(/\[REFERENCE FIDELITY REPORT\]/ig, "").trim();
          output = "";
        }

        if (output) {
          output = output
            .replace(/^[-*]?\s*(Attached )?Reference Images?:.*$/gim, "")
            .replace(/^[-*]?\s*Room:\s*.*$/gim, "")
            .replace(/^[-*]?\s*Card:\s*.*$/gim, "")
            .replace(/^[-*]?\s*Card Title:\s*.*$/gim, "")
            .replace(/\[REFERENCE FIDELITY REPORT\]/gim, "")
            .replace(/\[FINAL PROMPT\]/gim, "")
            .replace(/\[CARD_ID:[^\]]+\]/gim, "")
            .replace(/\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|\d{6,}\.(jpg|png|jpeg|webp)|[a-z0-9_-]+\.(jpg|png|jpeg|webp))\b/gim, "")
            .replace(/\(\s*(from|reference|ref|inspired by|image|attached)\s*:[^)]*\)/gim, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }

        return { report, output };
      };

      const distributeStreamToCardsLive = (text: string) => {
        if (!text) return;
        const cardBlocks = text.split(/\[CARD_ID:\s*([^\]]+)\]/);
        for (let i = 1; i < cardBlocks.length; i += 2) {
          const parsedCardId = cardBlocks[i]?.trim();
          const parsedContent = (cardBlocks[i + 1] || "").trim();
          if (parsedCardId && rs.cards[parsedCardId]) {
            const { report, output } = parseCardStreamContent(parsedContent);
            rs.cards[parsedCardId].report = report;
            rs.cards[parsedCardId].output = output || (isApiRunning && report ? "⏳ AI đang phân tích ảnh tham chiếu (xem Báo cáo thẩm định bên dưới) trước khi viết Prompt..." : parsedContent);
            if (roomState.cards && roomState.cards[parsedCardId]) {
              roomState.cards[parsedCardId].report = report;
              roomState.cards[parsedCardId].output = rs.cards[parsedCardId].output;
            }
            if (currentStory?.rooms?.[roomDef.id]?.cards?.[parsedCardId]) {
              currentStory.rooms[roomDef.id].cards[parsedCardId].report = report;
              currentStory.rooms[roomDef.id].cards[parsedCardId].output = rs.cards[parsedCardId].output;
            }
          }
        }
      };

      await callAIStream({
        messages: [{ role: "user", content: contentArray }],
        systemPrompt: "You are an AI Image Prompt Generator inside a production workspace. Your task is to generate the final copy-ready image prompt from the user's provided context. You are not a tutor, not a prompt-writing teacher, not a checklist generator, and not an assistant explaining how to write prompts. Read the full Context Window and produce the final usable image prompt directly adhering to the core principle: High Reference Fidelity (85%–95% Camera Angle, Perspective, Depth of Field, Pose, Style & Outfit Fidelity; only transformative adaptation for story character facial identity).\n\nCRITICAL RULE ON REFERENCE IMAGES: When using reference images, extract and preserve aesthetic DNA and structural composition across these layers: art style, medium texture (watercolor, manhua fantasy, soft ink-wash...), color palette, light & shadow, opacity/translucency, mood/vibe, visual motifs, flowing hair movement, CAMERA SHOT & PERSPECTIVE FIDELITY (exact camera angle, low/high/eye-level shot, focal length feel, depth of field, background blur, bokeh, spatial framing), CHARACTER POSE & GESTURE FIDELITY (exact body stance, posture, head tilt, hand placement, body language, silhouette, spatial positioning in the frame), OUTFIT FIDELITY (form, silhouette, drape, layering logic, detail density, material feel, trim/lace/ribbon/embroidery tendencies, color family, elegance/fantasy level), and COMPOSITION FIDELITY (visual hierarchy, focal structure, eye-flow/visual path, subject placement logic, negative space rhythm). You MUST NOT copy or clone the real-world exact facial identity of a real person in the reference image! You MUST strictly preserve camera shot, perspective, depth of field, framing, pose, silhouette, and gesture from the reference image (while applying the new story character profile).\n\nYou MUST read and translate all visual traits into rich, descriptive natural language. You are STRICTLY FORBIDDEN from writing bare filenames or placeholder image IDs in the output prompt (e.g., do NOT output 'Use references: 1000012463.jpg' or 'Character inspired by 1000012463.jpg').\n\nFor EACH Work Card, you MUST FIRST output the mandatory [REFERENCE FIDELITY REPORT] block showing exactly what was extracted and what is preserved/adapted/prohibited, followed by '---', and then [FINAL PROMPT] with the standalone descriptive instruction ready for direct image generation! In [FINAL PROMPT], you MUST structure the output into exactly 5 STANDALONE PARTS with standard headers: ### 🧑 PART 1: SUBJECT, POSE & GESTURE\n### 👗 PART 2: OUTFIT, MATERIAL & STYLING\n### 🌌 PART 3: ENVIRONMENT & BACKGROUND\n### 💡 PART 4: LIGHTING, COLOR PALETTE & ATMOSPHERE\n### 📸 PART 5: CAMERA ANGLE, PERSPECTIVE & COMPOSITION\n\nDo NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...].",
        onToken: (token) => {
          streamBufferRef.current += token;
          chunksCountRef.current += 1;
          
          const now = performance.now();
          if (now - lastFlushTimeRef.current >= 150) {
            lastFlushTimeRef.current = now;
            setLivePreviewText(streamBufferRef.current);
            distributeStreamToCardsLive(streamBufferRef.current);
            
            const charCount = streamBufferRef.current.length;
            const currentChunks = chunksCountRef.current;
            const newTokens = Math.ceil(charCount / 4);
            const elapsedSec = Math.round((now - startTimeRef.current) / 1000);
            const nowStr = new Date().toLocaleTimeString('vi-VN');
            
            const isFirst = !firstChunkReportedRef.current;
            if (isFirst) {
              firstChunkReportedRef.current = true;
              setProgress(45);
            } else {
              setProgress(p => Math.min(90, Math.max(p, 48 + Math.min(42, currentChunks * 0.4))));
            }
            
            setApiSignals(prev => ({
              ...prev,
              responseStarted: true,
              firstChunkReceived: true,
              streaming: true,
              chunksReceived: currentChunks,
              charactersReceived: charCount,
              estimatedTokensReceived: newTokens,
              lastChunkAt: nowStr,
              elapsedSeconds: elapsedSec,
              stage: isFirst ? 'first_response' : 'streaming',
              stageLabel: isFirst ? '4. First Response Received' : '5. Streaming Tokens',
              stageDetail: isFirst 
                ? `✨ Đã nhận chunk đầu tiên từ API! Bắt đầu stream dữ liệu... (📦 ${currentChunks} chunks | ~${newTokens} tokens)`
                : `⚡ Đang stream token theo thời gian thực... (📦 ${currentChunks} chunks | ~${newTokens} tokens | ⏱️ ${elapsedSec}s)`
            }));
          } else {
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(() => {
              setLivePreviewText(streamBufferRef.current);
              distributeStreamToCardsLive(streamBufferRef.current);
              const charCount = streamBufferRef.current.length;
              const currentChunks = chunksCountRef.current;
              const newTokens = Math.ceil(charCount / 4);
              const elapsedSec = Math.round((performance.now() - startTimeRef.current) / 1000);
              setApiSignals(prev => ({
                ...prev,
                chunksReceived: currentChunks,
                charactersReceived: charCount,
                estimatedTokensReceived: newTokens,
                elapsedSeconds: elapsedSec
              }));
            }, 150);
          }
        },
        onDone: () => {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          const finalResultText = streamBufferRef.current || "";
          setLivePreviewText(finalResultText);
          rs.result = finalResultText;
          distributeStreamToCardsLive(finalResultText);
          
          setApiSignals(prev => ({
            ...prev,
            streaming: false,
            stage: 'parsing_result',
            stageLabel: '6. Parsing Result',
            stageDetail: 'Đang hoàn tất tự động phân bổ kết quả vào từng Work Card...'
          }));
          setProgress(95);

          setTimeout(() => {
            setApiSignals(prev => ({
              ...prev,
              stage: 'saving',
              stageLabel: '7. Saving History',
              stageDetail: 'Đang lưu resultRun mới vào History & chuẩn bị nút copy...'
            }));
            setProgress(98);

            const historyItem = {
              id: uuidv4(),
              time: new Date().toISOString(),
              storyId: currentStory.id,
              roomId: roomDef.id,
              selectedTarget: target,
              payload: payloadObj,
              result: finalResultText,
              selectedStyles: [...(sa.selected || [])],
              referenceImages: allRefsList,
              streamStatus: 'completed' as const,
              cards: JSON.parse(JSON.stringify(rs.cards))
            };
            if (!rs.history) rs.history = [];
            rs.history.unshift(historyItem);
            currentStory.rooms[roomDef.id] = { ...rs };
            save(state);

            setTimeout(() => {
              setProgress(100);
              setApiSignals(prev => ({
                ...prev,
                completed: true,
                stage: 'done',
                stageLabel: '8. Completed',
                stageDetail: '✅ Hoàn tất! Tất cả thẻ đã nhận đầy đủ prompt chuyên sâu.'
              }));
              setIsApiRunning(false);
              toast("✅ Đã tạo xong Prompt Image copy-ready cho toàn bộ phòng!");
              setTimeout(() => {
                setProgress(0);
                setApiSignals(prev => ({ ...prev, requestStarted: false }));
              }, 8000);
            }, 300);
          }, 300);
        },
        onError: (err) => {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          setProgress(100);
          setApiError(String(err));
          setIsApiRunning(false);
          setApiSignals(prev => ({
            ...prev,
            streaming: false,
            completed: true,
            error: String(err),
            stage: 'done',
            stageLabel: '❌ Lỗi kết nối API',
            stageDetail: `Lỗi: ${err}`
          }));
          rs.result = (streamBufferRef.current || "") + `\n\n[Lỗi kết nối API: ${err}]`;
          const historyItem = {
            id: uuidv4(),
            time: new Date().toISOString(),
            storyId: currentStory.id,
            roomId: roomDef.id,
            selectedTarget: target,
            payload: payloadObj,
            result: rs.result,
            selectedStyles: [...(sa.selected || [])],
            referenceImages: allRefsList,
            streamStatus: 'error' as const,
            cards: JSON.parse(JSON.stringify(rs.cards))
          };
          if (!rs.history) rs.history = [];
          rs.history.unshift(historyItem);
          currentStory.rooms[roomDef.id] = { ...rs };
          save(state);
          toast("❌ Lỗi khi gọi API: " + err);
          setTimeout(() => setProgress(0), 1000);
        }
      });
    } catch (e: any) {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      setApiError("Lỗi hệ thống: " + e.message);
      setIsApiRunning(false);
      setApiSignals(prev => ({
        ...prev,
        streaming: false,
        completed: true,
        error: e.message,
        stage: 'done',
        stageLabel: '❌ Lỗi hệ thống',
        stageDetail: e.message
      }));
      rs.result = "Error: " + e.message;
      setProgress(0);
    }
  };

  const bgStyle = roomState.background 
    ? { backgroundImage: `url('\${roomState.background}')` } 
    : { backgroundImage: `url('\${PRESET_BACKGROUNDS[roomDef.seed % PRESET_BACKGROUNDS.length]}')` };
  const cover = roomState.cover || PRESET_BACKGROUNDS[roomDef.seed % PRESET_BACKGROUNDS.length];
  const avatar = roomState.avatar || state.ui.globalAvatar;

  return (
    <section className="room-stage" style={bgStyle}>
      <input type="file" ref={fileInputRef} className="file-native" accept="image/*" onChange={handleVisualChange} />
      
      {!isCompactHeader && (
        <section className="room-header">
          <div className="room-hero-cover" style={{backgroundImage: `url(${cover})`}}>
            <div className="room-avatar">{avatar ? <img src={avatar} alt=""/> : ''}</div>
          </div>
          <div className="room-intro" style={{padding: '24px 28px 18px', background: 'rgba(255,255,255,0.85)'}}>
            <h1 style={{margin: 0, fontSize: '28px', color: '#8c526b'}}>{roomDef.title}</h1>
            <p style={{margin: '6px 0 0', color: '#51404c', fontSize: '15px'}}>{roomDef.desc}</p>
          </div>
        </section>
      )}

      {/* COMPACT FLOATING TOOLBAR HEADER */}
      <div style={{
        position: 'sticky',
        top: '12px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '2px solid rgba(220, 105, 150, 0.45)',
        borderRadius: '20px',
        padding: '10px 18px',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(140, 82, 107, 0.15)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <button 
            className="btn ghost small" 
            onClick={onBack} 
            style={{fontWeight: 800, color: '#8c526b', background: '#fff0f6', border: '1px solid #e96b9b', padding: '6px 14px', borderRadius: '12px'}}
          >
            ← Trở ra danh sách phòng
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{fontSize: '1.4rem'}}>{roomDef.icon}</span>
            <div>
              <h2 style={{margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#3e333e', lineHeight: 1.2}}>{roomDef.title}</h2>
              <small style={{color: '#8c526b', fontWeight: 600, fontSize: '0.75rem'}}>Phòng làm việc chuyên sâu</small>
            </div>
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
          {!isCompactHeader && (
            <>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px'}} onClick={() => { setVisualTarget("background"); fileInputRef.current?.click(); }}>🎨 Đổi nền</button>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px'}} onClick={() => setShowPreset(true)}>🌌 Preset nền</button>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#d23a73', color: '#d23a73', background: '#fff0f6'}} onClick={() => setShowContextPreview(true)}>🔍 Context Window</button>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#8c526b', color: '#8c526b', background: '#f8eff3'}} onClick={() => setShowImageReviewPanel(true)}>🖼️ Image Review ({getAllRoomImages().length})</button>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px'}} onClick={onOpenDrawer}>🐈 Ngăn kéo</button>
              <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 800, borderColor: '#e96b9b', color: '#c62828', background: '#ffebee'}} onClick={onHome}>🏠 Thoát App</button>
            </>
          )}
          <button 
            className="btn ghost small" 
            style={{fontSize: '1.2rem', padding: '6px 10px', borderRadius: '50%'}} 
            onClick={onToggleCompact} 
            title="Thu gọn / Mở rộng đầu trang"
          >
            {isCompactHeader ? '🌸' : '🤍'}
          </button>
          <button 
            className="btn primary small" 
            onClick={runRoom}
            disabled={progress > 0 && progress < 100}
            style={{
              padding: '8px 16px', 
              fontSize: '0.9rem', 
              fontWeight: 800, 
              background: progress > 0 && progress < 100 ? '#ccc' : 'linear-gradient(135deg, #d23a73, #8c526b)', 
              boxShadow: progress > 0 && progress < 100 ? 'none' : '0 4px 12px rgba(210,58,115,0.3)',
              cursor: progress > 0 && progress < 100 ? 'not-allowed' : 'pointer',
              color: progress > 0 && progress < 100 ? '#666' : '#fff'
            }}
          >
            {(progress > 0 && progress < 100) ? '⏳ Đang tạo prompt...' : '✨ Gọi API viết prompt'}
          </button>
        </div>
        
        {/* BOTTOM PROGRESS BAR */}
        {progress > 0 && <div className="progress" style={{position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', borderRadius: '0 0 20px 20px', overflow: 'hidden'}}><span style={{width: `${progress}%`}}></span></div>}
      </div>

      {/* ERROR ALERT CARD */}
      {apiError && (
        <div style={{
          margin: '16px 0', padding: '20px', background: '#fff0f3',
          border: '2px solid #ff4d6d', borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(255, 77, 109, 0.15)',
          display: 'flex', flexDirection: 'column', gap: '12px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontSize: '1.5rem'}}>⚠️</span>
              <div>
                <h4 style={{margin: 0, color: '#c9184a', fontSize: '1.1rem', fontWeight: 800}}>Lỗi Kết Nối API / API Proxy</h4>
                <small style={{color: '#800f2f'}}>Hệ thống không thể nhận phản hồi hợp lệ từ máy chủ AI hoặc API Proxy của bạn.</small>
              </div>
            </div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                className="btn primary small" 
                onClick={() => { setApiError(null); runRoom(); }}
                style={{background: '#c9184a', fontWeight: 800, padding: '8px 16px'}}
              >
                🔄 Thử lại ngay
              </button>
              <button 
                className="btn ghost small" 
                onClick={() => setApiError(null)}
                style={{color: '#c9184a', border: '1px solid #ff8fa3', fontWeight: 700}}
              >
                ✕ Đóng
              </button>
            </div>
          </div>
          <div style={{background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ffccd5', fontFamily: 'monospace', fontSize: '0.85rem', color: '#590d22', wordBreak: 'break-all', maxHeight: '150px', overflowY: 'auto'}}>
            <b>Chi tiết lỗi:</b> {apiError}
          </div>
          <div style={{fontSize: '0.85rem', color: '#800f2f', display: 'flex', flexWrap: 'wrap', gap: '16px'}}>
            <span>💡 <b>Gợi ý kiểm tra:</b></span>
            <span>1. Đảm bảo API Proxy trong <b>Cài Đặt</b> đang hoạt động và không bị lỗi CORS/404.</span>
            <span>2. Kiểm tra API Key và quyền truy cập Model đã chọn.</span>
            <span>3. Kiểm tra kết nối mạng hoặc thử lại sau vài giây.</span>
          </div>
        </div>
      )}

      {/* FLOATING NON-BLOCKING API STREAMING & LOADING WIDGET */}
      {apiSignals.requestStarted && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: isWidgetCollapsed ? '320px' : '450px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(255, 255, 255, 0.98)',
          border: '2px solid #e96b9b',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(210, 58, 115, 0.28)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'auto', // only widget catches clicks, no fullscreen overlay!
          overflow: 'hidden'
        }}>
          {/* HEADER & TIME */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'linear-gradient(135deg, #fff0f5 0%, #ffe6f0 100%)',
            borderBottom: '1px solid #f0d5e2'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden'}}>
              {!apiSignals.completed && !apiSignals.error ? (
                <div style={{width: '18px', height: '18px', borderRadius: '50%', border: '3px solid #f0d5e2', borderTopColor: '#d23a73', animation: 'spin 1s linear infinite', flexShrink: 0}} />
              ) : apiSignals.error ? (
                <span style={{fontSize: '1.2rem', flexShrink: 0}}>❌</span>
              ) : (
                <span style={{fontSize: '1.2rem', flexShrink: 0}}>🎉</span>
              )}
              <div style={{overflow: 'hidden'}}>
                <h4 style={{margin: 0, color: '#3e333e', fontSize: '0.95rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {apiSignals.stageLabel || "🚀 Tiến Trình API"}
                </h4>
                <span style={{fontSize: '0.75rem', color: '#8c526b', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  ⏱️ {apiSignals.elapsedSeconds}s | {apiSignals.streaming ? '🟢 Stream' : apiSignals.completed ? '✅ Xong' : '⏳ Chờ'}
                </span>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0}}>
              <button
                onClick={() => setIsWidgetCollapsed(!isWidgetCollapsed)}
                style={{
                  background: '#fff', border: '1px solid #e0d4da', borderRadius: '8px',
                  padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#6a4a58',
                  cursor: 'pointer'
                }}
                title={isWidgetCollapsed ? "Mở rộng widget" : "Thu gọn widget"}
              >
                {isWidgetCollapsed ? "▲ Mở rộng" : "▼ Thu gọn"}
              </button>
              {!apiSignals.completed && (
                <button
                  onClick={() => {
                    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
                    setIsApiRunning(false);
                    setApiSignals(prev => ({ ...prev, requestStarted: false, streaming: false }));
                    toast("⏹️ Đã dừng/thu gọn theo yêu cầu.");
                  }}
                  style={{
                    background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px',
                    padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#c62828',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Hủy
                </button>
              )}
            </div>
          </div>

          {/* PROGRESS BAR (ALWAYS VISIBLE) */}
          <div style={{width: '100%', height: '4px', background: '#f0d5e2', overflow: 'hidden'}}>
            <div style={{width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #d23a73, #8c526b, #ff85a1)', transition: 'width 0.3s ease'}} />
          </div>

          {/* EXPANDED CONTENT */}
          {!isWidgetCollapsed && (
            <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '450px', overflowY: 'auto'}}>
              {/* CURRENT DETAIL MESSAGE */}
              <div style={{fontSize: '0.85rem', color: '#5a3d4a', background: '#fcf8fa', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f0e6eb', fontWeight: 600}}>
                💬 {apiSignals.stageDetail}
              </div>

              {/* SLOW API WARNING */}
              {apiSignals.stage === 'connecting_api' && !apiSignals.firstChunkReceived && apiSignals.elapsedSeconds >= 10 && (
                <div style={{background: '#fff3cd', border: '1px solid #ffeeba', padding: '10px 12px', borderRadius: '10px', color: '#856404', fontSize: '0.8rem'}}>
                  ⏳ <b>Đang chờ AI Model ({apiSignals.elapsedSeconds}s):</b> Máy chủ đang xử lý context lớn hoặc suy nghĩ sâu (Reasoning). Vui lòng kiên nhẫn...
                </div>
              )}

              {/* EXTRACTED VISUAL TRAITS SUMMARY BADGE (IF REFS PRESENT) */}
              {(() => {
                const rs = roomState;
                const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
                const cards = roomDef.cards || [];
                const allRefs = [...(sa.refs || []), ...cards.flatMap((c: any) => (rs.cards[c.id]?.refs || []))];
                const analyzedRefs = allRefs.filter(r => r.imageAnalysisJson || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích'));
                if (analyzedRefs.length === 0) return null;
                return (
                  <div style={{background: '#f3e5f5', border: '1px solid #e1bee7', padding: '10px 12px', borderRadius: '12px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                      <strong style={{color: '#6a1b9a', fontSize: '0.8rem'}}>🎨 Aesthetic DNA tham chiếu ({analyzedRefs.length} ảnh):</strong>
                      <span style={{fontSize: '0.7rem', background: '#e1bee7', color: '#4a148c', padding: '2px 6px', borderRadius: '6px', fontWeight: 800}}>Reference-Inspired, Not Copy (70%-85% Style DNA)</span>
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '60px', overflowY: 'auto'}}>
                      {Array.from(new Set(analyzedRefs.flatMap(r => r.imageAnalysisJson?.promptKeywords || []))).slice(0, 10).map((kw, idx) => (
                        <span key={idx} style={{background: '#fff', color: '#6a1b9a', border: '1px solid #ce93d8', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600}}>
                          ✨ {kw}
                        </span>
                      ))}
                      {analyzedRefs.some(r => r.imageAnalysisJson?.style?.renderingStyle) && (
                        <span style={{background: '#4a148c', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700}}>
                          🖼️ Style: {analyzedRefs.map(r => r.imageAnalysisJson?.style?.renderingStyle).filter(Boolean)[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* STREAM METRICS & LIVE PREVIEW AREA */}
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#725365'}}>
                  <span>⚡ Live Result Preview (Non-blocking)</span>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <span>📦 {apiSignals.chunksReceived} chunks</span>
                    <span>🪙 ~{apiSignals.estimatedTokensReceived} tokens</span>
                  </div>
                </div>

                <div 
                  ref={previewScrollRef}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 30;
                    if (isAtBottom !== autoScrollPreview) {
                      setAutoScrollPreview(isAtBottom);
                    }
                  }}
                  style={{
                    background: '#2d1e27', color: '#f0d5e2', border: '1px solid #5a3d4a', borderRadius: '12px', padding: '12px',
                    minHeight: '100px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace',
                    fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, position: 'relative'
                  }}
                >
                  {livePreviewText || (
                    <span style={{color: '#8c7380', fontStyle: 'italic'}}>
                      {!apiSignals.firstChunkReceived ? "⏳ Đang chờ phản hồi đầu tiên từ API..." : "Đang stream dữ liệu..."}
                    </span>
                  )}
                </div>

                {!autoScrollPreview && apiSignals.streaming && (
                  <div style={{textAlign: 'right', marginTop: '4px'}}>
                    <button
                      onClick={() => {
                        setAutoScrollPreview(true);
                        if (previewScrollRef.current) {
                          previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
                        }
                      }}
                      style={{
                        background: '#d23a73', color: '#fff', border: 'none', borderRadius: '12px',
                        padding: '4px 10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(210, 58, 115, 0.4)'
                      }}
                    >
                      ⬇️ Follow Latest
                    </button>
                  </div>
                )}
              </div>

              {/* MINI STEPPER INDICATOR */}
              <div style={{display: 'flex', justifyContent: 'space-between', gap: '4px', borderTop: '1px solid #f0e6eb', paddingTop: '10px'}}>
                {[
                  { id: 'preparing_context', label: '1.Ctx' },
                  { id: 'reading_references', label: '2.Ref' },
                  { id: 'connecting_api', label: '3.Conn' },
                  { id: 'first_response', label: '4.First' },
                  { id: 'streaming', label: '5.Stream' },
                  { id: 'parsing_result', label: '6.Parse' },
                  { id: 'saving', label: '7.Save' },
                  { id: 'done', label: '8.Done' }
                ].map((s, idx) => {
                  const stageOrder = ['preparing_context', 'reading_references', 'connecting_api', 'first_response', 'streaming', 'parsing_result', 'saving', 'done'];
                  const currentIdx = stageOrder.indexOf(apiSignals.stage);
                  const isPassed = idx < currentIdx || apiSignals.completed;
                  const isActive = idx === currentIdx && !apiSignals.completed && !apiSignals.error;
                  return (
                    <div key={s.id} style={{
                      flex: 1, textAlign: 'center', padding: '4px 2px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                      background: isActive ? '#d23a73' : isPassed ? '#e8f5e9' : '#f8f4f6',
                      color: isActive ? '#fff' : isPassed ? '#2e7d32' : '#a08892',
                      transition: 'all 0.3s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <StyleAnalyzer roomState={roomState} currentStory={currentStory} roomDef={roomDef} state={state} save={save} toast={toast} />

      {/* COMPREHENSIVE SINGLE RESULT CARD - NOW JUST A SUCCESS HEADER */}
      {(roomState.result && roomState.result.length > 0) && (
        <section className="glass-panel" style={{margin: '16px 0', padding: '24px', background: 'rgba(255,255,255,0.95)', borderRadius: '24px', border: '2px solid rgba(220,105,150,0.45)', boxShadow: '0 12px 36px rgba(232,106,153,0.2)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px'}}>
            <div>
              <p className="eyebrow" style={{color: '#d23a73', margin: 0, fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase'}}>Kết quả tổng hợp đợt này</p>
              <h2 style={{margin: '4px 0 0 0', color: '#3e333e', fontSize: '1.45rem', fontWeight: 900}}>✨ API Đã Trả Kết Quả Về Từng Thẻ</h2>
              <p style={{margin: '8px 0 0', color: '#51404c', fontSize: '0.9rem'}}>Kết quả chi tiết đã được tự động phân bổ vào từng thẻ công việc bên dưới.</p>
            </div>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <button className="btn primary small" onClick={() => {
                const combined = roomDef.cards.map((c: any) => {
                  const out = roomState.cards?.[c.id]?.output;
                  return out ? `--- ${c.title} ---\n${out}` : '';
                }).filter(Boolean).join('\n\n');
                if (!combined) { toast("Chưa có nội dung để copy."); return; }
                navigator.clipboard.writeText(combined);
                toast("📋 Đã copy toàn bộ Prompt Image vào Clipboard!");
              }} style={{fontWeight: 800, padding: '8px 16px'}}>📋 Copy Toàn Bộ Prompt</button>
              <button className="btn ghost small" onClick={runRoom} style={{fontWeight: 800, padding: '8px 14px'}}>🔄 Tạo Lại</button>
            </div>
          </div>
          
          {/* STATS AND METADATA BAR */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: '#fff9fb', padding: '14px', borderRadius: '16px', border: '1px solid #f0d5e2', marginTop: '16px', fontSize: '0.85rem', color: '#3e333e'}}>
            <div><b>📖 Story:</b> {currentStory.title}</div>
            <div><b>🏛️ Hạng mục:</b> {roomDef.title}</div>
            <div><b>🕒 Tạo lúc:</b> {new Date().toLocaleTimeString('vi-VN')}</div>
            <div><b>🎯 Target:</b> <span style={{color: '#d23a73', fontWeight: 700}}>{roomState.targetMode || 'bot'}</span></div>
            <div><b>✦ Styles đã chọn:</b> {roomState.styleAnalyzer?.selected?.length || 0} phong cách</div>
          </div>
        </section>
      )}

      <section className="work-list">
        {roomDef.cards.map((c: any, i: number) => {
          const cs = roomState.cards?.[c.id] || { note: "", refs: [], output: "" };
          const cardRefs = cs.refs || [];
          return (
            <article className="work-card" key={c.id}>
              <div className="work-head">
                <div className="work-title">
                  <div className="num">{i + 1}</div>
                  <div>
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
                  </div>
                </div>
              </div>
              <div className="work-body">
                <div className="guide"><b>Nhiệm vụ / từ khóa nhanh của thẻ</b><br/>{c.quick}</div>
                {c.id === "target" && (
                  <div className="target-selector">
                    <button className={`target-option ${roomState.targetMode === 'bot' ? 'active' : ''}`} onClick={() => { roomState.targetMode = 'bot'; save(state); }}><b>Bot char</b></button>
                    <button className={`target-option ${roomState.targetMode === 'user' ? 'active' : ''}`} onClick={() => { roomState.targetMode = 'user'; save(state); }}><b>{'{{user}}'}</b></button>
                    <button className={`target-option ${roomState.targetMode === 'couple' ? 'active' : ''}`} onClick={() => { roomState.targetMode = 'couple'; save(state); }}><b>Couple</b></button>
                  </div>
                )}
                <div className="upload-hero">
                  <label className="file-label">
                    Thêm ảnh tham chiếu
                    <input type="file" multiple accept="image/*" className="file-native" onChange={(e) => handleRefUpload(e, c.id)} />
                  </label>
                  <div className="image-rail">
                    {cardRefs.length === 0 ? (
                      <div className="photo-card empty-photo"><div><b>Chưa có ảnh tham chiếu</b></div></div>
                    ) : (
                      cardRefs.map((r: any) => (
                        <div className="photo-card" key={r.id || r.imageId} style={{ cursor: 'pointer' }} onClick={() => setSelectedImgDetail({ ...r, cardId: c.id, cardTitle: c.title })}>
                          <img src={r.data || r.previewUrl || r.storageUrl} alt="" />
                          <span>{r.name || r.fileName}</span>
                          <div className="analysis-status">{r.analysisStatus === 'analyzed' ? '✅ Đã đọc thành công' : (r.analysisStatus === 'failed' ? '❌ Lỗi đọc ảnh' : '✅ Sẵn sàng trong Context')}</div>
                          <div style={{ fontSize: '10px', color: '#d23a73', marginTop: 2 }}>🔍 Xem AI phân tích</div>
                          <button className="delete-btn" onClick={(e) => {
                            e.stopPropagation();
                            cs.refs = (cs.refs || []).filter((x: any) => (x.id || x.imageId) !== (r.id || r.imageId));
                            save(state);
                          }}>×</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="card-input-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <label>
                    <span>Ô điền nội dung / yêu cầu của thẻ</span>
                    <textarea value={cs.note} onChange={(e) => { cs.note = e.target.value; save(state); }} placeholder="Điền nội dung riêng cho thẻ này..."></textarea>
                  </label>
                </div>
                {(cs.report || (cs.refs && cs.refs.length > 0)) && (
                  <details style={{marginTop: '16px', background: '#fcf8fa', borderRadius: '12px', border: '1px dashed #d8c0cc', padding: '10px 14px', fontSize: '0.85rem'}}>
                    <summary style={{cursor: 'pointer', fontWeight: 700, color: '#725365', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                        <span>🧠 INTERNAL / DEBUG: Báo cáo phân tích DNA ảnh & thẩm định</span>
                        <span style={{background: 'rgba(114,83,101,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem'}}>Room: {roomDef.id}</span>
                        <span style={{background: 'rgba(114,83,101,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem'}}>Card: {c.id}</span>
                        {cs.refs.length > 0 && (
                          <span style={{background: '#e8def8', color: '#4a3858', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem'}}>📎 {cs.refs.length} ảnh tham chiếu</span>
                        )}
                      </div>
                      <span style={{fontSize: '0.8rem', color: '#d23a73'}}>▼ Nhấn để xem/ẩn báo cáo</span>
                    </summary>
                    <div style={{marginTop: '12px', borderTop: '1px solid #efe5eb', paddingTop: '12px', color: '#4a3a46'}}>
                      <p style={{margin: '0 0 8px 0', fontSize: '0.8rem', fontStyle: 'italic', color: '#8c6b7e'}}>
                        ⚠️ Phần này chỉ dùng nội bộ để kiểm tra AI có đọc, hiểu ảnh tham chiếu và trích xuất đúng DNA (Style, Palette, Light, Texture, Outfit...) hay không. Không dùng để copy tạo ảnh.
                      </p>
                      {cs.refs && cs.refs.length > 0 && (
                        <div style={{marginBottom: '10px', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e2d6dd'}}>
                          <b>📎 Danh sách file ảnh đã đính kèm:</b>
                          <ul style={{margin: '4px 0 0 16px', padding: 0, fontSize: '0.8rem'}}>
                            {cs.refs.map((r: any, idx: number) => (
                              <li key={r.id || r.imageId || idx} style={{marginBottom: '2px'}}>
                                <code>{r.name || r.fileName || `Image_${idx+1}`}</code> (ID: <code>{(r.id || r.imageId || '').slice(0, 12)}...</code>) — Trạng thái AI: <b>{r.analysisStatus === 'analyzed' ? '✅ Đã đọc thành công (In-Context)' : (r.analysisStatus === 'failed' ? '❌ Lỗi' : '✅ Sẵn sàng trong Context Windows')}</b>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {cs.report ? (
                        <div style={{position: 'relative'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                            <b style={{color: '#5c4553', fontSize: '0.85rem'}}>📑 Chi tiết Báo cáo Thẩm định AI Vision:</b>
                            <button className="btn ghost small" onClick={() => {
                              navigator.clipboard.writeText(cs.report);
                              toast("📋 Đã copy báo cáo thẩm định nội bộ");
                            }} style={{fontSize: '0.7rem', padding: '2px 6px'}}>📋 Copy Báo Cáo Debug</button>
                          </div>
                          <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ded0d7', maxHeight: '250px', overflowY: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', margin: 0}}>
                            {cs.report}
                          </pre>
                        </div>
                      ) : isApiRunning ? (
                        <div style={{padding: '8px', fontStyle: 'italic', color: '#d23a73'}}>⏳ Đang stream báo cáo thẩm định DNA từ AI...</div>
                      ) : (
                        <div style={{padding: '8px', fontStyle: 'italic', color: '#8c6b7e'}}>Chưa có báo cáo phân tích (hãy bấm "Tạo Prompt" để AI kiểm tra ảnh).</div>
                      )}
                    </div>
                  </details>
                )}

                {cs.output ? (
                  <div style={{marginTop: '16px', padding: '16px', background: '#fff0f6', borderRadius: '12px', border: isApiRunning ? '2px solid #d23a73' : '1px solid #f0d5e2', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(210,58,115,0.08)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.95rem'}}>✨ FINAL COPY-READY PROMPT (Chia 5 Phần Thẩm Mỹ & Có Copy Liền Mạch):</b>
                        {isApiRunning && (
                          <span style={{background: '#d23a73', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, animation: 'pulse 1s infinite', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                            <span style={{width: '6px', height: '6px', background: '#fff', borderRadius: '50%', display: 'inline-block'}} />
                            Đang stream dữ liệu... (~{Math.ceil(cs.output.length / 4)} tokens)
                          </span>
                        )}
                      </div>
                    </div>
                    <PromptFivePartsViewer
                      output={cs.output}
                      toast={toast}
                      isApiRunning={isApiRunning}
                      cardTitle={c.title}
                    />
                  </div>
                ) : isApiRunning ? (
                  <div style={{marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #fff0f5, #fef5f8)', borderRadius: '12px', border: '1px dashed #d23a73', animation: 'pulse 1.5s infinite'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#d23a73', fontSize: '0.85rem', fontWeight: 700}}>
                      <div style={{width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #f0d5e2', borderTopColor: '#d23a73', animation: 'spin 1s linear infinite', flexShrink: 0}} />
                      <span>⏳ AI đang làm việc... Đang chờ stream nội dung Prompt vào thẻ "{c.title}"...</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="glass-panel" style={{margin: '24px 0', padding: '20px', background: 'rgba(255, 245, 249, 0.95)', borderRadius: '24px', border: '1px solid rgba(220,105,150,0.3)'}}>
        <div style={{marginBottom: '16px', textAlign: 'left'}}>
          <p className="eyebrow" style={{color: '#d23a73', margin: 0, fontWeight: 700}}>API Proxy History</p>
          <h2 style={{margin: 0, color: '#3e333e', fontSize: '1.25rem'}}>📜 Lịch Sử Gọi API & Replay Của Phòng ({roomState.history?.length || 0} lần)</h2>
          <p className="muted" style={{fontSize: '0.85rem', margin: '4px 0 0 0'}}>Bấm "Xem lại (Replay)" để hiển thị lại kết quả cũ mà không tốn lượt gọi lại API.</p>
        </div>
        <div className="history-list" style={{maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {(!roomState.history || roomState.history.length === 0) ? (
            <div style={{padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', color: '#725365'}}>
              <b>Chưa có lịch sử gọi API cho phòng này.</b>
            </div>
          ) : (
            roomState.history.map((h: any, index: number) => {
              const runNumber = roomState.history.length - index;
              const wordCount = (h.result || "").trim().split(/\s+/).filter(Boolean).length;
              const charCount = (h.result || "").length;
              return (
              <div key={h.id} className="history-item" style={{background: '#fff', border: '1px solid rgba(238,153,190,0.45)', borderRadius: '16px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 12px rgba(232,106,153,0.06)'}}>
                <div style={{flex: 1, minWidth: '220px', textAlign: 'left'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                    <span style={{fontSize: '0.85rem', fontWeight: 800, color: '#d23a73'}}>
                      Đợt {runNumber}
                    </span>
                    <span style={{fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: h.streamStatus === 'error' ? '#ffebee' : '#e8f5e9', color: h.streamStatus === 'error' ? '#c62828' : '#2e7d32'}}>
                      {h.streamStatus === 'error' ? '❌ Lỗi' : '✅ Thành công'}
                    </span>
                    <span style={{fontSize: '0.8rem', color: '#888'}}>🕒 {new Date(h.time).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{fontWeight: 700, color: '#3e333e', marginBottom: '4px', fontSize: '0.95rem'}}>
                    📌 Story: {currentStory.title} — Phòng: {roomDef.title}
                  </div>
                  <div style={{fontSize: '0.85rem', color: '#725365'}}>
                    🎯 Mục tiêu: <b>{h.selectedTarget || 'Bot char'}</b> | 📊 {charCount.toLocaleString('vi-VN')} ký tự / {wordCount.toLocaleString('vi-VN')} từ
                  </div>
                  <div style={{fontSize: '0.8rem', color: '#999', marginTop: '4px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px'}}>
                    "{h.result?.slice(0, 80)}..."
                  </div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <button className="btn primary small" onClick={() => replayHistory(h)} style={{fontSize: '0.8rem', padding: '6px 12px'}}>
                    🔄 Khôi phục
                  </button>
                  <button className="btn ghost small" onClick={() => {
                    navigator.clipboard.writeText(h.result || "");
                    toast("📋 Đã copy nội dung đợt " + runNumber);
                  }} style={{fontSize: '0.8rem', padding: '6px 12px'}}>
                    📋 Copy
                  </button>
                  <button className="btn ghost small" onClick={() => setSelectedHistoryPayload(h)} style={{fontSize: '0.8rem', padding: '6px 12px'}}>
                    👁️ Xem chi tiết
                  </button>
                  <button className="btn danger small" onClick={() => {
                    roomState.history = roomState.history.filter((x: any) => x.id !== h.id);
                    currentStory.rooms[roomDef.id] = roomState;
                    save(state);
                    toast("Đã xóa mục lịch sử.");
                  }} style={{fontSize: '0.8rem', padding: '6px 10px'}}>
                    ×
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      </section>

      {showPreset && (
        <div className="modal show">
          <div className="modal-card">
            <div className="modal-head">
              <div><p className="eyebrow">Preset nền phòng</p><h2>Chọn nền cho hạng mục</h2></div>
              <button className="btn ghost" onClick={() => setShowPreset(false)}>Đóng</button>
            </div>
            <div className="preset-grid">
              {PRESET_BACKGROUNDS.map((u, i) => (
                <div className="preset" key={i}>
                  <img src={u} alt="" />
                  <button className="btn primary small" onClick={() => {
                    roomState.background = u;
                    roomState.cover = u;
                    save(state);
                    setShowPreset(false);
                  }}>Chọn</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedHistoryPayload && (
        <div className="modal show">
          <div className="modal-card" style={{maxWidth: '750px', width: '90%'}}>
            <div className="modal-head">
              <div><p className="eyebrow">Lịch Sử API Proxy</p><h2>Chi Tiết Đợt Kết Quả & Dữ Liệu</h2></div>
              <button className="btn ghost" onClick={() => setSelectedHistoryPayload(null)}>Đóng</button>
            </div>
            <div style={{padding: '16px', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', color: '#3e333e'}}>
              <div>
                <b>🕒 Thời gian tạo:</b> {new Date(selectedHistoryPayload.time).toLocaleString('vi-VN')}
              </div>
              <div>
                <b>📌 Story & Phòng:</b> Story "{currentStory.title}" | Phòng "{roomDef.title}"
              </div>
              <div>
                <b>🎯 Mục tiêu đã chọn:</b> {selectedHistoryPayload.selectedTarget || 'bot'}
              </div>
              <div>
                <b>✦ Danh sách Style đã tick ({selectedHistoryPayload.selectedStyles?.length || 0}):</b>
                <div style={{background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #ecc', marginTop: '4px', fontSize: '0.85rem'}}>
                  {selectedHistoryPayload.selectedStyles?.join(", ") || "Không có style nào được chọn."}
                </div>
              </div>
              <div>
                <b>🖼️ Danh sách Ảnh tham chiếu ({selectedHistoryPayload.referenceImages?.length || 0}):</b>
                <div style={{background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #ecc', marginTop: '4px', fontSize: '0.85rem'}}>
                  {(!selectedHistoryPayload.referenceImages || selectedHistoryPayload.referenceImages.length === 0) ? (
                    "Không có ảnh tham chiếu."
                  ) : (
                    selectedHistoryPayload.referenceImages.map((ri: any, idx: number) => (
                      <div key={idx} style={{marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dashed #eee'}}>
                        <b>Ảnh {idx+1}: {ri.name || ri.fileName || "Image"}</b> ({ri.type})<br/>
                        <span style={{color: '#666', fontSize: '0.8rem'}}>{ri.analysis ? ri.analysis.slice(0, 150) + '...' : 'Đã phân tích'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <b>📦 Toàn bộ Payload (JSON metadata):</b>
                <pre style={{background: '#1e1e1e', color: '#00ffcc', padding: '12px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem'}}>
                  {JSON.stringify(selectedHistoryPayload.payload, null, 2)}
                </pre>
              </div>
              <div>
                <b>✨ Kết Quả Trả Về (Replay Ready):</b>
                <textarea readOnly value={selectedHistoryPayload.result || ""} style={{width: '100%', minHeight: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #ecc', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '4px'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #eee', gap: '8px', flexWrap: 'wrap'}}>
              <button className="btn ghost small" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedHistoryPayload.payload, null, 2));
                toast("📋 Đã copy toàn bộ Payload JSON!");
              }}>📋 Copy Payload JSON</button>
              <button className="btn primary" onClick={() => {
                replayHistory(selectedHistoryPayload);
                setSelectedHistoryPayload(null);
              }}>🔄 Replay Kết Quả Này Vào Phòng</button>
              <button className="btn ghost" onClick={() => setSelectedHistoryPayload(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Context Preview */}
      {showContextPreview && (
        <div className="modal show" style={{zIndex: 1050, background: 'rgba(0,0,0,0.65)'}}>
          <div className="modal-card" style={{maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-head">
              <div>
                <p className="eyebrow" style={{color: '#d23a73', margin: 0, fontWeight: 700}}>Context Window Preview</p>
                <h2 style={{margin: 0, color: '#3e333e', fontSize: '1.4rem'}}>🔍 Kiểm tra toàn bộ Context trước khi gọi API</h2>
              </div>
              <button className="btn ghost small" onClick={() => setShowContextPreview(false)}>✕ Đóng</button>
            </div>

            <div style={{display: 'flex', gap: 10, borderBottom: '2px solid #f0d5e2', paddingBottom: 10, marginTop: 10}}>
              <button className={`btn ${previewTab === 'human' ? 'primary' : 'ghost'} small`} onClick={() => setPreviewTab('human')}>
                📊 Tổng quan trực quan & Thống kê ngữ cảnh
              </button>
              <button className={`btn ${previewTab === 'json' ? 'primary' : 'ghost'} small`} onClick={() => setPreviewTab('json')}>
                📦 Cấu trúc JSON chuẩn (API Payload)
              </button>
            </div>

            {previewTab === 'human' ? (() => {
              const payload = buildContextPayload();
              const stats = payload.contextStats;
              return (
                <div style={{flex: 1, overflowY: 'auto', padding: '12px 0', textAlign: 'left'}}>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: '#fff0f6', padding: 12, borderRadius: 12, border: '1px solid #f8bbd0', marginBottom: 16}}>
                    <div><b>Story đang chọn:</b> <span style={{color: '#880e4f'}}>{payload.currentStory.title}</span></div>
                    <div><b>Phòng làm việc:</b> <span style={{color: '#880e4f'}}>{payload.currentRoom.roomTitle}</span></div>
                    <div><b>Target Mode:</b> <span style={{color: '#880e4f'}}>{payload.selectedTarget.label}</span></div>
                    <div><b>Tổng token ước tính:</b> <span style={{color: '#c62828', fontWeight: 800}}>~{stats.estimatedTotalTokens} tokens</span></div>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
                    <div style={{background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 12}}>
                      <h4 style={{margin: '0 0 8px 0', color: '#ad1457'}}>✍️ Dữ liệu nhập tay ({stats.manualWordCount} từ)</h4>
                      <ul style={{margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6}}>
                        <li><b>Cốt truyện chính:</b> {payload.currentStory.manualInput.storyText ? `Có (${payload.currentStory.manualInput.storyText.length} ký tự)` : '⚠️ Trống'}</li>
                        <li><b>Hồ sơ User:</b> {payload.currentStory.manualInput.userProfile ? `Có (${payload.currentStory.manualInput.userProfile.length} ký tự)` : '⚠️ Trống'}</li>
                        <li><b>Danh sách Bot Char:</b> {payload.currentStory.manualInput.botCharacters ? `Có (${payload.currentStory.manualInput.botCharacters.length} nhân vật động)` : (payload.currentStory.manualInput.botProfiles ? `Có (${payload.currentStory.manualInput.botProfiles.length} ký tự)` : '⚠️ Trống')}</li>
                        <li><b>Nhân vật phụ:</b> {payload.currentStory.manualInput.sideCharacters ? `Có (${payload.currentStory.manualInput.sideCharacters.length} ký tự)` : 'Chưa nhập'}</li>
                        <li><b>Yêu cầu tạo ảnh:</b> {payload.currentStory.manualInput.imageRequirements ? `Có (${payload.currentStory.manualInput.imageRequirements.length} ký tự)` : 'Chưa nhập'}</li>
                      </ul>
                    </div>

                    <div style={{background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 12}}>
                      <h4 style={{margin: '0 0 8px 0', color: '#2e7d32'}}>📁 File tài liệu đính kèm ({stats.filesCount} file)</h4>
                      {payload.currentStory.importedFiles.length === 0 ? (
                        <p style={{fontSize: 13, color: '#888', fontStyle: 'italic'}}>Không có file tài liệu nào trong Story.</p>
                      ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto'}}>
                          {payload.currentStory.importedFiles.map((f: any, i: number) => (
                            <div key={i} style={{fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f8e9', padding: '4px 8px', borderRadius: 6, border: '1px solid #c8e6c9'}}>
                              <span>📄 <b>{f.fileName}</b> ({f.fileSizeReadable} | ~{f.wordCount} từ)</span>
                              <button className="btn ghost small" style={{fontSize: 11, padding: '2px 6px'}} onClick={() => setSelectedFileDetail(f)}>Xem text</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 12, marginBottom: 16}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 8}}>
                      <div>
                        <h4 style={{margin: 0, color: '#1565c0'}}>🖼️ Reference Image Manifest (Hệ thống định vị & ghi nhớ từng ảnh theo Hạng mục)</h4>
                        <span style={{fontSize: 11, color: '#666'}}>Luật: Reference-Inspired, Not Identity-Copy (70%–85% Style DNA)</span>
                      </div>
                      <div style={{display: 'flex', gap: 6, fontSize: 12}}>
                        <span style={{background: '#e3f2fd', color: '#0d47a1', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold'}}>Tổng: {stats.imagesCount} ảnh</span>
                        <span style={{background: '#e8f5e9', color: '#1b5e20', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold'}}>Đã hiểu: {stats.analyzedImagesCount} ảnh</span>
                      </div>
                    </div>

                    {stats.imagesCount === 0 ? (
                      <p style={{fontSize: 13, color: '#888', fontStyle: 'italic', margin: '8px 0'}}>Chưa có ảnh tham chiếu trong phòng hoặc Style Analyzer.</p>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, background: '#f8f9fa', padding: 8, borderRadius: 8}}>
                          <b>Phân bổ theo mục đích:</b>
                          <span style={{color: '#6a1b9a'}}>🎨 Style Analyzer: <b>{payload.referenceImageManifest.filter((img: any) => img.cardId === 'style_analyzer').length}</b></span> |
                          <span style={{color: '#ad1457'}}>💇‍♀️ Thẻ Tóc (Hair): <b>{payload.referenceImageManifest.filter((img: any) => img.purpose?.includes('hair_reference')).length}</b></span> |
                          <span style={{color: '#e65100'}}>💃 Thẻ Dáng (Pose): <b>{payload.referenceImageManifest.filter((img: any) => img.purpose?.includes('pose_reference')).length}</b></span> |
                          <span style={{color: '#2e7d32'}}>👗 Thẻ Trang phục (Outfit): <b>{payload.referenceImageManifest.filter((img: any) => img.purpose?.includes('outfit_reference')).length}</b></span> |
                          <span style={{color: '#00838f'}}>🤖 Bot Profile: <b>{payload.referenceImageManifest.filter((img: any) => img.purpose?.includes('bot_character_reference')).length}</b></span>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4}}>
                          {payload.referenceImageManifest.map((img: any, idx: number) => (
                            <div key={idx} style={{display: 'flex', gap: 10, background: img.cardId === 'style_analyzer' ? '#f3e5f5' : '#fff8e1', border: '1px solid', borderColor: img.cardId === 'style_analyzer' ? '#ce93d8' : '#ffe082', borderRadius: 8, padding: 8, cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => setSelectedImgDetail(img)}>
                              <img src={img.previewUrl || img.storageUrl} alt="" style={{width: 70, height: 70, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #ccc'}} />
                              <div style={{flex: 1, minWidth: 0, fontSize: 11, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                                <div>
                                  <div style={{fontWeight: 'bold', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={img.fileName}>📄 {img.fileName}</div>
                                  <div style={{color: '#d23a73', fontWeight: 600, marginTop: 2}}>📌 Card: [{img.cardId}] - {img.cardTitle}</div>
                                  <div style={{color: '#555', fontSize: 10, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={img.purpose}>🎯 {img.purpose}</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTop: '1px dashed #ddd', paddingTop: 4}}>
                                  <span style={{color: img.analysisStatus === 'analyzed' ? 'green' : (img.analysisStatus === 'failed' ? '#e65100' : '#00897b'), fontWeight: 'bold'}}>{img.analysisStatus === 'analyzed' ? '✅ Đã đọc thành công' : (img.analysisStatus === 'failed' ? '❌ Lỗi' : '✅ Sẵn sàng trong Context')}</span>
                                  <span style={{color: '#0066cc', textDecoration: 'underline', fontSize: 10}}>Xem Vision Report</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{background: '#fcf4f8', border: '1px solid #f8bbd0', borderRadius: 10, padding: 12}}>
                    <h4 style={{margin: '0 0 6px 0', color: '#880e4f'}}>🎨 Style Analyzer & Danh sách Thẻ làm việc ({payload.workCards.length} thẻ)</h4>
                    <p style={{fontSize: 13, margin: '0 0 10px 0'}}><b>Nét vẽ chọn ({payload.styleAnalyzer.selectedStyles.length} style):</b> {payload.styleAnalyzer.selectedStyles.map((s: any) => s.styleName).join(", ") || "Chưa chọn nét nào"}</p>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      {payload.workCards.length === 0 ? (
                        <div style={{fontSize: 13, color: 'red', fontWeight: 'bold'}}>⚠️ Không tìm thấy thẻ công việc nào! (API sẽ bị chặn)</div>
                      ) : (
                        payload.workCards.map((c: any, idx: number) => (
                          <div key={idx} style={{background: '#fff', border: '1px solid #e1bee7', borderRadius: 8, padding: 10}}>
                            <div style={{fontSize: 14, fontWeight: 'bold', color: '#6a1b9a', marginBottom: 4}}>{idx + 1}. {c.title}</div>
                            <div style={{fontSize: 13, color: '#333'}}>
                              <span style={{marginRight: 12}}>📝 Ghi chú: {c.userNote ? <b style={{color: 'green'}}>Có ({c.userNote.length} ký tự)</b> : <span style={{color: 'gray'}}>Trống</span>}</span>
                              <span style={{marginRight: 12}}>🖼️ Ảnh tham chiếu: <b style={{color: c.referenceImages.length > 0 ? 'blue' : 'gray'}}>{c.referenceImages.length} ảnh</b></span>
                              <span>✅ Ảnh trong Context: <b style={{color: c.referenceImages.length > 0 ? 'green' : 'gray'}}>{c.referenceImages.filter((r: any) => r.analysisStatus !== 'failed').length} ảnh (Sẵn sàng AI đọc)</b></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div style={{flex: 1, overflowY: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', border: '1px solid #333', textAlign: 'left', margin: '12px 0'}}>
                {JSON.stringify(buildContextPayload(), null, 2)}
              </div>
            )}

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #ddd', paddingTop: 12}}>
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn ghost small" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(buildContextPayload(), null, 2));
                  toast("📋 Đã copy JSON Context Payload vào Clipboard!");
                }}>📋 Copy JSON Context</button>
                <button className="btn ghost small" onClick={() => {
                  const p = buildContextPayload();
                  navigator.clipboard.writeText(p.mergedStoryContext.finalStoryContext);
                  toast("📋 Đã copy văn bản Context Story vào Clipboard!");
                }}>📋 Copy Văn Bản Context</button>
              </div>
              <div style={{display: 'flex', gap: 10}}>
                <button className="btn ghost" onClick={() => setShowContextPreview(false)}>Đóng lại</button>
                <button className="btn primary" onClick={() => { setShowContextPreview(false); runRoom(); }} style={{fontSize: '15px', padding: '10px 24px', background: '#d23a73'}}>
                  🚀 Xác nhận Context & Gọi API Viết Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết file khi bấm xem từ preview hoặc từ thẻ */}
      {selectedFileDetail && (
        <div className="modal show" style={{zIndex: 1150, background: 'rgba(0,0,0,0.7)'}}>
          <div className="modal-card" style={{maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-head">
              <div><p className="eyebrow">File Extracted Text</p><h3 style={{margin: 0}}>📄 {selectedFileDetail.fileName || selectedFileDetail.name}</h3></div>
              <button className="btn ghost small" onClick={() => setSelectedFileDetail(null)}>✕ Đóng</button>
            </div>
            <div style={{flex: 1, overflowY: 'auto', background: '#f9f9f9', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 13, whiteSpace: 'pre-wrap', margin: '12px 0', textAlign: 'left'}}>
              {selectedFileDetail.extractedText || selectedFileDetail.text || "⚠️ Chưa có văn bản trích xuất."}
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
              <button className="btn primary small" onClick={() => {
                navigator.clipboard.writeText(selectedFileDetail.extractedText || selectedFileDetail.text || "");
                toast("📋 Đã copy nội dung file!");
              }}>📋 Copy Nội Dung</button>
              <button className="btn ghost small" onClick={() => setSelectedFileDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết phân tích ảnh */}
      {selectedImgDetail && (
        <div className="modal show" style={{zIndex: 1150, background: 'rgba(0,0,0,0.75)'}}>
          <div className="modal-card" style={{maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-head">
              <div><p className="eyebrow">Vision Analysis Report ({selectedImgDetail.cardTitle || 'Reference'})</p><h3 style={{margin: 0}}>🖼️ {selectedImgDetail.fileName || selectedImgDetail.name}</h3></div>
              <button className="btn ghost small" onClick={() => setSelectedImgDetail(null)}>✕ Đóng</button>
            </div>
            <div style={{display: 'flex', gap: 16, margin: '12px 0', flex: 1, overflowY: 'auto'}}>
              <div style={{width: '240px', flexShrink: 0, textAlign: 'center'}}>
                <img src={selectedImgDetail.previewUrl || selectedImgDetail.data || selectedImgDetail.storageUrl} alt="" style={{width: '100%', borderRadius: 8, border: '1px solid #ddd'}} />
                <div style={{marginTop: 8, fontSize: 12}}><b>Trạng thái:</b> {selectedImgDetail.analysisStatus === 'analyzed' ? '✅ Đã hiểu ảnh' : '⏳ Chưa phân tích'}</div>
                </div>
              <div style={{flex: 1, background: '#f5f5f5', padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 13, overflowY: 'auto', textAlign: 'left'}}>
                <h4 style={{margin: '0 0 8px 0', color: '#880e4f'}}>🧠 Reference Fidelity Report (AI Vision Analysis):</h4>
                {selectedImgDetail.imageAnalysisJson ? (
                  <div style={{fontSize: 13, lineHeight: 1.6}}>
                    <div style={{marginBottom: 8, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e0e0e0'}}>
                      <b style={{color: '#d23a73'}}>✨ Tóm tắt (High Reference Fidelity):</b><br/>
                      {selectedImgDetail.imageAnalysisJson.summary || "Không có"}
                    </div>
                    <div style={{marginBottom: 8}}><b>🎨 Visual Style Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.visualStyleExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.visualStyleExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.visualStyleExtracted || selectedImgDetail.imageAnalysisJson.style || {})}</div>
                    <div style={{marginBottom: 8}}><b>🌈 Color Palette Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.colorPaletteExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.colorPaletteExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.colorPaletteExtracted || selectedImgDetail.imageAnalysisJson.color || {})}</div>
                    <div style={{marginBottom: 8}}><b>🖌️ Line & Render Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted || selectedImgDetail.imageAnalysisJson.layer5_artStyle || {})}</div>
                    <div style={{marginBottom: 8}}><b>✨ Mood Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.moodExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.moodExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.moodExtracted || selectedImgDetail.imageAnalysisJson.layer8_vibe || {})}</div>
                    <div style={{marginBottom: 8}}><b>👗 Outfit Fidelity Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.outfitExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.outfitExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.outfitExtracted || selectedImgDetail.imageAnalysisJson.layer4_outfit || {})}</div>
                    <div style={{marginBottom: 8}}><b>📐 Composition Rhythm Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.compositionExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.compositionExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.compositionExtracted || selectedImgDetail.imageAnalysisJson.composition || {})}</div>
                    <div style={{marginTop: 12, padding: 8, background: '#e8f5e9', borderRadius: 6, borderLeft: '4px solid #4caf50'}}>
                      <b>✅ Details to Preserve (70%–85% Aesthetic Fidelity):</b><br/>
                      {typeof selectedImgDetail.imageAnalysisJson.detailsToPreserve === 'string' ? selectedImgDetail.imageAnalysisJson.detailsToPreserve : JSON.stringify(selectedImgDetail.imageAnalysisJson.detailsToPreserve || "Màu sắc, phong cách vẽ, bố cục, hướng trang phục")}
                    </div>
                    <div style={{marginTop: 8, padding: 8, background: '#fff3e0', borderRadius: 6, borderLeft: '4px solid #ff9800'}}>
                      <b>🔄 Details to Adapt (15%–30% Transformative Adaptation):</b><br/>
                      {typeof selectedImgDetail.imageAnalysisJson.detailsToAdapt === 'string' ? selectedImgDetail.imageAnalysisJson.detailsToAdapt : JSON.stringify(selectedImgDetail.imageAnalysisJson.detailsToAdapt || "Tư thế, bối cảnh phụ, đạo cụ, khuôn mặt theo cốt truyện")}
                    </div>
                    <div style={{marginTop: 8, padding: 8, background: '#ffebee', borderRadius: 6, borderLeft: '4px solid #f44336'}}>
                      <b>🚫 Details Not to Copy Exactly (0% Exact Identity Copy):</b><br/>
                      {typeof selectedImgDetail.imageAnalysisJson.detailsNotToCopyExactly === 'string' ? selectedImgDetail.imageAnalysisJson.detailsNotToCopyExactly : JSON.stringify(selectedImgDetail.imageAnalysisJson.detailsNotToCopyExactly || "Khuôn mặt cụ thể, danh tính nhân vật, pose y hệt 1:1, trang phục y hệt 1:1")}
                    </div>
                  </div>
                ) : (
                  <pre style={{margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5}}>
                    {selectedImgDetail.imageAnalysisText || selectedImgDetail.analysisResult || "⚠️ Ảnh chưa được phân tích hoặc đang chờ xử lý."}
                  </pre>
                )}
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
              <button className="btn small primary" style={{background: '#d23a73', color: '#fff'}} onClick={async () => {
                const success = await analyzeSingleImage(selectedImgDetail, selectedImgDetail.cardId || 'reference', selectedImgDetail.cardTitle || 'Reference');
                if (success) {
                  setSelectedImgDetail({ ...selectedImgDetail, analysisStatus: 'analyzed' });
                }
              }}>🔄 Phân tích lại AI Vision</button>
              <button className="btn ghost small" onClick={() => setSelectedImgDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Image Review Panel */}
      {showImageReviewPanel && (
        <div className="modal show" style={{zIndex: 1160, background: 'rgba(0,0,0,0.8)'}}>
          <div className="modal-card" style={{maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-head" style={{borderBottom: '2px solid #f8bbd0', paddingBottom: 12}}>
              <div>
                <p className="eyebrow" style={{color: '#d23a73', fontWeight: 700}}>IMAGE CONTEXT DEBUG</p>
                <h3 style={{margin: 0, color: '#880e4f'}}>🖼️ Image Review Panel ({getAllRoomImages().length} ảnh)</h3>
              </div>
              <div style={{display: 'flex', gap: 8}}>
                <button 
                  className="btn small" 
                  style={{background: isAnalyzingImages ? '#ccc' : '#d23a73', color: '#fff', fontWeight: 600}} 
                  disabled={isAnalyzingImages}
                  onClick={analyzeAllPendingImages}
                >
                  {isAnalyzingImages ? "⏳ Đang đọc..." : "⚡ Đọc AI toàn bộ ảnh chờ"}
                </button>
                <button className="btn ghost small" onClick={() => setShowImageReviewPanel(false)}>✕ Đóng</button>
              </div>
            </div>
            
            <div style={{margin: '12px 0', background: '#fff0f6', padding: '12px 16px', borderRadius: 8, border: '1px solid #f8bbd0', fontSize: 13, color: '#880e4f', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8}}>
              <div><b>📊 Tổng ảnh trong Room:</b> {getAllRoomImages().length} ảnh</div>
              <div><b>✅ Sẵn sàng / Đã vào Context:</b> {getAllRoomImages().filter(r => r.analysisStatus !== 'failed').length} ảnh</div>
              <div><b>❌ Lỗi đọc ảnh:</b> {getAllRoomImages().filter(r => r.analysisStatus === 'failed').length} ảnh</div>
            </div>

            <div style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4}}>
              {getAllRoomImages().length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px 20px', color: '#888', fontStyle: 'italic'}}>
                  Chưa có ảnh tham chiếu nào được tải lên trong phòng làm việc này.<br/>
                  Hãy upload ảnh vào Thẻ làm việc hoặc Style Analyzer để AI Vision phân tích.
                </div>
              ) : (
                getAllRoomImages().map((r: any, idx: number) => {
                  const isFailed = r.analysisStatus === 'failed';
                  const isAnalyzed = r.analysisStatus === 'analyzed';
                  return (
                    <div key={r.id || r.imageId || idx} style={{display: 'flex', gap: 12, padding: 12, background: '#fff', borderRadius: 8, border: !isFailed ? '1px solid #c8e6c9' : '1px solid #ffcdd2', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                      <img src={r.previewUrl || r.data || r.storageUrl} alt="" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0}} />
                      <div style={{flex: 1, minWidth: 0, fontSize: 13}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                          <b style={{color: '#880e4f', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.name || r.fileName || `Image #${idx+1}`}</b>
                          <span style={{padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: !isFailed ? '#e8f5e9' : '#ffebee', color: !isFailed ? '#2e7d32' : '#c62828'}}>
                            {isAnalyzed ? "✅ Đã đọc thành công" : (!isFailed ? "✅ Sẵn sàng trong Context" : "❌ Lỗi đọc ảnh")}
                          </span>
                        </div>
                        <div style={{fontSize: 12, color: '#555', marginBottom: 4}}>
                          <b>📁 Vị trí Thẻ (cardId):</b> <span style={{background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace'}}>{r.cardId}</span> — {r.cardTitle}
                        </div>
                        <div style={{background: '#fcfcfc', padding: '6px 8px', borderRadius: 6, border: '1px solid #eee', fontSize: 12, maxHeight: 60, overflowY: 'auto', color: '#333'}}>
                          <b>🧠 Image Analysis Text:</b> {r.imageAnalysisText || r.analysisResult || "Chưa có dữ liệu phân tích."}
                        </div>
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, flexShrink: 0}}>
                        <button className="btn ghost small" style={{fontSize: 11, padding: '4px 8px'}} onClick={() => {
                          setSelectedImgDetail(r);
                          setShowImageReviewPanel(false);
                        }}>🔍 Xem chi tiết</button>
                        <button 
                          className="btn small" 
                          style={{fontSize: 11, padding: '4px 8px', background: isAnalyzing ? '#ccc' : '#e91e63', color: '#fff'}} 
                          disabled={isAnalyzing}
                          onClick={async () => {
                            await analyzeSingleImage(r, r.cardId, r.cardTitle);
                          }}
                        >
                          🔄 Phân tích lại
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12}}>
              <button className="btn ghost small" onClick={() => setShowImageReviewPanel(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
