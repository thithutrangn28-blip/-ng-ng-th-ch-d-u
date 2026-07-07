import React, { useState, useRef, useEffect } from "react";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { PRESET_BACKGROUNDS, rooms as ROOMS_DATA } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { copyToClipboardSafe } from "../../lib/clipboard";
import { v4 as uuidv4 } from "uuid";
import StyleAnalyzer from "./StyleAnalyzer";
import { SafeImg } from "../../components/SafeImg";
import { compressImageFile } from "../../utils/imageCompressor";

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
    copyToClipboardSafe(text);
    toast?.(`💖 Vợ ơi, chồng đã copy xong ${label}!`, "success");
  };

  const handleCopyOneLine = () => {
    if (!cleanOneLinePrompt) {
      toast?.("Chưa có nội dung Prompt để copy vợ ơi!", "error");
      return;
    }
    copyToClipboardSafe(cleanOneLinePrompt);
    toast?.("⚡ Chồng đã copy trọn bộ Prompt gộp liền mạch cho vợ dán thẳng vào Midjourney/SD/Flux nhé!", "success");
  };

  const handleCopyFullText = () => {
    if (!rawText) {
      toast?.("Chưa có văn bản để copy vợ ơi!", "error");
      return;
    }
    copyToClipboardSafe(rawText);
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
              Vợ có thể sử dụng riêng từng phần bên dưới hoặc copy gộp liền mạch dán vào AI
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
              key={`part_${part.id}_${index}`}
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

const CodeDrawnBunny = ({ size = 20, color = "#ffffff", earColor = "#ff4081" }: { size?: number; color?: string; earColor?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M10 14C8.5 8 6 3 9 2C12 1 13 8 14 13C15 13 17 13 18 13C19 8 20 1 23 2C26 3 23.5 8 22 14" fill={earColor} stroke="#8c264e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="20" r="9" fill={color} stroke="#8c264e" strokeWidth="1.8" />
    <ellipse cx="13" cy="18.5" rx="1.2" ry="1.8" fill="#3e333e" />
    <ellipse cx="19" cy="18.5" rx="1.2" ry="1.8" fill="#3e333e" />
    <circle cx="12.5" cy="17.8" r="0.4" fill="#ffffff" />
    <circle cx="18.5" cy="17.8" r="0.4" fill="#ffffff" />
    <path d="M15.2 21.5C15.5 21.8 16.5 21.8 16.8 21.5" stroke="#8c264e" strokeWidth="1.2" strokeLinecap="round" />
    <ellipse cx="10.5" cy="21" rx="1.5" ry="1" fill="#ff80ab" opacity="0.6" />
    <ellipse cx="21.5" cy="21" rx="1.5" ry="1" fill="#ff80ab" opacity="0.6" />
  </svg>
);

function CardNoteInput({ cs, c, roomState, state, save }: any) {
  const [val, setVal] = useState(cs.note || "");
  
  useEffect(() => {
    setVal(cs.note || "");
  }, [cs.note]);

  return (
    <textarea 
      value={val} 
      onChange={(e) => { 
        setVal(e.target.value);
        if (!roomState.cards[c.id]) {
          roomState.cards[c.id] = { note: "", refs: [], output: "" };
        }
        roomState.cards[c.id].note = e.target.value; 
      }}
      onBlur={() => {
        save(state);
      }}
      placeholder={`Ví dụ yêu cầu cho ${c.title}...`}
    />
  );
}

export default function RoomView({ roomDef, roomState, currentStory, state, save, toast, onBack, onHome, onOpenDrawer, progress, setProgress, isCompactHeader, onToggleCompact, onOpenStoryForm }: any) {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);
  const [showPreset, setShowPreset] = useState(false);
  const [roomHeaderCollapsed, setRoomHeaderCollapsed] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visualTarget, setVisualTarget] = useState<"cover" | "avatar" | "background" | null>(null);
  const [selectedHistoryPayload, setSelectedHistoryPayload] = useState<any>(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [showImageReviewPanel, setShowImageReviewPanel] = useState(false);
  const [showStoryPinkCardsModal, setShowStoryPinkCardsModal] = useState(false);
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [previewTab, setPreviewTab] = useState<'human' | 'json'>('human');
  const [selectedFileDetail, setSelectedFileDetail] = useState<any>(null);
  const [selectedImgDetail, setSelectedImgDetail] = useState<any>(null);
  const [modalTab, setModalTab] = useState<'notes' | 'vision'>('notes');
  const [annText, setAnnText] = useState("");
  const [annColor, setAnnColor] = useState("#e91e63");
  const [annPlacement, setAnnPlacement] = useState<'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>("bottom");
  const [tempAnnCoords, setTempAnnCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  const updateImgDetailAnnotations = (updatedAnnotations: any[]) => {
    if (!selectedImgDetail) return;
    const updatedImg = { ...selectedImgDetail, annotations: updatedAnnotations };
    setSelectedImgDetail(updatedImg);

    const rs = { ...roomState };
    const cardId = selectedImgDetail.cardId;
    const imgId = selectedImgDetail.imageId || selectedImgDetail.id;

    let found = false;
    if (cardId === 'style_analyzer' && rs.styleAnalyzer?.refs) {
      rs.styleAnalyzer.refs = rs.styleAnalyzer.refs.map((x: any) => {
        if ((x.id || x.imageId) === imgId) {
          found = true;
          return { ...x, annotations: updatedAnnotations };
        }
        return x;
      });
    } else if (cardId && rs.cards?.[cardId]?.refs) {
      rs.cards[cardId].refs = rs.cards[cardId].refs.map((x: any) => {
        if ((x.id || x.imageId) === imgId) {
          found = true;
          return { ...x, annotations: updatedAnnotations };
        }
        return x;
      });
    }

    if (found) {
      currentStory.rooms[roomDef.id] = rs;
      save(state);
    }
  };

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
  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const [livePreviewText, setLivePreviewText] = useState<string>("");
  const [autoScrollPreview, setAutoScrollPreview] = useState<boolean>(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [isApiRunning, setIsApiRunning] = useState<boolean>(false);
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (apiAbortControllerRef.current) {
        apiAbortControllerRef.current.abort();
        apiAbortControllerRef.current = null;
      }
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      setProgress(0);
      setIsApiRunning(false);
    };
  }, [roomDef?.id]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      const rootEl = document.querySelector('.lipstick-root');
      if (rootEl) {
        rootEl.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
        rootEl.scrollTop = 0;
      }
      const appEl = document.querySelector('.app-container');
      if (appEl) {
        appEl.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
        appEl.scrollTop = 0;
      }
    } catch (e) {}
  }, [roomDef?.id]);

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

  const getBotCharactersList = () => {
    return currentStory.botCharacters && currentStory.botCharacters.length > 0
      ? currentStory.botCharacters
      : (currentStory.botProfiles ? [{
          characterId: "bot_01",
          displayName: "Bot Char",
          profileText: currentStory.botProfiles,
          referenceImages: []
        }] : []);
  };

  const getTargetLabel = (mode: string) => {
    if (mode === 'cinema_poster' || mode === 'poster_all') return '🎬 Poster Phim / Quảng Cáo (Toàn Bộ Char & User)';
    if (!mode || mode === 'bot' || mode === 'bot_all') return '👑 Tất cả Bot Char (Gộp chung)';
    if (mode === 'user') return '👤 {{user}} (Vợ yêu)';
    if (mode === 'couple' || mode === 'all_group') return '✨ Tất cả / Gộp chung Couple & Group';
    if (mode === 'background_only') return '🌄 Chỉ Background / Bối Cảnh (Không Nhân Vật)';
    if (mode === 'typo_graphic_only') return '🎨 Đồ Họa / Typography & Thiết Kế (Không Vẽ Người)';
    if (mode === 'cinematic_album_art') return '🎞️ Album Điện Ảnh & Nghệ Thuật Thị Giác (High-Art Photobook & Camera Mastery)';
    if (mode === 'canva_aboutme_mode') return '🖼️ Thiết Kế Canva / About Me Profile Card (Học Bố Cục - Tùy Biến Nội Dung)';
    if (mode === 'manga_webtoon_mode') return '📚 Trang Truyện Tranh / Webtoon Khổ Dài (Manga, Manhwa)';
    if (mode === 'fandom_merch_mode') return '🛍️ Góc Fandom & Merch (Bìa Truyện, Poster, Card, Móc Khóa)';
    if (mode === 'handmade_card_mode') return '💌 Thẻ & Thiệp Handmade (Thiệp Cưới, Quà Tặng, Love Card - Chữ Tiếng Việt)';
    if (mode === 'marketing_pr_mode') return '📢 PR Marketing & Bìa Quảng Cáo (Anime / Manhwa / Manhua Full Màu)';
    if (mode === 'bot_char_marketing_art_mode') return '🐰 Nghệ Thuật Của Nhân Vật Bot Char (Marketing & Điện Ảnh Kĩ Xảo)';
    if (mode === 'bot_char_hobbies_vibe_mode') return '🐰 Sở Thích Của Bot Char (Vibe & Hobbies - Không Vẽ Người)';
    if (roomDef?.id === 'bot_char_marketing_art' || roomDef?.id === 'bot_char_hobbies_vibe') {
      const isHobby = roomDef?.id === 'bot_char_hobbies_vibe';
      if (mode === 'bot_all' || !mode || mode === 'bot') {
        return isHobby ? '🐰 Gộp Chung Sở Thích & Vibe Tất Cả Bot Char (Group Vibe Space)' : '🐰 Gộp Chung Tất Cả Bot Char (Group Marketing & Điện Ảnh)';
      }
      if (mode.startsWith('bot_')) {
        const idx = parseInt(mode.split('_')[1], 10);
        const chars = getBotCharactersList();
        const c = chars[idx];
        const label = isHobby ? 'Solo Hobbies & Vibe - Không vẽ người' : 'Solo Marketing Art';
        return c ? `🐰 [Char #${idx + 1}]: ${c.displayName || 'Unnamed'} (${label})` : `🐰 [Char #${idx + 1}] (${label})`;
      }
    }
    if (mode.startsWith('bot_')) {
      const idx = parseInt(mode.split('_')[1], 10);
      const chars = getBotCharactersList();
      const c = chars[idx];
      return c ? `👑 [Char #${idx + 1}]: ${c.displayName || 'Unnamed'} (Tách lẻ)` : `👑 [Char #${idx + 1}] (Tách lẻ)`;
    }
    return mode;
  };

  const getTargetInstructions = (mode: string) => {
    const chars = getBotCharactersList();
    if (mode === 'bot_char_hobbies_vibe_mode' || roomDef?.id === 'bot_char_hobbies_vibe') {
      if (mode.startsWith('bot_')) {
        const idx = parseInt(mode.split('_')[1], 10);
        const c = chars[idx];
        const charName = c ? (c.displayName || `Bot Char #${idx + 1}`) : `Bot Char #${idx + 1}`;
        const charProfile = c ? (c.profileText || 'No description') : '';
        return `🐰 [ĐẶC QUYỀN SỞ THÍCH BOT CHAR - SOLO HOBBIES & VIBE SPACE CHO "${charName}"]:
👉 NHIỆM VỤ VIBE KHÔNG VẼ NGƯỜI CHỈ DÀNH CHO BOT CHAR: Tạo prompt xây dựng không gian sống, đồ vật yêu thích và sở thích cá nhân độc quyền cho nhân vật Bot Char: "${charName}" (Profile: ${charProfile})!
👉 CHI TIẾT SỞ THÍCH & VIBE: Ẩm thực đồ uống đặc chế, đồ sưu tầm, phòng làm việc/chơi game high-end RGB, phòng ngủ mang hơi ấm nhân vật, xe Moto/xe cộ cá tính, cặp vé xem phim, cuốn sách mở ra với ghi chú viết tay (handwritten notes), bookmark, ánh sáng volumetric cinematic, macro detail.
👉 TUYỆT ĐỐI 100% KHÔNG VẼ NGƯỜI: KHÔNG vẽ nhân vật, KHÔNG vẽ khuôn mặt, bàn tay hay cơ thể người! Tuân thủ chính xác 100% cốt truyện và hồ sơ sở thích, tính cách từ hồ sơ của "${charName}", kết hợp toàn bộ tư liệu ảnh tham chiếu đã đọc!`;
      }
      return `🐰 [ĐẶC QUYỀN SỞ THÍCH BOT CHAR - GỘP CHUNG SỞ THÍCH & VIBE TOÀN BỘ BOT CHAR]:
👉 NHIỆM VỤ VIBE KHÔNG VẼ NGƯỜI CHỈ DÀNH CHO BOT CHAR: Tạo prompt xây dựng không gian sống và sở thích gộp chung TẤT CẢ các nhân vật Bot Char (${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) trong một siêu phẩm thị giác!
👉 CHI TIẾT SỞ THÍCH & VIBE: Sự giao thoa không gian và đồ vật yêu thích giữa các Bot Char (ẩm thực, đồ sưu tầm, phòng làm việc, xe cộ, vé xem phim, ghi chú sách), ánh sáng volumetric cinematic lung linh, góc chụp macro nghệ thuật.
👉 TUYỆT ĐỐI 100% KHÔNG VẼ NGƯỜI: KHÔNG vẽ nhân vật, KHÔNG vẽ khuôn mặt, bàn tay hay cơ thể người! Ưu tiên 100% tuân thủ cốt truyện gốc, hồ sơ tính cách và tận dụng trọn vẹn tư liệu ảnh tham chiếu của tất cả Bot Char!`;
    }
    if (mode === 'bot_char_marketing_art_mode' || roomDef?.id === 'bot_char_marketing_art') {
      if (mode.startsWith('bot_')) {
        const idx = parseInt(mode.split('_')[1], 10);
        const c = chars[idx];
        const charName = c ? (c.displayName || `Bot Char #${idx + 1}`) : `Bot Char #${idx + 1}`;
        const charProfile = c ? (c.profileText || 'No description') : '';
        return `🐰 [ĐẶC QUYỀN NGHỆ THUẬT BOT CHAR - SOLO MARKETING ART CHO "${charName}"]:
👉 NHIỆM VỤ ĐỘC QUYỀN CHỈ DÀNH CHO BOT CHAR: Tạo prompt xây dựng bức ảnh quảng bá Marketing điện ảnh đỉnh cao độc quyền cho nhân vật Bot Char: "${charName}" (Profile: ${charProfile})!
👉 KHÍ CHẤT & TẠO HÌNH MARKETING: Tạo hình trang phục (Outfits) thời thượng, lộng lẫy, khí chất đỉnh cao, thần thái quyến rũ, body language tự tin lôi cuốn, ánh sáng volumetric cinematic, kĩ xảo hào quang rực rỡ.
👉 TUYỆT ĐỐI KHÔNG LẪN LỘN: KHÔNG vẽ Vợ Yêu ({{user}}) hay nhân vật người thật khác vào đây. KHÔNG vẽ truyện tranh manga nhiều khung, KHÔNG vẽ chibi. Tuân thủ chính xác 100% ngoại hình (màu tóc, màu mắt, khí chất) từ hồ sơ của "${charName}"!`;
      }
      return `🐰 [ĐẶC QUYỀN NGHỆ THUẬT BOT CHAR - GỘP CHUNG TOÀN BỘ BOT CHAR MARKETING ART]:
👉 NHIỆM VỤ ĐỘC QUYỀN CHỈ DÀNH CHO BOT CHAR: Tạo prompt xây dựng bức ảnh quảng bá Marketing điện ảnh đỉnh cao gộp chung TẤT CẢ các nhân vật Bot Char (${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) trong một khung hình siêu phẩm truyền thông!
👉 KHÍ CHẤT & TẠO HÌNH MARKETING: Thiết kế trang phục lộng lẫy, sự tương tác quyền lực giữa các Bot Char, ánh sáng volumetric cinematic lung linh, kĩ xảo thị giác ấn tượng, bố cục poster/tạp chí đẳng cấp.
👉 TUYỆT ĐỐI KHÔNG LẪN LỘN: KHÔNG vẽ Vợ Yêu ({{user}}) hay nhân vật người thật vào đây. KHÔNG vẽ truyện tranh manga nhiều khung, KHÔNG vẽ chibi. Ưu tiên 100% tuân thủ cốt truyện và đặc điểm ngoại hình, màu mắt, màu tóc gốc của từng Bot Char!`;
    }
    if (mode === 'background_only') {
      return `🌄 [DEDICATED BACKGROUND & SCENERY ONLY FOCUS - CHỈ BACKGROUND / BỐI CẢNH KHÔNG CÓ NHÂN VẬT]:
👉 THE MANDATORY GOAL: Focus exclusively on generating a breathtaking, highly detailed architectural, landscape, fantasy, or atmospheric background/environment concept art!
👉 ABSOLUTELY NO PEOPLE OR MAIN CHARACTERS: Do not include {{user}}, Bot Characters, or any foreground people in this prompt. If human presence is needed for scale, use tiny artistic silhouettes in the far distance.
👉 STORY & WORLD-BUILDING ADAPTATION: Deeply analyze the Story Text (cốt truyện chính) and setting descriptions to generate an environment that perfectly captures the mood, era, architecture, lighting, and world-building of the story!`;
    }
    if (mode === 'typo_graphic_only') {
      return `🎨 [DEDICATED GRAPHIC DESIGN, TYPOGRAPHY & NO-HUMAN ART FOCUS - ĐỒ HỌA NGHỆ THUẬT, TYPOGRAPHY & THIẾT KẾ KHÔNG VẼ NGƯỜI]:
👉 THE MANDATORY GOAL: Focus exclusively on generating a stunning graphic art piece, typographic poster, wedding/event invitation card, vintage cinema ticket, or emblem journal page!
👉 ABSOLUTELY NO HUMAN CHARACTERS OR FACES: Do not draw any humans, faces, bodies, or people! Even if the user uploads a reference image showing characters or people, YOU MUST ONLY extract the color palette, emotional vibe, aesthetic style, floral/architectural motifs, and decorative elements to represent the couple or story!
👉 SYMBOLIC COUPLE & STORY REPRESENTATION: Translate the romance, emotional connection, and personality of {{user}} and Bot Characters into typography styles (calligraphy, serif, Y2K, gothic), symbolic motifs (roses, crowns, sealing wax, ribbons, crests), and sophisticated graphic layout!`;
    }
    if (mode === 'cinematic_album_art') {
      return `🎞️ [DEDICATED CINEMA ALBUM, PHOTOBOOK COLLAGE & HIGH-ART VISUAL MASTERY FOCUS - ALBUM ẢNH ĐIỆN ẢNH & TƯ DUY MÁY ẢNH ĐỈNH CAO]:
👉 THE MANDATORY GOAL: Focus exclusively on generating a sophisticated, high-art cinematic album layout, editorial photobook spread, 35mm film strip sequence, or multi-frame contact sheet collage featuring {{user}} and Bot Characters!
👉 MASTERWORK CINEMATOGRAPHY & CAMERA LENS MASTERY: You must demonstrate exceptional visual intellect, camera mastery, and aesthetic taste! Combine multiple focal lengths across the album layout: intimate 85mm macro eye/lip/hand portraits, 35mm environmental fashion body shots, 24mm dramatic wide cinematic perspectives, and bold Dutch angle framing!
👉 VISUAL STORYTELLING & COLOR GRADING: Translate the romance, emotional connection, and timeline of the story into sequence frames. Describe world-class color grading, atmospheric volumetric lighting, nostalgic film grain, and clean editorial graphic balance without messy clutter!`;
    }
    if (mode === 'canva_aboutme_mode') {
      return `🖼️ [DEDICATED CANVA / ABOUT ME PROFILE CARD FOCUS - THIẾT KẾ CANVA ABOUT ME PROFILE CARD (HỌC HỎI BỐ CỤC ĐỈNH CAO - TÙY BIẾN NỘI DUNG)]:
👉 THE MANDATORY GOAL: Focus exclusively on generating an aesthetic Canva-style "About Me" Character Profile Card, Infographic Sheet, or Character Introduction Graphic Sheet for {{user}} or Bot Characters!
👉 REFERENCE LAYOUT INSPIRATION: You must analyze and get inspired by the reference image's UI structure, frame grid, graphic layout, typography placement, border styling, aesthetic vibe, camera angle, and visual composition!
👉 COMPLETE STORY CONTENT CUSTOMIZATION: While taking structural inspiration from the layout template, YOU MUST FULLY CUSTOMIZE THE INTERNAL CHARACTER & STORY DETAILS! You must incorporate the exact character appearance, facial features, outfits, text descriptors, stats, lore, and background details from the Story Text (cốt truyện chính) and Character Profiles of {{user}} and Bot Characters!
👉 SEAMLESS ARTISTIC INTEGRATION: The result must look like a custom, bespoke, professionally designed Canva profile sheet built from scratch specifically for your story characters, achieving a harmonious and high-fashion aesthetic!`;
    }
    if (mode === 'manga_webtoon_mode') {
      return `📚 [DEDICATED MANGA / WEBTOON COMIC PAGE FOCUS - TRANG TRUYỆN TRANH KHỔ DÀI, MANHWA / MANGA (BÁM SÁT NÉT THAM CHIẾU)]:
👉 THE MANDATORY GOAL: Focus exclusively on generating a multi-panel comic page, vertical scrolling Webtoon, or high-art Manhwa/Manga layout for {{user}} and Bot Characters!
👉 ART STYLE & REFERENCE FIDELITY: You must strictly analyze and capture 100% of the reference image's art style! If the reference is Korean Manhwa, Japanese Manga, or detailed Chinese Manhua, adapt that exact coloring technique, linework, and aesthetic vibe without losing fidelity!
👉 SMART PANEL LAYOUT & CINEMATIC PACING: Design an intelligent panel structure (khung truyện) with dynamic, overlapping, or clean geometric borders. Avoid clustered or broken panel lines!
👉 DYNAMIC POSES & VISUAL STORYTELLING: Implement diverse camera angles across panels (e.g., emotive close-ups, dynamic action full-body shots, high/low angles) and smart character poses to visually tell the story sequence effectively.`;
    }
    if (mode === 'fandom_merch_mode') {
      return `🛍️ [DEDICATED FANDOM MERCHANDISE & COLLECTOR ROOM FOCUS - GÓC SƯU TẦM FANDOM, TRUYỆN TRANH, POSTER, CARD CỦA IDOL]:
👉 THE MANDATORY GOAL: Focus exclusively on generating an aesthetic fandom space, merchandise collection, or published comic media featuring {{user}} and Bot Characters as famous fictional icons!
👉 MERCHANDISE & MEDIA INCORPORATION: You must heavily feature fandom artifacts such as colored comic book covers, open manga pages on a desk, large wall posters, aesthetic photocards (card bo góc), acrylic standees, smartphone keychains, or glowing phone wallpapers displaying the characters!
👉 ENVIRONMENTAL AESTHETIC: Set the scene in a cozy collector's room, an otaku bedroom, or an aesthetic study desk illuminated by warm lofi lighting, sunset lamps, or natural window light.
👉 ARTISTIC FIDELITY & PRINT QUALITY: Render the merchandise realistically or in a highly stylized 3D/Anime style. Ensure the character illustrations printed ON the posters, covers, and cards are vivid, recognizable, and perfectly integrated into the environment.`;
    }
    if (mode === 'handmade_card_mode') {
      return `💌 [DEDICATED HANDMADE CARD / STATIONERY FOCUS - THIỆP THỦ CÔNG, THIỆP CƯỚI, CARD QUÀ TẶNG (BÁM SÁT ẢNH THAM CHIẾU & CHỮ TIẾNG VIỆT)]:
👉 THE MANDATORY GOAL: Focus exclusively on designing a handcrafted greeting card, luxury wedding invitation, or romantic love card celebrating the story of {{user}} and Bot Characters!
👉 VIETNAMESE TYPOGRAPHY & CALLIGRAPHY: You must include artistic Vietnamese text (chữ tiếng Việt ý nghĩa theo cốt truyện, ví dụ: lời thề hẹn, câu thơ định tình, tên cặp đôi) rendered in elegant calligraphy, handwritten script, or ornate serif typography.
👉 HANDMADE CRAFT TEXTURES & DECORATION: Describe premium stationery details such as textured art paper (giấy mỹ thuật có vân), deckled/torn edges (viền xé tay), shimmering gold foil stamping (ép kim vàng), dried rose petals, silk ribbon bows, and vintage crimson wax seal stamps (dấu sáp đỏ).
👉 REFERENCE ADAPTATION & ANTI-HUMAN FIGURE OPTION: Study the reference image's color palette, floral motifs, layout, and mood. If the user or room rules specify a graphic/stationery focus without drawing human characters, translate their romance entirely through abstract stationery art, symbolic motifs, and romantic atmosphere!`;
    }
    if (mode === 'marketing_pr_mode') {
      return `📢 [DEDICATED PR MARKETING & PROMOTIONAL ANIME/MANHWA/MANHUA COVER FOCUS - BÌA QUẢNG CÁO, POSTER, CANVA, ĐIỆN ẢNH, KĨ XẢO & OUTFITS (ƯU TIÊN CỐT TRUYỆN GỐC)]:
👉 THE MANDATORY GOAL: Focus exclusively on generating an impactful PR marketing campaign, promotional comic cover, movie poster, or Canva graphic layout featuring {{user}}, Bot Characters, and supporting characters!
👉 CORE MANDATE - STORY & CHARACTER PROFILE PRIORITY ABOVE ALL ELSE: The reference images are attached STRICTLY for learning layout structure, cinematic lighting, color grading, and dynamic angles. HOWEVER, THE MOST IMPORTANT AND PARAMOUNT PRIORITY ABOVE EVERYTHING ELSE IS THE USER'S ORIGINAL STORY LORE AND CUSTOM CHARACTER PROFILES! You must transform, improvise, and adapt the reference visual ideas so they 100% serve and glorify the user's bespoke characters, story timeline, and established relationships!
👉 ENSEMBLE CAST & SUPPORTING CHARACTERS: Include both main characters and supporting cast members (allies, rivals, mysterious figures) interacting dynamically within the promotional layout.
👉 CINEMATIC VFX, OUTFITS & TYPOGRAPHY: Integrate stylish high-fashion or concept-specific outfits, stunning visual effects (glowing aura, magical light beams, lens flare, stardust, depth of field), and artistic typography mockups (Vietnamese or English promotional titles and taglines).`;
    }
    if (mode === 'cinema_poster' || mode === 'poster_all') {
      return `🎬 [DEDICATED CINEMA / ANIME / COMIC MOVIE POSTER & CAMPAIGN ENSEMBLE FOCUS - POSTER PHIM / QUẢNG CÁO TỔNG THỂ TOÀN BỘ NHÂN VẬT]:
👉 THE MANDATORY GOAL: Generate a grand, highly cinematic, promotional movie poster or campaign artwork that includes ALL MAIN CHARACTERS (Both {{user}} and ALL Bot Characters: ${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) together in one dynamic, epic composition!
👉 REFERENCE IMAGE ADAPTATION RULE (CRITICAL FOR POSTER MODE): Even if the reference image provided by the user shows ONLY ONE person or a simple portrait, YOU MUST NOT limit the output to one character! Instead, EXTRACT the art style, aesthetic vibe, lighting, color grading, and medium from the reference image (whether it is Realistic Cinema, Japanese Anime, Comic Book Art, 3D CGI Animation, or Editorial Advertising), and EXPAND it into a multi-character promotional poster featuring ALL characters!
👉 STORY & PROFILE INTEGRATION (MANDATORY): Deeply analyze the Story Text (cốt truyện chính) and Character Profiles (hồ sơ của {{user}} and all Bot Characters). You must position each character in the poster hierarchy based on their lore, personality, and relationship dynamic (e.g., protagonist front and center, antagonist looming in the background or side profile, supporting characters in action poses or emotional interactions).
👉 POSTER ELEMENTS TO SPECIFY IN PROMPT:
   - Composition & Layout: Movie poster hierarchy, dramatic depth of field, foreground/midground/background placement.
   - Lighting & Atmosphere: Cinematic volumetric lighting, lens flare, mood shadows, or graphic comic contrast matching the reference style.
   - Typography & Title Framing: Suggest where the movie/story title logo and promotional tagline would sit naturally without obscuring character faces.
   - Emotional Resonance: Capturing the overarching theme and climax of the story in a single advertising visual!`;
    }
    if (!mode || mode === 'bot' || mode === 'bot_all') {
      return `👑 ALL BOT CHARACTERS COMBINED: Include all main bot characters (${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) together in the generated prompt scene, maintaining their individual identities and dynamics.`;
    }
    if (mode === 'user') {
      return `👤 USER PROFILE FOCUS ({{user}}): Focus exclusively on generating the prompt for {{user}}, highlighting their specific styling, aura, and visual appearance as defined in the user profile.`;
    }
    if (mode === 'couple' || mode === 'all_group') {
      return `✨ COUPLE / GROUP ENSEMBLE FOCUS: Generate a multi-character scene combining all main Bot Characters (${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) and {{user}} together in a cohesive group/couple composition with harmonious spatial interaction and emotional chemistry.`;
    }
    if (mode.startsWith('bot_')) {
      const idx = parseInt(mode.split('_')[1], 10);
      const c = chars[idx];
      const charName = c ? (c.displayName || `Bot Char #${idx + 1}`) : `Bot Char #${idx + 1}`;
      const charProfile = c ? (c.profileText || 'No description') : '';
      return `🚨 [EXPLICIT ISOLATED TARGET CHARACTER - TÁCH LẺ NHÂN VẬT]: The user explicitly selected to generate this room/prompt SOLELY AND EXCLUSIVELY for Bot Character #${idx + 1}: "${charName}"!
👉 YOU MUST ISOLATE AND GENERATE ALL PROMPT TRAITS ONLY FOR THIS SPECIFIC CHARACTER ("${charName}" - Profile: ${charProfile})!
👉 DO NOT include side characters, do NOT include other bot characters, and do NOT combine them into a couple/group scene unless the user note in the card explicitly requests interaction. This is an isolated character prompt generation!`;
    }
    return `Focus on targeted mode: ${mode}`;
  };

  const renderTargetSelector = (isBanner = false) => {
    const chars = getBotCharactersList();
    if (roomDef?.id === 'bot_char_marketing_art' || roomDef?.id === 'bot_char_hobbies_vibe') {
      const isHobby = roomDef?.id === 'bot_char_hobbies_vibe';
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: isBanner ? '12px' : '8px',
          background: isHobby ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff0f6 0%, #ffe6f0 100%)',
          padding: '14px',
          borderRadius: '16px',
          border: isHobby ? '2px solid #10b981' : '2px solid #d23a73',
          boxShadow: isHobby ? '0 4px 16px rgba(16, 185, 129, 0.15)' : '0 4px 16px rgba(210, 58, 115, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: isHobby ? '#065f46' : '#8c264e', lineHeight: 1.4 }}>
            <CodeDrawnBunny size={24} color="#ffffff" earColor={isHobby ? "#34d399" : "#ff4081"} />
            <span>{isHobby 
              ? '✨ [Sở Thích & Vibe Bot Char - Độc Quyền Không Vẽ Người]: Hạng mục vibe tập trung vào ẩm thực, đồ sưu tầm, phòng làm việc/chơi game, xe Moto, vé xem phim, ghi chú sách... của Bot Char (KHÔNG vẽ nhân vật). Vui lòng dùng nút hình con thỏ vẽ bằng code dưới đây để chọn Bot Char trước khi bấm Gửi API Proxy:'
              : '✨ [Nghệ Thuật Bot Char - Độc Quyền]: Hạng mục này CHỈ DÀNH RIÊNG CHO BOT CHAR (Nhân vật chính AI). Vui lòng dùng nút hình con thỏ (vẽ bằng code) dưới đây để chọn từng nhân vật hoặc gộp chung trước khi bấm Gửi API Proxy:'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              className={`target-option ${(roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? 'active' : ''}`}
              onClick={() => { roomState.targetMode = 'bot_all'; save(state); }}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: (roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? (isHobby ? '2px solid #10b981' : '2px solid #d23a73') : (isHobby ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(210, 58, 115, 0.4)'),
                background: (roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? (isHobby ? '#10b981' : '#d23a73') : '#ffffff',
                color: (roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? '#ffffff' : (isHobby ? '#10b981' : '#d23a73'),
                boxShadow: (roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? (isHobby ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(210, 58, 115, 0.3)') : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CodeDrawnBunny size={18} color={(roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? '#ffffff' : (isHobby ? '#d1fae5' : '#ffe0b2')} earColor={(roomState.targetMode === 'bot_all' || !roomState.targetMode || roomState.targetMode === 'bot') ? (isHobby ? '#6ee7b7' : '#ff80ab') : (isHobby ? '#10b981' : '#ff4081')} />
              {isHobby ? 'Gộp chung sở thích & vibe tất cả Bot Char (Group Vibe Space)' : 'Gộp chung tất cả Bot Char (Group Marketing Art)'}
            </button>
            {chars.map((char: any, idx: number) => {
              const modeKey = `bot_${idx}`;
              const isActive = roomState.targetMode === modeKey;
              return (
                <button
                  key={`mode_bot_art_${modeKey}_${idx}`}
                  className={`target-option ${isActive ? 'active' : ''}`}
                  onClick={() => { roomState.targetMode = modeKey; save(state); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    fontSize: '0.9rem',
                    border: isActive ? (isHobby ? '2px solid #10b981' : '2px solid #d23a73') : (isHobby ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(210, 58, 115, 0.4)'),
                    background: isActive ? (isHobby ? '#10b981' : '#d23a73') : '#ffffff',
                    color: isActive ? '#ffffff' : (isHobby ? '#10b981' : '#d23a73'),
                    boxShadow: isActive ? (isHobby ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(210, 58, 115, 0.3)') : 'none',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CodeDrawnBunny size={18} color={isActive ? '#ffffff' : (isHobby ? '#d1fae5' : '#ffe0b2')} earColor={isActive ? (isHobby ? '#6ee7b7' : '#ff80ab') : (isHobby ? '#10b981' : '#ff4081')} />
                  [Char #{idx + 1}]: {char.displayName || `Nhân vật ${idx + 1}`} ({isHobby ? 'Solo Hobbies & Vibe' : 'Solo Marketing Art'})
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: isBanner ? '12px' : '8px'
      }}>
        <button 
          className={`target-option ${(roomState.targetMode === 'cinema_poster' || roomState.targetMode === 'poster_all') ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'cinema_poster'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (roomState.targetMode === 'cinema_poster' || roomState.targetMode === 'poster_all') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (roomState.targetMode === 'cinema_poster' || roomState.targetMode === 'poster_all') ? 'linear-gradient(135deg, #d23a73 0%, #8c264e 100%)' : '#ffffff',
            color: (roomState.targetMode === 'cinema_poster' || roomState.targetMode === 'poster_all') ? '#ffffff' : '#8c526b',
            boxShadow: (roomState.targetMode === 'cinema_poster' || roomState.targetMode === 'poster_all') ? '0 4px 14px rgba(210, 58, 115, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎬 Poster Phim / Quảng Cáo (Toàn Bộ Char & User)
        </button>

        <button 
          className={`target-option ${(roomState.targetMode === 'all_group' || roomState.targetMode === 'couple') ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'all_group'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (roomState.targetMode === 'all_group' || roomState.targetMode === 'couple') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (roomState.targetMode === 'all_group' || roomState.targetMode === 'couple') ? '#d23a73' : '#ffffff',
            color: (roomState.targetMode === 'all_group' || roomState.targetMode === 'couple') ? '#ffffff' : '#8c526b',
            boxShadow: (roomState.targetMode === 'all_group' || roomState.targetMode === 'couple') ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          ✨ Tất cả / Gộp chung (Couple/Group)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'user' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'user'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'user' ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: roomState.targetMode === 'user' ? '#d23a73' : '#ffffff',
            color: roomState.targetMode === 'user' ? '#ffffff' : '#8c526b',
            boxShadow: roomState.targetMode === 'user' ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          👤 {'{{user}}'} (Vợ yêu)
        </button>

        <button 
          className={`target-option ${(roomState.targetMode === 'bot' || roomState.targetMode === 'bot_all') ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'bot_all'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (roomState.targetMode === 'bot' || roomState.targetMode === 'bot_all') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (roomState.targetMode === 'bot' || roomState.targetMode === 'bot_all') ? '#d23a73' : '#ffffff',
            color: (roomState.targetMode === 'bot' || roomState.targetMode === 'bot_all') ? '#ffffff' : '#8c526b',
            boxShadow: (roomState.targetMode === 'bot' || roomState.targetMode === 'bot_all') ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          👑 Tất cả Bot Char (Gộp chung Bot)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'background_only' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'background_only'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'background_only' ? '2px solid #009688' : '1px solid rgba(0, 150, 136, 0.4)',
            background: roomState.targetMode === 'background_only' ? 'linear-gradient(135deg, #009688 0%, #00796b 100%)' : '#ffffff',
            color: roomState.targetMode === 'background_only' ? '#ffffff' : '#00796b',
            boxShadow: roomState.targetMode === 'background_only' ? '0 4px 14px rgba(0, 150, 136, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🌄 Chỉ Background / Bối Cảnh (Không Nhân Vật)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'typo_graphic_only' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'typo_graphic_only'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'typo_graphic_only' ? '2px solid #7e57c2' : '1px solid rgba(126, 87, 194, 0.4)',
            background: roomState.targetMode === 'typo_graphic_only' ? 'linear-gradient(135deg, #7e57c2 0%, #512da8 100%)' : '#ffffff',
            color: roomState.targetMode === 'typo_graphic_only' ? '#ffffff' : '#512da8',
            boxShadow: roomState.targetMode === 'typo_graphic_only' ? '0 4px 14px rgba(126, 87, 194, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎨 Đồ Họa / Typography & Thiết Kế (Không Vẽ Người)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'cinematic_album_art' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'cinematic_album_art'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'cinematic_album_art' ? '2px solid #a83258' : '1px solid rgba(168, 50, 88, 0.4)',
            background: roomState.targetMode === 'cinematic_album_art' ? 'linear-gradient(135deg, #a83258 0%, #800020 100%)' : '#ffffff',
            color: roomState.targetMode === 'cinematic_album_art' ? '#ffffff' : '#800020',
            boxShadow: roomState.targetMode === 'cinematic_album_art' ? '0 4px 14px rgba(168, 50, 88, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎞️ Album Điện Ảnh & Nghệ Thuật Thị Giác
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'canva_aboutme_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'canva_aboutme_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'canva_aboutme_mode' ? '2px solid #00c4cc' : '1px solid rgba(0, 196, 204, 0.4)',
            background: roomState.targetMode === 'canva_aboutme_mode' ? 'linear-gradient(135deg, #00c4cc 0%, #7d2ae8 100%)' : '#ffffff',
            color: roomState.targetMode === 'canva_aboutme_mode' ? '#ffffff' : '#5b1fc4',
            boxShadow: roomState.targetMode === 'canva_aboutme_mode' ? '0 4px 14px rgba(0, 196, 204, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🖼️ Thiết Kế Canva / About Me Profile Card
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'manga_webtoon_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'manga_webtoon_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'manga_webtoon_mode' ? '2px solid #ff9800' : '1px solid rgba(255, 152, 0, 0.4)',
            background: roomState.targetMode === 'manga_webtoon_mode' ? 'linear-gradient(135deg, #ff9800 0%, #ed6c02 100%)' : '#ffffff',
            color: roomState.targetMode === 'manga_webtoon_mode' ? '#ffffff' : '#e65100',
            boxShadow: roomState.targetMode === 'manga_webtoon_mode' ? '0 4px 14px rgba(255, 152, 0, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          📚 Trang Truyện Tranh / Webtoon Khổ Dài
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'fandom_merch_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'fandom_merch_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'fandom_merch_mode' ? '2px solid #ec4899' : '1px solid rgba(236, 72, 153, 0.4)',
            background: roomState.targetMode === 'fandom_merch_mode' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : '#ffffff',
            color: roomState.targetMode === 'fandom_merch_mode' ? '#ffffff' : '#9d174d',
            boxShadow: roomState.targetMode === 'fandom_merch_mode' ? '0 4px 14px rgba(236, 72, 153, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🛍️ Góc Fandom & Merch (Bìa Truyện, Poster, Card)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'handmade_card_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'handmade_card_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'handmade_card_mode' ? '2px solid #f43f5e' : '1px solid rgba(244, 63, 94, 0.4)',
            background: roomState.targetMode === 'handmade_card_mode' ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' : '#ffffff',
            color: roomState.targetMode === 'handmade_card_mode' ? '#ffffff' : '#9f1239',
            boxShadow: roomState.targetMode === 'handmade_card_mode' ? '0 4px 14px rgba(244, 63, 94, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          💌 Thẻ & Thiệp Handmade (Thiệp Cưới, Love Card)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'marketing_pr_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'marketing_pr_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'marketing_pr_mode' ? '2px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.4)',
            background: roomState.targetMode === 'marketing_pr_mode' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : '#ffffff',
            color: roomState.targetMode === 'marketing_pr_mode' ? '#ffffff' : '#5b21b6',
            boxShadow: roomState.targetMode === 'marketing_pr_mode' ? '0 4px 14px rgba(139, 92, 246, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          📢 PR Marketing & Bìa Quảng Cáo (Anime / Manhwa)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'bot_char_marketing_art_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'bot_char_marketing_art_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'bot_char_marketing_art_mode' ? '2px solid #d23a73' : '1px solid rgba(210, 58, 115, 0.4)',
            background: roomState.targetMode === 'bot_char_marketing_art_mode' ? 'linear-gradient(135deg, #d23a73 0%, #ff4081 100%)' : '#ffffff',
            color: roomState.targetMode === 'bot_char_marketing_art_mode' ? '#ffffff' : '#d23a73',
            boxShadow: roomState.targetMode === 'bot_char_marketing_art_mode' ? '0 4px 14px rgba(210, 58, 115, 0.4)' : 'none',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CodeDrawnBunny size={18} color={roomState.targetMode === 'bot_char_marketing_art_mode' ? '#ffffff' : '#ffe0b2'} earColor={roomState.targetMode === 'bot_char_marketing_art_mode' ? '#ff80ab' : '#ff4081'} />
          🐰 Nghệ Thuật Bot Char (Marketing & Điện Ảnh)
        </button>

        <button 
          className={`target-option ${roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? 'active' : ''}`}
          onClick={() => { roomState.targetMode = 'bot_char_hobbies_vibe_mode'; save(state); }}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.4)',
            background: roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
            color: roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? '#ffffff' : '#10b981',
            boxShadow: roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CodeDrawnBunny size={18} color={roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? '#ffffff' : '#d1fae5'} earColor={roomState.targetMode === 'bot_char_hobbies_vibe_mode' ? '#6ee7b7' : '#10b981'} />
          🐰 Sở Thích Bot Char (Vibe & Hobbies)
        </button>

        {chars.map((char: any, idx: number) => {
          const modeKey = `bot_${idx}`;
          const isActive = roomState.targetMode === modeKey;
          return (
            <button
              key={`mode_${modeKey}_${idx}`}
              className={`target-option ${isActive ? 'active' : ''}`}
              onClick={() => { roomState.targetMode = modeKey; save(state); }}
              style={{
                padding: '8px 16px', 
                borderRadius: '14px', 
                fontSize: '0.9rem',
                border: isActive ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
                background: isActive ? '#d23a73' : '#ffffff',
                color: isActive ? '#ffffff' : '#8c526b',
                boxShadow: isActive ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CodeDrawnBunny size={18} color={isActive ? '#ffffff' : '#ffe0b2'} earColor={isActive ? '#ff80ab' : '#ff4081'} />
              [Char #{idx + 1}]: {char.displayName || `Nhân vật ${idx + 1}`} (Tách lẻ)
            </button>
          );
        })}
      </div>
    );
  };

  const buildContextPayload = () => {
    const rs = roomState;
    const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
    const target = rs.targetMode || 'bot';
    const cards = roomDef.cards || [];
    
    const botCharactersList = getBotCharactersList();

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
      data: r.data || r.previewUrl || r.storageUrl,
      previewUrl: r.previewUrl || r.data || r.storageUrl,
      storageUrl: r.storageUrl || r.data || r.previewUrl,
      analysisStatus: r.analysisStatus || (r.imageAnalysisText ? 'analyzed' : 'pending'),
      imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích",
      imageAnalysisJson: r.imageAnalysisJson || null,
      annotations: r.annotations || []
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
        else if (roomDef?.id === 'marketing_pr_anime' || roomDef?.id === 'bot_char_marketing_art' || idLower.includes('marketing') || idLower.includes('pr') || idLower.includes('quảng cáo') || titleLower.includes('marketing') || titleLower.includes('pr') || titleLower.includes('quảng cáo') || titleLower.includes('bìa anime')) purp = "marketing_pr_reference (học hỏi cảm hứng bố cục, ánh sáng, góc độ từ mẫu nhưng quan trọng nhất và trên hết là biến đổi ứng biến 100% để phục vụ câu chuyện và hồ sơ nhân vật nguyên bản do bạn thiết lập)";
        else if (roomDef?.id === 'bot_char_hobbies_vibe' || idLower.includes('hobby') || idLower.includes('sở thích') || idLower.includes('vibe') || titleLower.includes('sở thích') || titleLower.includes('vibe') || titleLower.includes('ẩm thực') || titleLower.includes('phòng làm việc') || titleLower.includes('xe moto')) purp = "bot_char_hobbies_vibe_reference (tư liệu ảnh tham chiếu bắt buộc để phân tích sở thích, phong cách sống, đồ vật yêu thích, không gian phòng làm việc/chơi game/ngủ/xe cộ/vé xem phim/ghi chú sách của Bot Char theo hồ sơ câu chuyện gốc - TUYỆT ĐỐI KHÔNG VẼ NHÂN VẬT, CHỈ VẼ KHÔNG GIAN VÀ ĐỒ VẬT VIBE)";
        else if (roomDef?.id === 'manga_webtoon' || idLower.includes('manga') || idLower.includes('webtoon') || titleLower.includes('truyện tranh') || titleLower.includes('webtoon')) purp = "manga_webtoon_reference (học hỏi nét vẽ truyện tranh, phân khung, style manhwa/manga, bắt trọn art style và cách kể chuyện)";
        else if (idLower.includes('fandom') || idLower.includes('merch') || titleLower.includes('sưu tầm') || titleLower.includes('poster')) purp = "fandom_merch_reference (học hỏi cảm hứng trang trí phòng fan, sắp xếp góc học tập, cách bày trí ấn phẩm như bìa truyện, móc khóa, card)";
        else if (idLower.includes('album') || idLower.includes('photobook') || titleLower.includes('album') || titleLower.includes('điện ảnh') || titleLower.includes('collage')) purp = "album_reference (học hỏi cách dàn trang photobook, bố cục collage nhiều ảnh, ánh sáng và màu sắc điện ảnh)";
        else if (idLower.includes('canva') || idLower.includes('aboutme') || titleLower.includes('canva') || titleLower.includes('about me') || titleLower.includes('profile')) purp = "canva_layout_reference (học hỏi cảm hứng dàn trang và cấu trúc khung hình UI từ mẫu, tùy biến hoàn toàn nhân vật và thông tin theo hồ sơ câu chuyện)";
        else if (idLower.includes('handmade') || idLower.includes('card') || titleLower.includes('thiệp') || titleLower.includes('quà tặng')) purp = "handmade_card_reference (học hỏi bố cục thiệp thủ công, chất liệu giấy, cách phối hoa văn, ruy băng và màu sắc từ mẫu để tạo thiệp handmade ý nghĩa)";
        else if (idLower.includes('soul') || titleLower.includes('biết nói') || titleLower.includes('tự sự') || titleLower.includes('hạnh hiểu') || titleLower.includes('chiều sâu')) purp = "soulful_storytelling_reference (học hỏi triệt để tinh hoa ánh sáng, bố cục, khí quyển và thần thái tự sự từ ảnh mẫu để khắc họa chiều sâu nội tâm nghệ thuật, sáng tạo phong cách riêng)";
        else if (idLower.includes('learn') || idLower.includes('master-ref') || idLower.includes('custom-design') || idLower.includes('p1') || idLower.includes('p2') || idLower.includes('p3') || idLower.includes('p4') || idLower.includes('p5') || idLower.includes('p6') || idLower.includes('p7') || idLower.includes('p8') || idLower.includes('p9') || idLower.includes('p10') || idLower.includes('poses10') || idLower.includes('pose-guard') || titleLower.includes('học hỏi') || titleLower.includes('10 dáng') || titleLower.includes('tùy biến nguyên bản')) purp = "inspiration_learning_reference (học hỏi cấu trúc thị giác, góc chụp, dáng, nét vẽ và bố cục để sáng tạo tác phẩm mang dấu ấn riêng biệt của nhân vật)";

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
          data: r.data || r.previewUrl || r.storageUrl,
          previewUrl: r.previewUrl || r.data || r.storageUrl,
          storageUrl: r.storageUrl || r.data || r.previewUrl,
          analysisStatus: r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending'),
          imageAnalysisText: r.imageAnalysisText || r.analysisResult || "Chưa phân tích",
          imageAnalysisJson: r.imageAnalysisJson || null,
          annotations: r.annotations || []
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
      data: r.data || r.previewUrl || r.storageUrl,
      previewUrl: r.previewUrl || r.data || r.storageUrl,
      storageUrl: r.storageUrl || r.data || r.previewUrl,
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
      imageAnalysisText: img.imageAnalysisText,
      annotations: img.annotations || []
    }));

    return {
      feature: "Lipstick Prompt Rooms",
      task: "write_image_prompt",
      apiMode: "use_existing_app_api_settings",
      referenceImageStudyPolicy: {
        mandate: "BÁM SÁT ẢNH THAM CHIẾU ĐỂ HỌC HỎI VÀ ỨNG DỤNG TRỰC TIẾP VÀO CỐT TRUYỆN (NO NO CÁC VẤN ĐỀ KHÁC)",
        instruction: "Toàn bộ ảnh tham chiếu đính kèm trong phòng, Style Analyzer, hay hồ sơ nhân vật đều là tư liệu thẩm mỹ sáng tạo hợp lệ do người dùng cung cấp để học hỏi nét vẽ, bố cục, góc chụp, ánh sáng và màu sắc. Phải tiếp nhận toàn bộ ảnh vào Context Window để ứng dụng và xây dựng từ ý tưởng đó, tạo tác phẩm mới và tuyệt đối phục vụ câu chuyện độc quyền của người dùng.",
        storyOriginality: "100% Nguyên bản nhân vật và cốt truyện theo hồ sơ câu chuyện của người dùng",
        styleApplication: "85%–95% bám sát cấu trúc thị giác, góc chụp, bố cục, dáng pose và màu sắc từ ảnh tham chiếu để tạo ra tác phẩm mang dấu ấn riêng"
      },
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
        label: getTargetLabel(target),
        keywords: getTargetInstructions(target)
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
        finalStoryContext: `=== 1. MANUAL STORY & CHARACTERS ===\nPlot: ${manualInput.storyText}\nUser Profile: ${manualInput.userProfile}\nBot Characters (${botCharactersList.length}):\n${botCharsFormatted}\nSide Characters: ${manualInput.sideCharacters}\nRequirements: ${manualInput.imageRequirements}\n\n=== 2. IMPORTED FILES (${importedFiles.length} files) ===\n${importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus}]\n${f.summary ? `Summary: ${f.summary}\n` : ""}${f.extractedText}`).join("\n\n---\n\n")}` + (() => {
          const imagesWithAnnotations = allImages.filter((img: any) => img.annotations && img.annotations.length > 0);
          const annotationsText = imagesWithAnnotations.map((img: any) => {
            const notes = img.annotations.map((ann: any, index: number) => {
              return `  - Note #${index + 1} (${ann.placement || 'at position'}): "${ann.text}" [Color: ${ann.color || 'default'}]`;
            }).join("\n");
            return `[Reference Image: ${img.fileName} | Purpose: ${img.purpose}]\n${notes}`;
          }).join("\n\n");
          return annotationsText 
            ? `\n\n=== 3. REFERENCE IMAGES HANDWRITTEN NOTES & ANNOTATIONS ===\nBelow are specific handwritten annotations/diary notes placed on visual parts of the reference images by the user. You MUST study these visual annotations, incorporate them directly into the visual description, and respect them:\n${annotationsText}`
            : "";
        })()
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
      outputRequirement: "Return final production-ready image prompt only."
    };
  };

  const handleVisualChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && visualTarget) {
      try {
        const res = await compressImageFile(file, 1024, 1024, 0.8);
        const rs = { ...roomState };
        rs[visualTarget] = res;
        currentStory.rooms[roomDef.id] = rs;
        if (!currentStory.files) currentStory.files = [];
        if (!currentStory.files.includes(res)) {
          currentStory.files.unshift(res);
        }
        save(state);
        toast(visualTarget === "background" ? "🌸 Đã đặt và lưu hình nền phòng làm việc vào DB thành công!" : "Đã cập nhật hình ảnh phòng.");
      } catch (err) {
        toast("❌ Lỗi xử lý ảnh: " + (err as any)?.message);
      }
    }
  };

  const toBase64 = async (file: File): Promise<string> => {
    try {
      return await compressImageFile(file, 1024, 1024, 0.8);
    } catch (e) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    }
  };

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
You MUST analyze and extract the visual traits from this reference image to support downstream AI image generation under the core rule: "Aesthetic Study & Visual Reference Principle (High aesthetic style fidelity, transformative adaptation for bespoke character originality)":
CRITICAL RULE: The reference image is used to learn visual language and aesthetic DNA (art style, rendering, mood, line quality, lighting, color palette, outfit spirit, composition rhythm, EXACT CAMERA ANGLE, PERSPECTIVE, FRAMING, DEPTH OF FIELD, and EXACT BODY POSE / STANCE / GESTURE). When operating in the Reference Learning room ('learn'), 10 Pose Variations room ('poses10'), Soulful Storytelling room ('soulful'), or with inspiration references, you MUST provide aesthetic study and structural learning: extract the artistic techniques, camera work, visual flow (đường thị giác), lighting atmosphere, and pose dynamics as a reference study! You MUST ONLY apply the learned techniques to the user story's unique character profile and plot, creating a soulful image that speaks without words!

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
10. Reference Fidelity Breakdown (Những chi tiết bắt buộc nghiên cứu giữ lại: góc chụp, thị giác, kiểu dáng pose, màu sắc, phong cách, trang phục; và những chi tiết thay đổi tùy biến: nhân vật nguyên bản theo truyện)

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
  "detailsToPreserve": "Danh sách chi tiết bắt buộc học hỏi giữ lại (camera angle, perspective, pose, stance, gesture, color atmosphere, floral mood, outfit direction...)",
  "detailsToAdapt": "Danh sách chi tiết thay đổi theo cốt truyện (nhân vật độc quyền theo truyện, bối cảnh phụ nếu có note riêng)",
  "originalityElements": "Danh sách chi tiết thay đổi để tạo nguyên bản mới (nhân vật nguyên bản 100% theo truyện & thiết kế Canva)",
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
  "referenceControl": { "visualSimilarityTarget": "High Aesthetic Style Fidelity (camera perspective, pose, style & outfit study)", "adaptationAllowance": "Transformative adaptation for 100% bespoke character originality", "originalityGuarantee": "100% Original Character Creation (Transformative Aesthetic Study)", "priority": "100% story character identity first, aesthetic style & pose DNA second" }
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
    if (currentStory.botCharacters) {
      for (const bc of currentStory.botCharacters) {
        if (bc.referenceImages) {
          for (const r of bc.referenceImages) {
            if (!r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed') {
              pendingList.push({ ref: r, cardId: 'bot_profile', cardTitle: `Bot Char: ${bc.displayName || 'Unnamed'}` });
            }
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
    if (!rs.cards[cardId].refs) rs.cards[cardId].refs = [];
    
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
    if (!window.confirm("Bạn có chắc muốn xem lại kết quả cũ? Dữ liệu chữ (text/prompt) sẽ thay đổi nhưng ảnh tham chiếu sẽ được giữ nguyên!")) return;
    const rs = { ...roomState };
    rs.result = item.result || "";
    if (item.cards && typeof item.cards === 'object') {
      Object.keys(item.cards).forEach(k => {
        if (!rs.cards[k]) {
          rs.cards[k] = { note: "", refs: [], output: "", report: "" };
        }
        rs.cards[k].output = item.cards[k].output || "";
        if (!rs.cards[k].refs) rs.cards[k].refs = [];
      });
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
    if (apiAbortControllerRef.current) {
      apiAbortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    apiAbortControllerRef.current = abortCtrl;
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
    await new Promise(resolve => setTimeout(resolve, 35));

    const rs = { ...roomState };
    const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
    const target = rs.targetMode || 'bot';
    const isComicMode = target === 'manga_webtoon_mode' || 
                        roomDef?.id === 'manga_webtoon' || 
                        (roomDef?.id !== 'marketing_pr_anime' && roomDef?.id !== 'bot_char_marketing_art' && roomDef?.id !== 'bot_char_hobbies_vibe' && roomDef?.id !== 'fandom_merch' && /webtoon|truyện tranh/i.test(roomDef?.title || ''));

    const payloadObj = buildContextPayload();
    const allRefsList = [...payloadObj.styleAnalyzer.referenceImages, ...payloadObj.workCards.flatMap(c => c.referenceImages)];

    setApiSignals(prev => ({
      ...prev,
      stage: 'reading_references',
      stageLabel: '2. Reading References',
      stageDetail: `Đang kiểm tra & đọc AI Vision cho ${allRefsList.length} ảnh tham chiếu đính kèm...`
    }));
    setProgress(15);

    // Step 2: Gom tất cả ảnh từ Bot Characters, Style Analyzer, và toàn bộ Thẻ làm việc (Work Cards) vào Payload!
    // TUYỆT ĐỐI KHÔNG lọc trùng (deduplicate) vì mỗi thẻ có mục đích và ảnh riêng biệt!
    const refreshedPayload = buildContextPayload();
    
    // Tạo bộ ánh xạ chỉ số toàn cục (Global Image Index Mapping #1, #2, #3...) theo đúng thứ tự đính kèm
    const refToGlobalIndexMap = new Map<any, number>();
    const idToGlobalIndexMap = new Map<string, number>();
    const orderedVisionRefs: any[] = [];
    let imgCounter = 1;

    const registerRef = (r: any) => {
      if (!r) return;
      const idx = imgCounter++;
      refToGlobalIndexMap.set(r, idx);
      if (r.imageId) idToGlobalIndexMap.set(r.imageId, idx);
      if (r.id) idToGlobalIndexMap.set(r.id, idx);
      orderedVisionRefs.push(r);
    };

    // 1. Bot character reference images
    const botCharRefsList = (refreshedPayload.currentStory?.manualInput?.botCharacters || currentStory.botCharacters || []).flatMap((c: any) => c.referenceImages || []);
    for (const r of botCharRefsList) {
      registerRef(r);
    }

    // 2. Style analyzer reference images
    const saRefs = refreshedPayload.styleAnalyzer?.referenceImages || [];
    for (const r of saRefs) {
      registerRef(r);
    }

    // 3. Work cards reference images (ALL cards, ALL images per card without deduplication)
    for (const c of cards) {
      const cardRefs = refreshedPayload.workCards?.find((wc: any) => wc.cardId === c.id)?.referenceImages || (rs.cards[c.id]?.refs || []);
      for (const r of cardRefs) {
        registerRef(r);
      }
    }

    const getGIdx = (r: any, fallbackIdx: number) => {
      if (!r) return fallbackIdx;
      return refToGlobalIndexMap.get(r) || (r.imageId && idToGlobalIndexMap.get(r.imageId)) || (r.id && idToGlobalIndexMap.get(r.id)) || fallbackIdx;
    };

    if (orderedVisionRefs.length > 0) {
      toast(`🌸 Đã đính kèm ${orderedVisionRefs.length} ảnh tham chiếu làm tư liệu hướng dẫn nghệ thuật cho AI!`);
      setApiSignals(prev => ({
        ...prev,
        stageDetail: `✅ Gom ${orderedVisionRefs.length} ảnh tham chiếu làm tư liệu hướng dẫn nghệ thuật (#1 -> #${orderedVisionRefs.length}). Hướng dẫn AI học hỏi phong cách nghệ thuật và bố cục...`
      }));
    }

    const prompt = `You are the professional Lipstick Prompt Rooms engine. Generate highly cohesive, production-ready prompts for the room: "${roomDef.title}".

### CURRENT CONTEXT WINDOW (MANUAL & IMPORTED FILES)
- Story Title: ${currentStory.title}
- Story Plot: ${currentStory.story || "Chưa có cốt truyện."}
- User Profile ({{user}}): ${currentStory.userProfile || "Chưa thiết lập."}
- Bot Characters (${refreshedPayload.currentStory.manualInput.botCharacters ? refreshedPayload.currentStory.manualInput.botCharacters.length : 1} characters):
${refreshedPayload.currentStory.manualInput.botCharacters ? refreshedPayload.currentStory.manualInput.botCharacters.map((c: any, idx: number) => `  * [Char #${idx+1}: ${c.displayName || 'Unnamed'}]:\n    - Profile: ${c.profileText || 'Trống'}\n    - Attached Ref Images (${(c.referenceImages || []).length} images - DO NOT OUTPUT FILENAMES, TRANSLATE VISUAL TRAITS TO WORDS):\n${(c.referenceImages || []).map((r: any, rIdx: number) => `      + [Bot Char Ref -> ATTACHED IMAGE #${getGIdx(r, rIdx + 1)}]: "${r.name || r.fileName || 'Image'}" | Purpose: bot_character_reference`).join("\n") || "      + No character images attached."}`).join("\n\n") : (currentStory.botProfiles || "Chưa thiết lập.")}
- Side Characters: ${currentStory.sideCharacters || "Chưa có."}
- Story Requirements: ${currentStory.requirements || "Không có yêu cầu thêm."}
- Target Mode Selected: "${getTargetLabel(target)}"
- Target Character Isolation Mandate: ${getTargetInstructions(target)}

### ATTACHED STORY FILES (${refreshedPayload.currentStory.importedFiles.length} files)
${refreshedPayload.currentStory.importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus} | ~${f.wordCount} words]\n${f.summary ? `Summary: ${f.summary}\n` : ""}Content excerpt:\n${f.extractedText.slice(0, 15000)}`).join("\n\n---\n\n")}

### REFERENCE IMAGE MANIFEST (EXACT LOCATION & PURPOSE MAPPING)
Below is the complete manifest of all attached reference images across this story, room, and individual work cards. You MUST strictly respect the location and purpose of EACH image. Do NOT mix up images from different cards (e.g. never use a hair reference image for pose or outfit).
\`\`\`json
${JSON.stringify({
  referenceImageManifest: refreshedPayload.referenceImageManifest
}, null, 2)}
\`\`\`

### 👑 SUPREME MANDATE ON STORY FIDELITY & REFERENCE TRANSFORMATION (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU)
When generating the image prompt for each Work Card, you MUST strictly obey the following division of authority and priority hierarchy:

1. **👑 1st & Supreme Priority (#1 ABSOLUTE SUPREMACY OF STORY & CHARACTER PROFILE - CÂU CHUYỆN VÀ NHÂN VẬT GỐC LÀ TỐI THƯỢNG)**:
   - **Bám sát cao nhất là câu chuyện và hồ sơ nhân vật gốc!** The user's Story Plot, Character Profile, and Lore hold **ABSOLUTE SUPREME AUTHORITY (#1)** over WHO IS IN THE SCENE (character identity, facial features, gender, age, eye/hair color, personality, soul, and story aura)!
   - **MANDATORY TRANSFORMATION RULE (NGUYÊN TẮC CHUYỂN ĐỔI TƯ LIỆU CHO NHÂN VẬT GỐC)**: The working reference images attached across cards (pose, outfit, background, style) are important working study materials (*tư liệu làm việc tham chiếu*) to draw visual ideas, poses, lighting, composition, and artistic vibes from. **HOWEVER, THEY MUST ONLY SERVE TO INSPIRE AND PERFORM TRANSFORMATIVE ADAPTATION FOR THE USER'S EXCLUSIVE ORIGINAL CHARACTER IN THEIR STORY ('nhân vật trong câu chuyện của em')!**
   - **MANDATORY PRINCIPLE**: YOU MUST ALWAYS ensure character appearance strictly matches the user's story profile! It MUST ALWAYS BE THE CHARACTER IN THE USER'S STORY!
2. **2nd Priority (CARD-SPECIFIC REFERENCE IMAGES AS VISUAL STUDY MATERIALS - ẢNH TƯ LIỆU LÀM VIỆC ĐỂ LẤY Ý TƯỞNG THỊ GIÁC)**:
   - When a Work Card (such as Hair Card, Pose Card, Outfit Card, Environment Card, Makeup Card, Style Card) has attached reference images (cardId === currentCardId), those reference images serve as **the primary visual study materials** for that card's domain!
   - You MUST extract 100% of the visual ideas (hairstyle structure, clothing silhouette, fabric drape, lace/embroidery, body stance, hand gestures, camera angle, framing, architectural background, lighting, and color rhythm) from the attached reference image, and **seamlessly transform and adapt them onto the user's story character**!
3. **3rd Priority (User Note inside Work Card)**:
   - User notes inside that specific Work Card define how to apply, adjust, or refine the visual ideas from the reference images onto the story character.
4. **4th Priority (Style Analyzer - Art Style & Rendering Quality)**:
   - Images and keywords from the Style Analyzer govern the overarching art style, rendering medium (manhua fantasy, oil painting, soft ink-wash, cinematic photo), brushwork, and color harmony across all cards. Never let Style Analyzer guide a card's specific reference for pose, hair, or outfit!

### SELECTED ART STYLES & VISION ANALYSIS
- Selected Style Keywords: ${(sa.selected || []).join(", ") || "None selected"}
- Style Analyzer Summary: ${sa.analysis || "None"}
- Attached Style Reference Images (${(sa.refs || []).length} images):
${(sa.refs || []).map((r: any, idx: number) => {
  const gIdx = getGIdx(r, idx + 1);
  const status = r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending');
  const analysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳')) 
    ? r.imageAnalysisText 
    : `👉 [IN-CONTEXT VISION MANDATE]: Ảnh tham chiếu phong cách này được đính kèm tại vị trí [ATTACHED IMAGE #${gIdx}] trong request! AI HÃY TỰ NHÌN TRỰC TIẾP vào ảnh đính kèm #${gIdx} bên dưới để học hỏi bảng màu, nét vẽ và chất liệu!`;
  return `  * [Style Ref #${idx+1} -> ATTACHED IMAGE #${gIdx} IN PAYLOAD (DO NOT OUTPUT FILENAME - TRANSLATE VISUAL TRAITS TO WORDS): "${r.name || r.fileName || 'Image'}" | Status: ${status} | Purpose: style_reference (3rd Priority: style/render/color only, do NOT guide card-specific refs)]:\n    - Vision Report: ${analysisText}${r.imageAnalysisJson ? `\n    - Style Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}\n    - Art Family/Rendering: ${JSON.stringify(r.imageAnalysisJson.style || {})}\n    - Visual Style: ${JSON.stringify(r.imageAnalysisJson.visualStyleExtracted || {})}\n    - Color Palette: ${JSON.stringify(r.imageAnalysisJson.colorPaletteExtracted || {})}` : ""}`;
}).join("\n\n") || "  * No style reference images attached."}

### WORKROOM CARDS & SPECIFIC NOTES (WITH ATTACHED REFERENCE IMAGES & VISION ANALYSIS)
${cards.map((c: any) => {
  const cs = rs.cards[c.id] || { note: "", refs: [], output: "" };
  const cardRefsList = refreshedPayload.workCards?.find((wc: any) => wc.cardId === c.id)?.referenceImages || (cs.refs || []);
  const refsDesc = cardRefsList.map((r: any, idx: number) => {
    const gIdx = getGIdx(r, idx + 1);
    const status = r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending');
    const baseAnalysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳'))
      ? r.imageAnalysisText
      : `AI có khả năng quan sát hình ảnh, hãy phân tích trực tiếp [ATTACHED IMAGE #${gIdx}] và trích xuất các yếu tố thuộc phạm vi chức năng của thẻ "${c.title}"!`;
    const analysisText = `🎨 [TƯ LIỆU THẨM MỸ CHO THẺ "${c.title}"]: Ảnh tham chiếu #${gIdx} là tư liệu hướng dẫn nghệ thuật cho phạm vi "${c.title}". AI hãy học hỏi phong cách, màu sắc và đường nét để tạo dựng nhân vật trong truyện! => Chi tiết Vision: ${baseAnalysisText}`;
    const jsonStr = r.imageAnalysisJson ? `\n    - Subject Details: ${JSON.stringify(r.imageAnalysisJson.subject || {})}\n    - Style & Color: ${JSON.stringify(r.imageAnalysisJson.style || {})} | ${JSON.stringify(r.imageAnalysisJson.color || {})}\n    - Composition & Details: ${JSON.stringify(r.imageAnalysisJson.composition || {})} | ${JSON.stringify(r.imageAnalysisJson.characterDetails || {})}\n    - Prompt Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}\n    - Visual Style Extracted: ${JSON.stringify(r.imageAnalysisJson.visualStyleExtracted || {})}\n    - Color Palette Extracted: ${JSON.stringify(r.imageAnalysisJson.colorPaletteExtracted || {})}\n    - Outfit Fidelity Extracted: ${JSON.stringify(r.imageAnalysisJson.outfitExtracted || r.imageAnalysisJson.layer4_outfit || {})}\n    - Composition Rhythm Extracted: ${JSON.stringify(r.imageAnalysisJson.compositionExtracted || r.imageAnalysisJson.composition || {})}\n    - Details To Preserve (70%-85%): ${JSON.stringify(r.imageAnalysisJson.detailsToPreserve || "N/A")}\n    - Details To Adapt (15%-30%): ${JSON.stringify(r.imageAnalysisJson.detailsToAdapt || "N/A")}\n    - Originality Elements (0%): ${JSON.stringify(r.imageAnalysisJson.originalityElements  || "N/A")}` : "";
    return `  * [Card Ref #${idx+1} -> ATTACHED IMAGE #${gIdx} IN PAYLOAD (DO NOT OUTPUT FILENAME - TRANSLATE VISUAL TRAITS TO WORDS): "${r.name || r.fileName || 'Image'}" | ID: ${r.id || r.imageId} | Status: ${status} | Card Title Domain: "${c.title}" (EXACT FUNCTIONAL ISOLATION: This image ONLY governs attributes belonging to "${c.title}")]:\n    - Vision Analysis Text: ${analysisText}${jsonStr}`;
  }).join("\n\n");
  return `#### Card: "${c.title}" (ID: ${c.id})
- Quick Guidelines: ${c.quick}
- User Note: ${cs.note || "None"}
- Attached Reference Images (${cardRefsList.length} images):
${refsDesc || "  * No reference images attached directly to this card. -> 🚨 FULL-UTIL MANDATE: You MUST STILL synthesize and apply the visual DNA from ALL attached reference images across the story, room, Style Analyzer, and Bot Characters (see manifest above) to design this card! Do NOT generate ordinary or generic concepts!"}`;
}).join("\n\n---\n\n")}

### GUIDELINES: BALANCE BETWEEN STORY PLOT AND REFERENCE IMAGES
Please follow these guidelines when generating prompts for Work Cards:
1. **Story Plot & Character Profile Identity**:
   - The Story Plot and Character Profile define the core identity of the character (name, personality, background, emotional tone, and narrative context).
2. **Artistic & Visual Study from Reference Images**:
   - The Attached Reference Images (and their Vision Analysis reports) serve as artistic inspiration and visual study material for:
     + **Camera Angle & Framing**: Preferred shot size, framing, and depth of field.
     + **Pose & Gesture**: Posture, hand placement, and body dynamics.
     + **Outfit & Material Styling**: Garment silhouette, fabric texture, styling, and layering ideas.
     + **Composition & Color Atmosphere**: Lighting direction, color palette, contrast, and visual mood.
   - For each card, please observe its assigned Attached Reference Images (e.g. ATTACHED IMAGE #1, #2...), study how the subject is styled, posed, framed, and lit, and translate those visual elements into descriptive language in the generated prompt!
3. **Transformative Character Creation**:
   - Synthesize the visual aesthetic inspiration from the reference images with the user's original story character profile. All visual elements should be transformatively adapted to craft an original character and unique artwork!

### VISUAL REFERENCE STUDY & ADAPTATION PRINCIPLES
When attached reference images or Vision Analysis reports are present for any work card:
1. **Core Principle: Artistic Inspiration & Visual Fidelity**:
   - Study the aesthetic elements, camera perspective, framing, depth of field, and pose from the reference images.
   - Harmonize the studied visual traits (art style, medium texture, color palette, light & shadow, camera framing, posture, outfit spirit, and composition rhythm) with the character narrative.
2. **Execution Process**:
   - Step 1: Review each attached reference image and its Vision Analysis report.
   - Step 2: Extract the key visual elements (camera angle, perspective, pose, style, color, composition, outfit).
   - Step 3: Translate these visual elements into rich, descriptive natural language.
   - Step 4: Map the visual elements appropriately to the specific Work Card and Room.
   - Step 5: When writing the final prompt, incorporate the camera perspective, pose, aesthetic styling, outfit direction, and composition rhythm learned from the reference images.
3. **Priority & Adaptation Guidelines**:
   - **Visual Styling**: For Work Cards with attached reference images, incorporate the camera framing, body pose, rendering style, color palette, lighting, mood, and outfit design from the references.
   - **Character Identity**: Ensure the character's facial features and identity reflect the user's story profile while maintaining visual harmony with the reference styling.
   - **Creative Adaptation**: Adjust supporting props or background details as requested by user notes.
   - **Transformative Originality**: All reference study materials serve to inspire an original artwork with transformative adaptation and artistic flair.
4. **MODULAR MULTI-REFERENCE ROLE ISOLATION & FEATURE-BY-FEATURE SYNTHESIS**:
   - When multiple reference images are attached across different cards (e.g., Card Tóc/Hair, Card Pose, Card Outfit, Card Face, Card Style/Overall...), ensure each reference image informs its specific domain:
     + 💇‍♀️ **Hair Card References ('Tóc / Hair')**: Inspire hairstyle, hair color, volume, and strand rhythm.
     + 💃 **Pose Card References ('Pose Dáng / Pose')**: Inspire body posture, stance, gesture, and camera perspective.
     + 👗 **Outfit Card References ('Trang Phục / Outfit')**: Inspire clothing design, fabric material, layering, and styling.
     + 💄 **Face Card References ('Khuôn Mặt / Face / Makeup')**: Inspire facial features, makeup, and expression (while preserving story identity).
     + 🌌 **Environment Card References ('Bối Cảnh / Background')**: Inspire background setting, architecture, lighting atmosphere, and props.
     + 🎨 **Style Analyzer / Overall References ('Tổng Thể / Style')**: Inspire art style, brushwork, medium texture, rendering quality, and general color palette.
     + ✿ **Aesthetic Study & Reference Learning ('Học Hỏi Từ Ảnh Tham Chiếu / Learn / poses10 / soulful')**: Inspire art direction, brushwork style, cinematic framing, pose structure, and lighting atmosphere as an aesthetic visual study. When generating for the Soulful Storytelling room ('soulful'), focus on emotional resonance, unspoken visual narrative, and atmospheric depth. When generating for the 10 Pose Variations room ('poses10'), study each pose card (p1 to p10) separately to output 10 distinct, highly descriptive pose prompt variations!
   - Assemble the final prompt by integrating the domain-specific visual elements harmoniously!
5. **Multi-Image Synthesis within the SAME Card**: If a single card has multiple attached reference images, identify their common aesthetic traits for that domain and synthesize them into a cohesive instruction.
6. **MANDATORY DIRECTIVE ON BARE FILENAMES IN OUTPUT PROMPT (KHÔNG ĐƯỢC CHỈ NHẮC TÊN FILE ẢNH)**:
   - You are REQUIRED from writing bare image filenames, file extensions, or image IDs (e.g. "Use references: 1000012463.jpg, 1000012560.jpg", "Character inspired by 1000012463.jpg", or "inspired by image 1.png") inside the generated prompt!
   - When reference images are present, your task is to READ the vision analysis reports, extract their aesthetic layers, camera angles, and poses, and SYNTHESIZE them into rich, descriptive natural language inside the output prompt.
   - A valid output prompt is a complete, standalone descriptive instruction where all aesthetic and structural traits from reference images have been translated into explicit descriptive words ready for direct image generation!

### MANDATORY OUTPUT STRUCTURE & RULES
You MUST generate the final production-ready prompt for EACH work card individually.
Return the result for EACH card listed above individually. Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the following format, without any <think> blocks or conversational prefixes. YOU MUST USE EXACTLY THIS FORMAT TO SEPARATE THE CARDS:

${cards.map((c: any) => `[CARD_ID: ${c.id}]
[REFERENCE FIDELITY REPORT]
- Card Title: "${c.title}"
- Room ID: "${roomDef.id}"
- Attached Reference Images: (List each image ID/name internally, and detail the visual DNA analysis: Camera Angle, Perspective, Depth of Field, Pose, Stance, Style, Palette, Light, Texture, Mood, Outfit, Composition)
---
${isComicMode ? `[FINAL PROMPT]
(Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for "${c.title}" here. CRITICAL MANDATE FOR COMIC / MANGA / WEBTOON: You MUST NOT use a single-image 5-part structure! Instead, you MUST generate a Multi-Panel Comic Page / Webtoon layout with sequential storytelling, distinct comic frames, character dialogue, facial expressions, actions, and backgrounds!
Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê tường tận từng nét vẽ Manga/Manhwa, bảng màu hex, góc máy, tạo dáng từ toàn bộ ảnh tham chiếu đính kèm. Ép AI tạo ảnh phải sử dụng làm tư liệu gốc!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh, chất liệu cao cấp, ánh sáng volumetric rays, line art sắc sảo để đảm bảo ảnh truyện tranh cho ra tuyệt mỹ, tuyệt đối không bị bình thường]

---

### 📚 TỔNG QUAN TRANG TRUYỆN / WEBTOON PAGE SETUP
- **🎬 Tên trang / Phân cảnh (Scene Title)**: [Tóm tắt tình huống cốt truyện trong trang/thẻ này]
- **🎨 Phong cách vẽ (Art Style & Medium)**: [Nét vẽ Manga/Manhwa/Comic, màu sắc, line art bám sát ảnh tham chiếu]
- **📐 Bố cục trang & Nhịp điệu (Page Layout & Pacing)**: [Phân chia số khung từ 2 đến 6 khung, cách sắp xếp khung trên trang]

---

### 🖼️ KHUNG 1: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [Close-up cận cảnh / Full-body toàn thân / Low-angle / High-angle...]
- **🧑 Tình huống & Hành động (Action & Stance)**: [Nhân vật đang làm gì, tương tác với ai theo đúng cốt truyện]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [Miêu tả chi tiết thần thái: đỏ mặt, rơm rớm nước mắt, cười khẩy, kiên định...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: 
  + **Lời thoại (Tiếng Việt & English)**: "[Nhân vật A nói gì / suy nghĩ gì trong bong bóng chat]"
  + **Hiệu ứng âm thanh (SFX)**: [Ví dụ: Thump thump, Whoosh, Doki doki...]
- **🌌 Background & Ánh sáng (Background & Atmosphere)**: [Bối cảnh chi tiết trong khung này, ánh sáng, hiệu ứng hoa bay / speed lines]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 1 (Production-ready AI Image Prompt)**: 
  \`[Đoạn prompt tiếng Anh chuẩn, đầy đủ chi tiết cho Khung 1 để sử dụng trực tiếp trong AI tạo ảnh]\`

---

### 🖼️ KHUNG 2: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [...]
- **🧑 Tình huống & Hành động (Action & Stance)**: [...]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: [...]
- **🌌 Background & Ánh sáng (Background & Atmosphere)**: [...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 2 (Production-ready AI Image Prompt)**: 
  \`[...]\`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến câu chuyện)*

---

### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, highly detailed master English prompt combining all panels into a sequential comic/webtoon page layout AND explicitly enforcing the Full-Util 100% reference visual DNA (art style, character features, panel framing, lighting). Prepend with: "MANDATORY SOURCE MATERIAL UTILIZATION: Create an award-winning multi-panel comic/webtoon masterpiece strictly adhering to the visual DNA extracted from all provided reference source materials. Zero ordinary rendering. Masterwork manga/manhua execution..." Ready for 1-click copy & paste into AI image generators!]\`

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)` : `[FINAL PROMPT]
(Write the final production-ready standalone image prompt for "${c.title}" here. CRITICAL MANDATE: You MUST divide the prompt into exactly 5 STANDALONE PARTS using standard Markdown headers, AND end with a Master Production-Ready English Prompt block so the user can use each part or the whole prompt easily!
Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê tường tận từng nét vẽ, mã màu hex, chất liệu vải, dáng đứng, góc máy từ toàn bộ ảnh tham chiếu đính kèm của thẻ này. Ép AI tạo ảnh phải sử dụng làm tư liệu gốc!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh, chất liệu cao cấp, ánh sáng volumetric rays, texture 8k để đảm bảo ảnh cho ra tuyệt mỹ, tuyệt đối không bị bình thường]

---

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

---

### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, highly dense master English prompt combining all 5 Parts AND explicitly enforcing the Full-Util 100% reference visual DNA (exact pose, camera angle, outfit silhouette, lighting, color palette). Prepend with: "MANDATORY SOURCE MATERIAL UTILIZATION: Create an award-winning cinematic visual masterpiece strictly adhering to the visual DNA extracted from all provided reference source materials. Zero ordinary rendering. Masterwork visual execution..." Ready for 1-click copy & paste into Midjourney, Ideogram, DALL-E, Canva AI, or any image generator with masterwork cinematic quality!]\`

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)`}`).join("\n\n")}
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
    const sentImageUrls = new Set<string>();
    for (const img of orderedVisionRefs) {
      const imgUrl = img.data || img.previewUrl || img.storageUrl;
      if (imgUrl && !sentImageUrls.has(imgUrl)) {
        sentImageUrls.add(imgUrl);
        contentArray.push({
          type: "image_url",
          image_url: { url: imgUrl }
        });
      }
    }

    // Khi gửi vào Context Windows, cập nhật toàn bộ ảnh sang trạng thái đã đọc thành công trên cả roomState, styleAnalyzer, workCards và botCharacters
    const updateRefStatus = (img: any) => {
      if (!img) return;
      img.analysisStatus = 'analyzed';
      if (!img.imageAnalysisText || img.imageAnalysisText === 'Chưa phân tích' || img.imageAnalysisText.startsWith('⏳') || img.imageAnalysisText.includes('👉 [IN-CONTEXT VISION')) {
        img.imageAnalysisText = '✅ AI đã đọc trực tiếp trong Context Windows (Smart In-Context Vision)';
      }
    };

    orderedVisionRefs.forEach(updateRefStatus);
    if (rs.styleAnalyzer?.refs) rs.styleAnalyzer.refs.forEach(updateRefStatus);
    Object.values(rs.cards || {}).forEach((cs: any) => {
      if (cs?.refs && Array.isArray(cs.refs)) cs.refs.forEach(updateRefStatus);
    });
    if (currentStory.botCharacters && Array.isArray(currentStory.botCharacters)) {
      currentStory.botCharacters.forEach((bc: any) => {
        if (bc?.referenceImages && Array.isArray(bc.referenceImages)) bc.referenceImages.forEach(updateRefStatus);
      });
    }

    currentStory.rooms[roomDef.id] = { ...rs };
    save(state);

    setApiSignals(prev => ({
      ...prev,
      contextBuilt: true,
      stage: 'connecting_api',
      stageLabel: '3. Connecting API',
      stageDetail: 'Đang kết nối API Proxy & gửi request... (Đang chờ phản hồi đầu tiên)'
    }));
    setProgress(25);
    await new Promise(resolve => setTimeout(resolve, 35));

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
        const cardBlocks = text.split(/\[CARD_ID:\s*([^\]]+)\]/i);
        let anyMatched = false;
        const availableIds = Object.keys(rs.cards);

        for (let i = 1; i < cardBlocks.length; i += 2) {
          const parsedCardId = cardBlocks[i]?.trim();
          const parsedContent = (cardBlocks[i + 1] || "").trim();
          if (!parsedCardId) continue;

          let matchedId = rs.cards[parsedCardId] ? parsedCardId : null;
          if (!matchedId) {
            const cleanId = parsedCardId.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (const k of availableIds) {
              const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
              const cleanTitle = (rs.cards[k]?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              if (cleanK === cleanId || cleanTitle.includes(cleanId) || cleanId.includes(cleanK)) {
                matchedId = k;
                break;
              }
            }
          }

          if (matchedId && rs.cards[matchedId]) {
            anyMatched = true;
            const { report, output } = parseCardStreamContent(parsedContent);
            rs.cards[matchedId].report = report;
            rs.cards[matchedId].output = output || (isApiRunning && report ? "⏳ AI đang phân tích ảnh tham chiếu (xem Báo cáo thẩm định bên dưới) trước khi viết Prompt..." : parsedContent);
            if (roomState.cards && roomState.cards[matchedId]) {
              roomState.cards[matchedId].report = report;
              roomState.cards[matchedId].output = rs.cards[matchedId].output;
            }
            if (currentStory?.rooms?.[roomDef.id]?.cards?.[matchedId]) {
              currentStory.rooms[roomDef.id].cards[matchedId].report = report;
              currentStory.rooms[roomDef.id].cards[matchedId].output = rs.cards[matchedId].output;
            }
          }
        }

        if (!anyMatched && text.trim()) {
          const firstCardId = availableIds[0];
          if (firstCardId && rs.cards[firstCardId]) {
            const { report, output } = parseCardStreamContent(text.trim());
            rs.cards[firstCardId].report = report;
            rs.cards[firstCardId].output = output || text.trim();
            if (roomState.cards && roomState.cards[firstCardId]) {
              roomState.cards[firstCardId].report = report;
              roomState.cards[firstCardId].output = rs.cards[firstCardId].output;
            }
            if (currentStory?.rooms?.[roomDef.id]?.cards?.[firstCardId]) {
              currentStory.rooms[roomDef.id].cards[firstCardId].report = report;
              currentStory.rooms[roomDef.id].cards[firstCardId].output = rs.cards[firstCardId].output;
            }
          }
        }
      };

      await callAIStream({
        signal: abortCtrl.signal,
        messages: [{ role: "user", content: contentArray }],
        systemPrompt: isComicMode
          ? "You are an AI Comic & Webtoon Prompt Generator inside a production workspace. Your task is to generate multi-panel comic page scripts, storyboards, and sequential storytelling layouts. You are not a tutor, not a prompt-writing teacher, not a checklist generator, and not an assistant explaining how to write prompts. Read the full Context Window and produce the final usable comic script directly adhering to aesthetic fidelity and storytelling consistency.\n\n🚨 MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The attached reference images are visual study materials ('tư liệu thị giác') for poses, lighting, composition, and artistic vibes. HOWEVER, they MUST ONLY serve to inspire and adapt for the USER'S ORIGINAL CHARACTER AND STORY ('nhân vật và cốt truyện của em')! Whenever there is divergence between a reference image and the user's character story profile, YOU MUST STRICTLY PRIORITIZE AND ENFORCE THE USER'S STORY AND CHARACTER!\n\n🚨 MANDATE: 100% REFERENCE MATERIAL UTILIZATION & ANTI-ORDINARY GUARANTEE (SỬ DỤNG TƯ LIỆU - CHỐNG ẢNH CHO RA KHÁ BÌNH THƯỜNG) 🚨: You are commanded to treat EVERY SINGLE attached reference image as mandatory visual study material ('tư liệu thị giác bắt buộc'). Do not ignore any attached image! To prevent downstream AI image generators from producing ordinary, generic images ('ảnh cho ra khá bình thường'), enrich the prompt with cinematic vocabulary, intricate material textures, dramatic volumetric lighting, cinematic focal length, and masterwork rendering polish!\n\n🚨 CRITICAL MANDATE ON MODULAR MULTI-REFERENCE ISOLATION BY CARD NAME (QUY TẮC BÓC TÁCH ĐỘC QUYỀN VÀ GIAO THOA ĐA THAM CHIẾU THEO TỪNG THẺ): When multiple reference images are attached across different cards in the workspace, isolate the authority of each image strictly by its Card Title domain: Hair from Hair Card, Pose/Angle from Pose Card, Clothing from Outfit Card, Setting from Environment Card, Art Style/Palette from Style Analyzer, and Art Direction from Aesthetic Study to craft an original masterpiece!\n\nDo NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...]."
          : "You are an AI Image Prompt Generator inside a production workspace. Your task is to generate the final production-ready image prompt from the user's provided context. You are not a tutor, not a prompt-writing teacher, not a checklist generator, and not an assistant explaining how to write prompts. Read the full Context Window and produce the final usable image prompt directly adhering to the core principle: Aesthetic Study & Visual Reference Principle (High aesthetic style fidelity, transformative adaptation for bespoke character originality).\n\n🚨 SUPREME MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The working reference images attached to the workspace are important visual study materials ('tư liệu thị giác tham chiếu') to draw visual inspiration, poses, lighting, composition, and artistic vibes from. HOWEVER, they MUST ONLY serve to inspire and perform transformative adaptation for the USER'S EXCLUSIVE ORIGINAL CHARACTER IN THEIR STORY ('nhân vật trong câu chuyện của em')! YOU MUST ALWAYS Avoid to let a reference image guide or alter the user's original character profile, story plot, facial appearance, or lore! THE STORY AND CHARACTER PROFILE ARE KING AND GUIDE ALL REFERENCE DETAILS! Whenever there is any divergence between a reference image and the user's character story profile, YOU MUST STRICTLY PRIORITIZE AND ENFORCE THE USER'S STORY AND CHARACTER!\n\n🚨 SUPREME MANDATE: FULL-UTIL 100% REFERENCE MATERIAL UTILIZATION & ANTI-ORDINARY GUARANTEE (TẤT CẢ CÁC ẢNH ĐỀU PHẢI SỬ DỤNG LÀM TƯ LIỆU - CHỐNG ẢNH CHO RA KHÁ BÌNH THƯỜNG) 🚨: You are strictly commanded to treat EVERY SINGLE attached reference image as mandatory visual study material ('tư liệu thị giác bắt buộc'). You MUST NOT skip, dilute, or ignore any attached image! Even if a work card has no images attached directly to it, you MUST STILL draw from all reference images attached across the story, room, Style Analyzer, and Bot Characters! Whether there are 2, 5, or 10 reference images, you MUST extract and synthesize the visual data from ALL of them into the output prompt! To prevent downstream AI image generators from producing ordinary, generic images ('ảnh cho ra khá bình thường'), you MUST enrich the prompt with award-winning, cinematic vocabulary, intricate material textures (haute couture embroidery, silk drape, subsurface scattering), dramatic volumetric lighting, cinematic focal length, and masterwork rendering polish! Inside [FINAL PROMPT], you MUST include the mandatory block '### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)' listing all visual study materials and styling directives before the 5 standalone parts!\n\n🚨 MANDATE ON AESTHETIC STUDY & DIRECT STORY APPLICATION (NO NO CÁC VẤN ĐỀ KHÁC): All reference images attached across rooms, Style Analyzer, and Character profiles MUST be cleanly read, analyzed, and recorded into the Context Window as valid aesthetic study materials. You MUST ensure all output is 100% original, creative, and transformative, ensuring a 100% bespoke, creative, and original character design tailored exclusively to the user's story profile. You MUST carry these studied visual ideas (pose, camera angle, lighting, color harmony, visual flow) forward into the prompt construction and apply them directly to serve the user's exclusive story plot and original character profile!\n\n🚨 CRITICAL MANDATE ON MODULAR MULTI-REFERENCE ISOLATION BY CARD NAME (QUY TẮC BÓC TÁCH ĐỘC QUYỀN VÀ GIAO THOA ĐA THAM CHIẾU THEO TỪNG THẺ): When multiple reference images are attached across different cards in the workspace (such as Hair Card, Pose Card, Outfit Card, Face Card, Style Analyzer...), YOU MUST NOT let 1 single image (such as the first image or style image) dominate and guide the entire prompt! You MUST isolate the authority of each image strictly by its Card Title domain: Hair from Hair Card, Pose/Angle from Pose Card, Clothing from Outfit Card, Setting from Environment Card, Art Style/Palette from Style Analyzer, and Inspiration/Art Direction from Aesthetic Study & Reference Learning ('Học Hỏi Từ Ảnh Tham Chiếu') to craft an original masterpiece! Synthesize these distinct features together into a harmonious multi-reference composition without reference dominance!\n\nCRITICAL RULE ON REFERENCE IMAGES: When using reference images, extract and study aesthetic DNA and structural composition across these layers: art style, medium texture (watercolor, manhua fantasy, soft ink-wash...), color palette, light & shadow, opacity/translucency, mood/vibe, visual motifs, flowing hair movement, CAMERA SHOT & PERSPECTIVE FIDELITY (exact camera angle, low/high/eye-level shot, focal length feel, depth of field, background blur, bokeh, spatial framing), CHARACTER POSE & GESTURE FIDELITY (exact body stance, posture, head tilt, hand placement, body language, silhouette, spatial positioning in the frame), OUTFIT FIDELITY (form, silhouette, drape, layering logic, detail density, material feel, trim/lace/ribbon/embroidery tendencies, color family, elegance/fantasy level), and COMPOSITION FIDELITY (visual hierarchy, focal structure, eye-flow/visual path, subject placement logic, negative space rhythm). You MUST synthesize all traits to build the user's exclusive story character and Canva design! You MUST strictly study and apply camera shot, perspective, depth of field, framing, pose, silhouette, and gesture from the reference image (while applying the new original story character profile).\n\nYou MUST read and translate all visual traits into rich, descriptive natural language. You are REQUIRED from writing bare filenames or placeholder image IDs in the output prompt (e.g., do NOT output 'Use references: 1000012463.jpg' or 'Character inspired by 1000012463.jpg').\n\nFor EACH Work Card, you MUST FIRST output the mandatory [REFERENCE FIDELITY REPORT] block showing exactly what was studied and what is preserved/adapted/applied, followed by '---', and then [FINAL PROMPT] with the standalone descriptive instruction ready for direct image generation! In [FINAL PROMPT], you MUST structure the output into exactly 5 STANDALONE PARTS (### 🧑 PART 1 to ### 📸 PART 5), and end with '### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all 5 parts and reference enforcement into a single pure English production-ready block!\n\nDo NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...].",
        onToken: (token) => {
          streamBufferRef.current += token;
          chunksCountRef.current += 1;
          
          const now = performance.now();
          if (now - lastFlushTimeRef.current >= 1000) {
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
            }, 1000);
          }
        },
        onDone: () => {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          const finalResultText = streamBufferRef.current || "";
          if (!finalResultText.trim()) {
            const emptyMsg = "API trả về kết quả trống (0 token). Có thể do đường truyền Proxy tạm thời bị gián đoạn hoặc model đang xử lý lượng dữ liệu lớn. Vui lòng thử chọn model khác trong API Proxy hoặc kiểm tra lại kết nối mạng.";
            setApiError(emptyMsg);
            setIsApiRunning(false);
            setApiSignals(prev => ({
              ...prev,
              streaming: false,
              completed: true,
              error: emptyMsg,
              stage: 'done',
              stageLabel: '❌ Kết quả trắng (Empty Response)',
              stageDetail: emptyMsg
            }));
            toast("❌ " + emptyMsg);
            return;
          }

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
              referenceImages: allRefsList.map((r: any) => ({
                id: r.id,
                name: r.name || r.fileName || "ref",
                previewUrl: (r.previewUrl ? r.previewUrl.slice(0, 100) : null) || (r.data?.slice(0, 500) + "...") || ""
              })),
              streamStatus: 'completed' as const,
              cards: Object.keys(rs.cards || {}).reduce((acc: any, k: string) => {
                acc[k] = { note: rs.cards[k]?.note || "", output: rs.cards[k]?.output || "" };
                return acc;
              }, {})
            };
            if (!rs.history) rs.history = [];
            rs.history.unshift(historyItem);
            if (rs.history.length > 10) rs.history = rs.history.slice(0, 10);
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
              toast("✅ Đã tạo xong Prompt Image production-ready cho toàn bộ phòng!");
              setTimeout(() => {
                setProgress(0);
                setApiSignals(prev => ({ ...prev, requestStarted: false }));
              }, 8000);
            }, 300);
          }, 300);
        },
        onError: (err) => {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          const errStr = String(err);
          if (apiAbortControllerRef.current?.signal.aborted || errStr.toLowerCase().includes("abort") || errStr.includes("ngắt kết nối sau") || errStr.includes("dừng")) {
            setProgress(0);
            setIsApiRunning(false);
            setApiSignals(prev => ({
              ...prev,
              requestStarted: false,
              streaming: false,
              completed: true,
              error: null,
              stage: 'done',
              stageLabel: '⏹️ Đã hủy yêu cầu',
              stageDetail: 'Yêu cầu API đã được hủy bỏ và ngắt kết nối.'
            }));
            return;
          }
          setProgress(0);
          setApiError(errStr);
          setIsApiRunning(false);
          setApiSignals(prev => ({
            ...prev,
            streaming: false,
            completed: true,
            error: errStr,
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
            referenceImages: allRefsList.map((r: any) => ({
              id: r.id,
              name: r.name || r.fileName || "ref",
              previewUrl: (r.previewUrl ? r.previewUrl.slice(0, 100) : null) || (r.data?.slice(0, 500) + "...") || ""
            })),
            streamStatus: 'error' as const,
            cards: Object.keys(rs.cards || {}).reduce((acc: any, k: string) => {
              acc[k] = { note: rs.cards[k]?.note || "", output: rs.cards[k]?.output || "" };
              return acc;
            }, {})
          };
          if (!rs.history) rs.history = [];
          rs.history.unshift(historyItem);
          if (rs.history.length > 10) rs.history = rs.history.slice(0, 10);
          currentStory.rooms[roomDef.id] = { ...rs };
          save(state);
          toast("❌ Lỗi khi gọi API: " + err);
        }
      });
    } catch (e: any) {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      const errStr = e.message ? e.message : String(e);
      if (apiAbortControllerRef.current?.signal.aborted || errStr.toLowerCase().includes("abort") || errStr.includes("ngắt kết nối") || errStr.includes("dừng")) {
        setProgress(0);
        setIsApiRunning(false);
        setApiSignals(prev => ({
          ...prev,
          requestStarted: false,
          streaming: false,
          completed: true,
          error: null,
          stage: 'done',
          stageLabel: '⏹️ Đã hủy yêu cầu',
          stageDetail: 'Yêu cầu API đã được hủy bỏ và ngắt kết nối.'
        }));
        return;
      }
      setApiError("Lỗi hệ thống: " + errStr);
      setIsApiRunning(false);
      setApiSignals(prev => ({
        ...prev,
        streaming: false,
        completed: true,
        error: errStr,
        stage: 'done',
        stageLabel: '❌ Lỗi hệ thống',
        stageDetail: errStr
      }));
      rs.result = "Error: " + errStr;
      setProgress(0);
    }
  };

  const roomIdx = ROOMS_DATA.findIndex(r => r.id === roomDef.id);
  const defaultCover = PRESET_BACKGROUNDS[(roomIdx >= 0 ? roomIdx : (roomDef.seed || 0)) % PRESET_BACKGROUNDS.length];

  const activeBg = roomState.background || currentStory.cover || state.ui.globalBg;
  const cover = roomState.cover || roomState.background || defaultCover;
  const avatar = roomState.avatar || currentStory.avatar || state.ui.globalAvatar;

  return (
    <section className="room-stage" style={{ backgroundColor: activeBg ? 'transparent' : '#fcf8fa', minHeight: '100vh', position: 'relative' }}>
      {activeBg && (
        <div 
          className="gpu-fixed-background"
          style={{
            backgroundImage: `url('${activeBg}')`
          }}
        />
      )}
      <input type="file" ref={fileInputRef} className="file-native" accept="image/*" onChange={handleVisualChange} />

      {/* NÚT TRÁI TIM VẼ BẰNG CODE CSS BẬT/TẮT THẺ TRẮNG ĐẦU PHÒNG */}
      <button
        className="room-heart-toggle"
        onClick={() => setRoomHeaderCollapsed(!roomHeaderCollapsed)}
        title={roomHeaderCollapsed ? "Mở bảng điều khiển phòng" : "Thu gọn bảng điều khiển"}
        aria-label="Toggle Room Header"
      >
        <div className="heart-shape"></div>
      </button>

      {/* THẺ TRẮNG ĐẦU PHÒNG - MẶC ĐỊNH ẨN HOÀN TOÀN KHỎI LAYOUT */}
      {!roomHeaderCollapsed && (
        <div className="room-header-card" style={{ animation: 'fadeIn 0.25s ease' }}>
          {!isCompactHeader && (
            <section className="room-header">
              <div className="room-hero-cover" style={{position: 'relative', backgroundColor: '#ffddea', overflow: 'hidden'}}>
                {cover && <SafeImg src={cover} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0}} />}
                <div className="room-avatar" style={{position: 'relative', zIndex: 2}}>{avatar ? <SafeImg src={avatar} alt=""/> : ''}</div>
              </div>
              <div className="room-intro" style={{padding: '24px 28px 18px', background: 'rgba(255,255,255,0.85)'}}>
                <h1 style={{margin: 0, fontSize: '28px', color: '#8c526b'}}>{roomDef.title}</h1>
                <p style={{margin: '6px 0 0', color: '#51404c', fontSize: '15px'}}>{roomDef.desc}</p>
              </div>
            </section>
          )}

          {/* COMPACT FLOATING TOOLBAR HEADER */}
          <div style={{
            position: 'relative',
            zIndex: 1000,
            background: "linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 240, 246, 0.88)), url('https://i.postimg.cc/vHjZ1k3S/215b99c879bdd6e6511287efda1b90ee.jpg') center/cover no-repeat",
            border: '2px solid rgba(220, 105, 150, 0.65)',
            borderRadius: '20px',
            padding: '12px 20px',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(140, 82, 107, 0.18)'
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
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px'}} onClick={() => { setVisualTarget("cover"); fileInputRef.current?.click(); }}>🎨 Đổi ảnh bìa</button>
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px'}} onClick={() => { setVisualTarget("avatar"); fileInputRef.current?.click(); }}>👤 Đổi avatar</button>
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#d23a73', color: '#d23a73', background: 'rgba(255, 235, 245, 0.5)'}} onClick={() => setShowPreset(true)}>🖼️ Chọn nền phòng (Thư viện/Máy)</button>
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#d23a73', color: '#d23a73', background: 'rgba(255, 240, 246, 0.5)'}} onClick={() => setShowContextPreview(true)}>🔍 Context Window</button>
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#d23a73', color: '#d23a73', background: '#fff0f6'}} onClick={() => setShowStoryPinkCardsModal(true)}>🌸 Thẻ Hồng Cốt Truyện</button>
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#8c526b', color: '#8c526b', background: 'rgba(248, 239, 243, 0.5)'}} onClick={() => setShowImageReviewPanel(true)}>🖼️ Image Review ({getAllRoomImages().length})</button>
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
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG & GỌI API SIÊU TỐC NỘI TUYẾN KHÔNG CẦN TRÁI TIM */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        margin: '16px 0 20px 0',
        padding: '16px 24px',
        background: "linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 240, 246, 0.86)), url('https://i.postimg.cc/vHjZ1k3S/215b99c879bdd6e6511287efda1b90ee.jpg') center/cover no-repeat",
        border: '2.5px solid #e96b9b',
        borderRadius: '24px',
        boxShadow: '0 10px 28px rgba(210, 58, 115, 0.22)',
        animation: 'fadeIn 0.3s ease'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
          <button
            onClick={onBack}
            className="btn ghost small"
            style={{
              fontWeight: 800,
              color: '#8c526b',
              background: '#fff0f6',
              border: '1.5px solid #e96b9b',
              padding: '8px 16px',
              borderRadius: '14px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{fontSize: '1.1rem', lineHeight: 1}}>←</span>
            <span>Trở Ra Ngoài</span>
          </button>
          <button
            onClick={onHome}
            className="btn ghost small"
            style={{
              fontWeight: 800,
              color: '#c62828',
              background: '#ffebee',
              border: '1.5px solid #ef5350',
              padding: '8px 14px',
              borderRadius: '14px',
              fontSize: '0.85rem'
            }}
          >
            🏠 Thoát App
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px'}}>
            <span style={{fontSize: '1.4rem'}}>{roomDef.icon}</span>
            <span style={{fontWeight: 800, color: '#3e333e', fontSize: '1.1rem'}}>{roomDef.title}</span>
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <button
            onClick={runRoom}
            disabled={progress > 0 && progress < 100}
            className="btn primary"
            style={{
              padding: '12px 26px',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: progress > 0 && progress < 100 ? '#cccccc' : 'linear-gradient(135deg, #ff007f 0%, #d23a73 50%, #8c526b 100%)',
              boxShadow: progress > 0 && progress < 100 ? 'none' : '0 6px 18px rgba(255, 0, 127, 0.45)',
              color: '#ffffff',
              border: '2px solid #ffffff',
              borderRadius: '24px',
              cursor: progress > 0 && progress < 100 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease'
            }}
          >
            <span style={{fontSize: '1.2rem'}}>{progress > 0 && progress < 100 ? '⏳' : '✨'}</span>
            <span>{progress > 0 && progress < 100 ? `Đang tạo (${progress}%)...` : 'Gọi API Proxy Ngay Lập Tức'}</span>
          </button>
        </div>
      </div>

      {(roomDef.id === 'learn' || roomDef.id === 'poses10' || roomDef.id === 'soulful' || roomDef.id === 'bot_char_marketing_art' || roomDef.id === 'bot_char_hobbies_vibe') && (
        <div style={{
          margin: '16px 0',
          padding: '16px 20px',
          background: roomDef.id === 'bot_char_hobbies_vibe' ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #fff0f6 0%, #fef3f7 100%)',
          border: roomDef.id === 'bot_char_hobbies_vibe' ? '2px dashed #10b981' : '2px dashed #d23a73',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: roomDef.id === 'bot_char_hobbies_vibe' ? '0 6px 16px rgba(16, 185, 129, 0.08)' : '0 6px 16px rgba(210, 58, 115, 0.08)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{fontSize: '28px'}}>{roomDef.id === 'soulful' ? '🥀' : (roomDef.id === 'bot_char_marketing_art' || roomDef.id === 'bot_char_hobbies_vibe') ? '🐰' : '🛡️'}</span>
          <div>
            <div style={{fontWeight: 800, color: roomDef.id === 'bot_char_hobbies_vibe' ? '#047857' : '#9d174d', fontSize: '1rem', marginBottom: '4px'}}>
              {roomDef.id === 'poses10' 
                ? '💃 Chế Độ Tạo 10 Kiểu Dáng Từ 10 Ảnh Tham Chiếu & Tùy Biến Nguyên Bản 100%'
                : roomDef.id === 'soulful'
                ? '🥀 Chế Độ Bức Ảnh Biết Nói, Chiều Sâu Cảm Xúc & Tùy Biến Nhân Vật 100%'
                : roomDef.id === 'bot_char_marketing_art'
                ? '🐰 Nghệ Thuật Của Nhân Vật Bot Char (Marketing & Điện Ảnh Kĩ Xảo - CHỈ DÀNH CHO BOT CHAR)'
                : roomDef.id === 'bot_char_hobbies_vibe'
                ? '🐰 Sở Thích Của Bot Char (Vibe & Hobbies Không Vẽ Người - CHỈ DÀNH CHO BOT CHAR)'
                : '✿ Chế Độ Học Hỏi Nghệ Thuật & Tùy Biến Nguyên Bản 100% (Theo Yêu Cầu Của Vợ Yêu)'}
            </div>
            <div style={{fontSize: '0.85rem', color: roomDef.id === 'bot_char_hobbies_vibe' ? '#065f46' : '#8c526b', lineHeight: 1.5}}>
              {roomDef.id === 'poses10'
                ? <span><b>Chồng đã tích hợp cho vợ 10 thẻ dáng riêng biệt!</b> Vợ có thể đăng tải tối thiểu 10 ảnh tham chiếu cho 10 dáng khác nhau trong 1 lần gọi API. AI sẽ học hỏi tư thế chuyển động, góc máy, đường thị giác của từng ảnh và áp dụng vào đúng nhân vật của vợ, <b>tuyệt đối không copy tranh gốc hay khuôn mặt</b>!</span>
                : roomDef.id === 'soulful'
                ? <span><b>Chồng đã tích hợp chế độ Bức Ảnh Biết Nói cho vợ yêu!</b> AI sẽ học hỏi triệt để ánh sáng, bố cục, khí quyển và thần thái tự sự từ ảnh tham chiếu để thổi vào bức ảnh độ cảm động, sự <b>'hạnh hiểu'</b> và chiều sâu tâm lý. Bất kỳ ai nhìn vào bức ảnh cũng cảm nhận được một chương truyện đang diễn ra mà <b>không cần tiếng nói hay tiểu thuyết</b>, tuyệt đối giữ trọn bản sắc nhân vật và sáng tạo phong cách riêng độc quyền!</span>
                : roomDef.id === 'bot_char_marketing_art'
                ? <span><b>Chồng đã tích hợp phòng riêng biệt ĐỘC QUYỀN cho Bot Char (Nhân vật chính AI) của vợ yêu!</b> Vợ có thể dùng <b>nút hình con thỏ vẽ bằng code</b> ngay bên dưới để chọn từng nhân vật Bot Char riêng lẻ (Solo Marketing Art) hoặc gộp chung tất cả Bot Char (Group Marketing Art) trước khi bấm Gửi API Proxy. Phòng này tập trung vào kĩ xảo điện ảnh, hào quang volumetric, trang phục sang chảnh thời thượng, <b>tuyệt đối KHÔNG nhầm sang vẽ truyện tranh nhiều khung hay vẽ chibi</b> và tôn trọng 100% màu mắt, màu tóc, thần thái của Bot Char trong hồ sơ!</span>
                : roomDef.id === 'bot_char_hobbies_vibe'
                ? <span><b>Chồng đã tích hợp phòng Sở Thích & Vibe riêng biệt ĐỘC QUYỀN cho Bot Char của vợ yêu!</b> Vợ có thể dùng <b>nút hình con thỏ vẽ bằng code</b> bên dưới để chọn từng nhân vật Bot Char riêng lẻ hoặc gộp chung. Hạng mục này tập trung vào ẩm thực, đồ sưu tầm, phòng làm việc/chơi game, phòng ngủ, xe Moto, vé xem phim, ghi chú trên sách... dựa theo chính xác ảnh tham chiếu và cốt truyện hồ sơ. <b>NGUYÊN TẮC TUYỆT ĐỐI: KHÔNG vẽ nhân vật hay con người</b>, chỉ khắc họa không gian và đồ vật mang đậm dấu ấn tâm hồn của Bot Char!</span>
                : <span><b>Chồng đã thiết lập chế độ Sáng Tạo Độc Quyền & Học Hỏi Tinh Hoa!</b> AI được hướng dẫn nhìn ảnh tham chiếu để bóc tách và học hỏi <b>tinh hoa nghệ thuật chuyên nghiệp</b> (phong cách nét vẽ, chất cọ, góc đặt máy, đường dẫn mắt thị giác, tư thế tạo dáng, xử lý ánh sáng) và <b>thổi hồn vào đúng nhân vật, trang phục, cốt truyện riêng của vợ</b>. Bất kỳ ai nhìn vào cũng thấy đây là một tác phẩm nghệ thuật đỉnh cao của riêng vợ!</span>}
            </div>
          </div>
        </div>
      )}

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
                    if (apiAbortControllerRef.current) {
                      apiAbortControllerRef.current.abort();
                      apiAbortControllerRef.current = null;
                    }
                    setProgress(0);
                    setIsApiRunning(false);
                    setApiSignals(prev => ({ ...prev, requestStarted: false, streaming: false, completed: true, stage: 'done', stageLabel: '⏹️ Đã hủy yêu cầu', stageDetail: 'Yêu cầu API đã được hủy bỏ và ngắt kết nối.' }));
                    toast("⏹️ Đã dừng yêu cầu và đóng kết nối API.");
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
                      <span style={{fontSize: '0.7rem', background: '#e8f5e9', color: '#1b5e20', padding: '2px 6px', borderRadius: '6px', fontWeight: 800}}>Bám sát ảnh để học & ứng dụng (No no các vấn đề khác)</span>
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
                    <div key={`stage_${s.id}_${idx}`} style={{
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

      {/* 🎯 SELECTION BAR: TÁCH LẺ HOẶC GỘP CHUNG BOT CHARACTERS */}
      <div style={{
        background: 'linear-gradient(135deg, #fff0f6 0%, #fef3f7 100%)',
        border: '2px solid #e96b9b',
        borderRadius: '24px',
        padding: '12px 18px',
        margin: '0 0 16px 0',
        boxShadow: '0 8px 24px rgba(233, 107, 155, 0.12)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <span style={{fontSize: '28px'}}>🎯</span>
          <div>
            <h3 style={{margin: 0, fontSize: '1.05rem', color: '#8c526b', fontWeight: 800}}>
              Chọn Đối Tượng / Nhân Vật Làm Việc Cho Phòng Này (Tách Lẻ hay Gộp Chung theo Ý Vợ Yêu)
            </h3>
            <p style={{margin: '3px 0 0', fontSize: '0.85rem', color: '#6d5363', lineHeight: 1.4}}>
              Vợ có thể chọn <b>làm riêng lẻ từng Bot Char</b> (khi truyện có nhiều nhân vật và muốn tách prompt riêng cho từng người) hoặc <b>gộp chung tất cả</b>. AI sẽ nhận lệnh thẳng vào Context Window!
            </p>
          </div>
        </div>
        {renderTargetSelector(true)}
      </div>

      <section className="work-list">
        {roomDef.cards.map((c: any, i: number) => {
          const cs = roomState.cards?.[c.id] || { note: "", refs: [], output: "" };
          const cardRefs = cs.refs || [];
          return (
            <article className="work-card" key={`card_${roomDef.id}_${c.id}_${i}`}>
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
                    {renderTargetSelector(false)}
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
                      cardRefs.map((r: any, idx: number) => (
                        <div className="photo-card" key={`photo_${r.id || r.imageId || 'img'}_${idx}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedImgDetail({ ...r, cardId: c.id, cardTitle: c.title })}>
                          <SafeImg src={r.data || r.previewUrl || r.storageUrl} alt="" />
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
                    <CardNoteInput cs={cs} c={c} roomState={roomState} state={state} save={save} />
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
                              <li key={`ref_${r.id || r.imageId || 'img'}_${idx}`} style={{marginBottom: '2px'}}>
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
                              copyToClipboardSafe(cs.report);
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
                        <b style={{color: '#d23a73', fontSize: '0.95rem'}}>✨ FINAL PRODUCTION-READY PROMPT (Chia 5 Phần Thẩm Mỹ & Có Copy Liền Mạch):</b>
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

      <StyleAnalyzer roomState={roomState} currentStory={currentStory} roomDef={roomDef} state={state} save={save} toast={toast} />

      {/* COMPREHENSIVE SINGLE RESULT CARD - NOW JUST A SUCCESS HEADER */}
      {(roomState.result && roomState.result.length > 0) && (
        <section className="glass-panel" style={{margin: '16px 0', padding: '24px', background: 'rgba(255,255,255,0.95)', borderRadius: '24px', border: '2px solid rgba(220,105,150,0.45)', boxShadow: '0 12px 36px rgba(232,106,153,0.2)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px'}}>
            <div>
              <p className="eyebrow" style={{color: '#d23a73', margin: 0, fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase'}}>Kết quả tổng hợp đợt này</p>
              <h2 style={{margin: '4px 0 0 0', color: '#3e333e', fontSize: '1.45rem', fontWeight: 900}}>✨ API Đã Trả Kết Quả Về Từng Thẻ</h2>
              <p style={{margin: '8px 0 0', color: '#51404c', fontSize: '0.9rem'}}>Kết quả chi tiết đã được tự động phân bổ vào từng thẻ công việc bên trên.</p>
            </div>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <button className="btn primary small" onClick={() => {
                const combined = roomDef.cards.map((c: any) => {
                  const out = roomState.cards?.[c.id]?.output;
                  return out ? `--- ${c.title} ---\n${out}` : '';
                }).filter(Boolean).join('\n\n');
                if (!combined) { toast("Chưa có nội dung để copy."); return; }
                copyToClipboardSafe(combined);
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
              <div key={`hist_${h.id || 'item'}_${index}`} className="history-item" style={{background: '#fff', border: '1px solid rgba(238,153,190,0.45)', borderRadius: '16px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', boxShadow: '0 4px 12px rgba(232,106,153,0.06)'}}>
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
                    copyToClipboardSafe(h.result || "");
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
        <div className="modal show" style={{zIndex: 1150}}>
          <div className="modal-card" style={{maxWidth: '850px', maxHeight: '88vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-head" style={{borderBottom: '2px solid #f8bbd0', paddingBottom: 12}}>
              <div><p className="eyebrow" style={{color: '#d23a73', fontWeight: 700}}>THƯ VIỆN & PRESET NỀN PHÒNG</p><h2 style={{margin: 0, color: '#880e4f'}}>🌸 Chọn Hình Nền Phòng Làm Việc</h2></div>
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn primary small" style={{background: 'linear-gradient(135deg, #d23a73, #ff6090)', color: '#fff', fontWeight: 700}} onClick={() => {
                  setVisualTarget("background");
                  fileInputRef.current?.click();
                  setShowPreset(false);
                }}>📂 Tải Ảnh Mới Từ Máy Lên (Lưu DB)</button>
                <button className="btn ghost small" onClick={() => setShowPreset(false)}>✕ Đóng</button>
              </div>
            </div>
            
            <div style={{flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 20}}>
              {/* PHẦN 1: THƯ VIỆN ẢNH CÁ NHÂN (ĐÃ LƯU DB) */}
              <div>
                <h3 style={{fontSize: '0.95rem', fontWeight: 800, color: '#d23a73', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6}}>
                  <span>🖼️ Thư Viện Ảnh Người Dùng Đã Lưu DB ({
                    Array.from(new Set([
                      ...(currentStory?.files || []),
                      ...(state?.ui?.globalBg ? [state.ui.globalBg] : []),
                      ...(currentStory?.cover ? [currentStory.cover] : []),
                      ...(roomState?.background ? [roomState.background] : []),
                      ...getAllRoomImages().map((r: any) => r.previewUrl || r.data || r.storageUrl).filter(Boolean)
                    ])).filter((u: any) => typeof u === 'string' && u.trim().length > 0).length
                  } ảnh)</span>
                </h3>
                {Array.from(new Set([
                  ...(currentStory?.files || []),
                  ...(state?.ui?.globalBg ? [state.ui.globalBg] : []),
                  ...(currentStory?.cover ? [currentStory.cover] : []),
                  ...(roomState?.background ? [roomState.background] : []),
                  ...getAllRoomImages().map((r: any) => r.previewUrl || r.data || r.storageUrl).filter(Boolean)
                ])).filter((u: any) => typeof u === 'string' && u.trim().length > 0).length === 0 ? (
                  <div style={{padding: '20px', textAlign: 'center', background: '#fff0f6', borderRadius: 12, border: '1px dashed #f8bbd0', color: '#880e4f', fontSize: '0.85rem'}}>
                    Chưa có ảnh nào trong thư viện truyện này. Hãy bấm nút <b>"📂 Tải Ảnh Mới Từ Máy Lên"</b> để thêm hình nền vào DB nhé!
                  </div>
                ) : (
                  <div className="preset-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12}}>
                    {Array.from(new Set([
                      ...(currentStory?.files || []),
                      ...(state?.ui?.globalBg ? [state.ui.globalBg] : []),
                      ...(currentStory?.cover ? [currentStory.cover] : []),
                      ...(roomState?.background ? [roomState.background] : []),
                      ...getAllRoomImages().map((r: any) => r.previewUrl || r.data || r.storageUrl).filter(Boolean)
                    ])).filter((u: any) => typeof u === 'string' && u.trim().length > 0).map((u: any, idx: number) => (
                      <div className="preset" key={`user-img-${idx}`} style={{border: roomState.background === u ? '2.5px solid #d23a73' : '1px solid #f8bbd0', borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#fff'}}>
                        <SafeImg src={u} alt="" style={{width: '100%', height: 90, objectFit: 'cover'}} />
                        <div style={{padding: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff0f6'}}>
                          <span style={{fontSize: '0.7rem', fontWeight: 700, color: '#880e4f'}}>{roomState.background === u ? '✓ Đang dùng' : `Ảnh #${idx + 1}`}</span>
                          <button className="btn primary small" style={{padding: '2px 8px', fontSize: '0.7rem'}} onClick={() => {
                            roomState.background = u;
                            roomState.cover = u;
                            save(state);
                            toast("🌸 Đã áp dụng và lưu hình nền phòng từ thư viện DB!");
                            setShowPreset(false);
                          }}>Chọn</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PHẦN 2: PRESET HỆ THỐNG */}
              <div>
                <h3 style={{fontSize: '0.95rem', fontWeight: 800, color: '#555', margin: '0 0 10px 0'}}>🌌 Preset Nền Mặc Định Hệ Thống</h3>
                <div className="preset-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12}}>
                  {PRESET_BACKGROUNDS.map((u, i) => (
                    <div className="preset" key={`sys-preset-${i}`} style={{border: roomState.background === u ? '2.5px solid #d23a73' : '1px solid #ddd', borderRadius: 12, overflow: 'hidden', background: '#fff'}}>
                      <SafeImg src={u} alt="" style={{width: '100%', height: 90, objectFit: 'cover'}} />
                      <div style={{padding: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f5f5'}}>
                        <span style={{fontSize: '0.7rem', fontWeight: 600, color: '#555'}}>Preset {i + 1}</span>
                        <button className="btn ghost small" style={{padding: '2px 8px', fontSize: '0.7rem', border: '1px solid #ccc'}} onClick={() => {
                          roomState.background = u;
                          roomState.cover = u;
                          save(state);
                          toast("🌸 Đã áp dụng preset nền phòng!");
                          setShowPreset(false);
                        }}>Chọn</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                copyToClipboardSafe(JSON.stringify(selectedHistoryPayload.payload, null, 2));
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
                        <h4 style={{margin: 0, color: '#1565c0'}}>🖼️ Reference Image Manifest (Đọc & Ghi toàn bộ vào Context Window)</h4>
                        <span style={{fontSize: 11, color: '#1b5e20', fontWeight: 'bold'}}>Luật: Bám sát ảnh tham chiếu để học & ứng dụng vào cốt truyện (No no các vấn đề khác)</span>
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
                              <SafeImg src={img.previewUrl || img.storageUrl} alt="" style={{width: 70, height: 70, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #ccc'}} />
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
                  copyToClipboardSafe(JSON.stringify(buildContextPayload(), null, 2));
                  toast("📋 Đã copy JSON Context Payload vào Clipboard!");
                }}>📋 Copy JSON Context</button>
                <button className="btn ghost small" onClick={() => {
                  const p = buildContextPayload();
                  copyToClipboardSafe(p.mergedStoryContext.finalStoryContext);
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
                copyToClipboardSafe(selectedFileDetail.extractedText || selectedFileDetail.text || "");
                toast("📋 Đã copy nội dung file!");
              }}>📋 Copy Nội Dung</button>
              <button className="btn ghost small" onClick={() => setSelectedFileDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết phân tích ảnh & Chú thích handmade */}
      {selectedImgDetail && (() => {
        const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(1));
          const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(1));
          setTempAnnCoords({ x, y });
          setAnnText("");
        };

        const handleSaveAnnotation = () => {
          if (!tempAnnCoords || !annText.trim()) return;
          const newAnn = {
            id: uuidv4(),
            x: tempAnnCoords.x,
            y: tempAnnCoords.y,
            text: annText.trim(),
            color: annColor,
            placement: annPlacement
          };
          const currentAnns = selectedImgDetail.annotations || [];
          const updatedAnns = [...currentAnns, newAnn];
          updateImgDetailAnnotations(updatedAnns);
          setTempAnnCoords(null);
          setAnnText("");
          toast("🌸 Thêm chú thích viết tay thành công!");
        };

        const handleRemoveAnnotation = (id: string) => {
          const currentAnns = selectedImgDetail.annotations || [];
          const updatedAnns = currentAnns.filter((a: any) => a.id !== id);
          updateImgDetailAnnotations(updatedAnns);
          toast("🗑️ Đã xóa chú thích!");
        };

        const currentAnnotations = selectedImgDetail.annotations || [];

        return (
          <div className="modal show" style={{zIndex: 1150, background: 'rgba(10,5,15,0.82)'}}>
            <div className="modal-card" style={{maxWidth: '1180px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '2px solid #ff4081', boxShadow: '0 8px 32px rgba(233,30,99,0.35)'}}>
              <div className="modal-head" style={{borderBottom: '2px solid #ffcbdc', paddingBottom: '10px'}}>
                <div>
                  <p className="eyebrow" style={{color: '#e91e63', fontWeight: 700}}>🎨 INTERACTIVE IMAGE ANNOTATION STUDIO</p>
                  <h3 style={{margin: 0, color: '#880e4f'}}>🌸 Ghi chú &amp; Nhật ký Thiết kế: {selectedImgDetail.fileName || selectedImgDetail.name}</h3>
                </div>
                <button className="btn ghost small" onClick={() => { setSelectedImgDetail(null); setTempAnnCoords(null); }}>✕ Đóng</button>
              </div>

              <div style={{margin: '8px 0', background: '#ffeef4', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', color: '#ad1457', border: '1px dashed #ff4081', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>💡</span>
                <span><b>Mách nhỏ vợ yêu:</b> Hãy <b>click vào bất kỳ vị trí nào trên ảnh</b> ở khung bên trái để thêm một dòng note viết tay ✍️ nhắm trúng sự vật, nụ cười, phụ kiện, cây cỏ hay góc chụp nha! Mũi tên chỉ hướng vẽ tay sẽ tự động hướng về điểm click của vợ. AI sẽ đọc chi tiết ghi chú này để phối đồ và tái hiện câu chuyện chuẩn xác nhất!</span>
              </div>

              <div style={{display: 'flex', gap: '16px', margin: '12px 0', flex: 1, overflowY: 'auto', minHeight: '350px'}}>
                {/* CỘT TRÁI: INTERACTIVE IMAGE CANVAS */}
                <div style={{flex: '1.2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#1c1216', borderRadius: '12px', padding: '12px', border: '1.5px solid #ffcbdc'}}>
                  <div style={{position: 'relative', maxWidth: '100%', maxHeight: '55vh', display: 'inline-block'}}>
                    {/* The Reference Image rendering with SafeImg wrapper */}
                    <div style={{position: 'relative', display: 'inline-block', cursor: 'crosshair'}}>
                      <SafeImg 
                        src={selectedImgDetail.previewUrl || selectedImgDetail.data || selectedImgDetail.storageUrl} 
                        alt="Reference Studio" 
                        style={{maxWidth: '100%', maxHeight: '55vh', borderRadius: '8px', display: 'block'}} 
                      />
                      
                      {/* Clickable Overlay covering the image exactly */}
                      <div 
                        onClick={handleImageClick}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 5
                        }}
                      />

                      {/* Render All Existing Annotations */}
                      {currentAnnotations.map((ann: any) => {
                        const isHovered = hoveredAnnId === ann.id;
                        const color = ann.color || "#e91e63";

                        // Compute absolute offsets for CSS styles to point note correctly
                        let offsetStyle: React.CSSProperties = {};
                        let lineSvg: React.ReactNode = null;

                        switch(ann.placement || 'bottom') {
                          case 'top':
                            offsetStyle = { bottom: '28px', left: '50%', transform: 'translateX(-50%)' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', bottom: '-28px', left: '50%', width: '16px', height: '28px', transform: 'translateX(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 8 0 Q 12 14 8 28" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 8 28 L 4 21 M 8 28 L 12 21" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'bottom':
                            offsetStyle = { top: '28px', left: '50%', transform: 'translateX(-50%)' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', top: '-28px', left: '50%', width: '16px', height: '28px', transform: 'translateX(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 8 28 Q 4 14 8 0" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 8 0 L 4 7 M 8 0 L 12 7" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'left':
                            offsetStyle = { right: '28px', top: '50%', transform: 'translateY(-50%)' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', right: '-28px', top: '50%', width: '28px', height: '16px', transform: 'translateY(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 0 8 Q 14 12 28 8" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 28 8 L 21 4 M 28 8 L 21 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'right':
                            offsetStyle = { left: '28px', top: '50%', transform: 'translateY(-50%)' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', left: '-28px', top: '50%', width: '28px', height: '16px', transform: 'translateY(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 28 8 Q 14 4 0 8" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 0 8 L 7 4 M 0 8 L 7 12" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'top-left':
                            offsetStyle = { bottom: '22px', right: '22px' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', bottom: '-22px', right: '-22px', width: '22px', height: '22px', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 0 0 Q 11 11 22 22" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 22 22 L 14 20 M 22 22 L 20 14" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'top-right':
                            offsetStyle = { bottom: '22px', left: '22px' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', bottom: '-22px', left: '-22px', width: '22px', height: '22px', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 22 0 Q 11 11 0 22" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 0 22 L 8 20 M 0 22 L 2 14" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'bottom-left':
                            offsetStyle = { top: '22px', right: '22px' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', top: '-22px', right: '-22px', width: '22px', height: '22px', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 0 22 Q 11 11 22 0" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 22 0 L 14 2 M 22 0 L 20 8" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                          case 'bottom-right':
                            offsetStyle = { top: '22px', left: '22px' };
                            lineSvg = (
                              <svg style={{ position: 'absolute', top: '-22px', left: '-22px', width: '22px', height: '22px', overflow: 'visible', pointerEvents: 'none' }}>
                                <path d="M 22 22 Q 11 11 0 0" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="3,3" />
                                <path d="M 0 0 L 8 2 M 0 0 L 2 8" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            );
                            break;
                        }

                        return (
                          <div 
                            key={ann.id}
                            style={{
                              position: 'absolute',
                              left: `${ann.x}%`,
                              top: `${ann.y}%`,
                              zIndex: isHovered ? 100 : 10,
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Marker Pin Point */}
                            <div 
                              onMouseEnter={() => setHoveredAnnId(ann.id)}
                              onMouseLeave={() => setHoveredAnnId(null)}
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: color,
                                border: '2px solid white',
                                boxShadow: '0 0 8px rgba(0,0,0,0.6)',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease'
                              }}
                              title="Hover để xem note chỉ dẫn"
                            />

                            {/* Handwritten Floating Text Bubble */}
                            <div 
                              onMouseEnter={() => setHoveredAnnId(ann.id)}
                              onMouseLeave={() => setHoveredAnnId(null)}
                              style={{
                                position: 'absolute',
                                ...offsetStyle,
                                fontFamily: "'Caveat', cursive, sans-serif",
                                fontSize: '15px',
                                fontWeight: 'bold',
                                color: color,
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                border: `2px dashed ${color}`,
                                boxShadow: isHovered ? '0 5px 12px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.15)',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'transform 0.12s ease-in-out',
                                transform: isHovered ? `${offsetStyle.transform || ''} scale(1.1)` : offsetStyle.transform
                              }}
                            >
                              <span>{ann.text}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveAnnotation(ann.id); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ff4d4f',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  padding: '0 2px',
                                  fontWeight: 'bold'
                                }}
                                title="Xóa chú thích"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Dotted Arrow Path Connector */}
                            {lineSvg}
                          </div>
                        );
                      })}

                      {/* Glowing Pulse Dot for Temporary New Placement Location */}
                      {tempAnnCoords && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: `${tempAnnCoords.x}%`,
                            top: `${tempAnnCoords.y}%`,
                            zIndex: 120,
                            pointerEvents: 'none'
                          }}
                        >
                          <div 
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: annColor,
                              border: '2px solid white',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: `0 0 12px ${annColor}`
                            }}
                            className="pulse-effect"
                          />
                          <div 
                            style={{
                              position: 'absolute',
                              bottom: '18px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: 'rgba(210,58,115,0.9)',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              whiteSpace: 'nowrap',
                              fontWeight: '600'
                            }}
                          >
                            📍 Chấm ở đây nè vợ yêu!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{marginTop: '10px', fontSize: '12px', color: '#b0bec5', fontStyle: 'italic'}}>
                    🔍 Click vào điểm bất kỳ trên ảnh để thả Pin &amp; Note. Di chuột qua Pin/Note để xem chi tiết.
                  </div>
                </div>

                {/* CỘT PHẢI: DETAIL PANEL WITH NOTES FORM AND VISION REPORT */}
                <div style={{flex: '1', display: 'flex', flexDirection: 'column', background: '#fafafa', borderRadius: '12px', border: '1px solid #ccc', overflow: 'hidden'}}>
                  {/* Tab Header Bar */}
                  <div style={{display: 'flex', borderBottom: '1px solid #ccc', background: '#eceff1'}}>
                    <button 
                      onClick={() => setModalTab('notes')}
                      style={{
                        flex: 1, 
                        padding: '10px', 
                        border: 'none', 
                        background: modalTab === 'notes' ? '#fff' : 'transparent',
                        fontWeight: modalTab === 'notes' ? 'bold' : 'normal',
                        color: modalTab === 'notes' ? '#880e4f' : '#555',
                        borderBottom: modalTab === 'notes' ? '3px solid #e91e63' : 'none',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      📝 Nhật ký Chú thích ({currentAnnotations.length})
                    </button>
                    <button 
                      onClick={() => setModalTab('vision')}
                      style={{
                        flex: 1, 
                        padding: '10px', 
                        border: 'none', 
                        background: modalTab === 'vision' ? '#fff' : 'transparent',
                        fontWeight: modalTab === 'vision' ? 'bold' : 'normal',
                        color: modalTab === 'vision' ? '#880e4f' : '#555',
                        borderBottom: modalTab === 'vision' ? '3px solid #e91e63' : 'none',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🧠 Báo cáo Phân tích AI Vision
                    </button>
                  </div>

                  {/* Tab Body */}
                  <div style={{flex: 1, padding: '12px', overflowY: 'auto', textAlign: 'left'}}>
                    {modalTab === 'notes' ? (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                        {/* 1. Temp Annotation Form (If User Just Clicked) */}
                        {tempAnnCoords ? (
                          <div style={{background: '#fff3e0', padding: '12px', borderRadius: '10px', border: '1px solid #ffe0b2', boxShadow: '0 2px 8px rgba(255,152,0,0.1)'}}>
                            <h4 style={{margin: '0 0 10px 0', color: '#e65100', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <span>✏️ Viết note chỉ dẫn mới</span>
                            </h4>
                            
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                              <div>
                                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>📝 Nội dung chú thích viết tay (vợ có thể thêm emoji!):</label>
                                <input 
                                  type="text" 
                                  value={annText}
                                  onChange={(e) => setAnnText(e.target.value)}
                                  placeholder="Ví dụ: ! trang sức ngọc trai lấp lánh, @ nụ cười hạnh phúc, # bối cảnh hoa cỏ xuân..."
                                  style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #ffb74d', marginTop: '4px', fontSize: '13px'}}
                                  autoFocus
                                />
                              </div>

                              <div style={{display: 'flex', gap: '8px'}}>
                                <div style={{flex: 1}}>
                                  <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>🧭 Hướng chỉ mũi tên:</label>
                                  <select 
                                    value={annPlacement}
                                    onChange={(e: any) => setAnnPlacement(e.target.value)}
                                    style={{width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px', fontSize: '12px'}}
                                  >
                                    <option value="top">Chỉ từ trên xuống</option>
                                    <option value="bottom">Chỉ từ dưới lên</option>
                                    <option value="left">Chỉ từ trái qua</option>
                                    <option value="right">Chỉ từ phải qua</option>
                                    <option value="top-left">Chéo từ góc trên-trái</option>
                                    <option value="top-right">Chéo từ góc trên-phải</option>
                                    <option value="bottom-left">Chéo từ góc dưới-trái</option>
                                    <option value="bottom-right">Chéo từ góc dưới-phải</option>
                                  </select>
                                </div>

                                <div style={{flex: 1}}>
                                  <label style={{fontSize: '12px', fontWeight: 'bold', color: '#555'}}>🎨 Màu sắc nét vẽ:</label>
                                  <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px'}}>
                                    {["#e91e63", "#9c27b0", "#2196f3", "#009688", "#ff9800", "#795548", "#222222"].map((c) => (
                                      <button 
                                        key={c}
                                        onClick={() => setAnnColor(c)}
                                        style={{
                                          width: '18px', 
                                          height: '18px', 
                                          borderRadius: '50%', 
                                          background: c, 
                                          border: annColor === c ? '2px solid #000' : '1px solid #ccc',
                                          cursor: 'pointer',
                                          transform: annColor === c ? 'scale(1.2)' : 'scale(1)',
                                          padding: 0
                                        }}
                                        title={c}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div style={{display: 'flex', gap: '8px', marginTop: '6px'}}>
                                <button className="btn text small" onClick={() => setTempAnnCoords(null)} style={{flex: 1, padding: '6px 0'}}>Hủy bỏ</button>
                                <button 
                                  className="btn primary small" 
                                  disabled={!annText.trim()}
                                  onClick={handleSaveAnnotation}
                                  style={{flex: 1.5, background: '#e65100', color: '#fff', padding: '6px 0', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                                >
                                  🌸 Thêm Note Viết Tay
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{background: '#efeecf', padding: '10px', borderRadius: '8px', border: '1px solid #d4d29a', fontSize: '12px', color: '#7a7629', textAlign: 'center'}}>
                            👆 Vợ click vào bất kỳ vùng nào trên ảnh để lưu vị trí và viết note tay nha!
                          </div>
                        )}

                        {/* 2. Annotations List (Handwritten Style Cards) */}
                        <div>
                          <h4 style={{margin: '0 0 10px 0', color: '#880e4f', borderBottom: '1px solid #f8bbd0', paddingBottom: '4px'}}>
                            📂 Danh sách Chú thích Nhật ký ({currentAnnotations.length})
                          </h4>
                          
                          {currentAnnotations.length === 0 ? (
                            <div style={{padding: '24px 12px', textAlign: 'center', color: '#999', fontSize: '13px'}}>
                              🍃 Ảnh chưa có chú thích viết tay nào.<br/>
                              Vợ thả tim và bấm lên ảnh để ghi nhật ký vẽ nháp xinh xắn nhé!
                            </div>
                          ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                              {currentAnnotations.map((ann: any, index: number) => (
                                <div 
                                  key={ann.id}
                                  onMouseEnter={() => setHoveredAnnId(ann.id)}
                                  onMouseLeave={() => setHoveredAnnId(null)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: hoveredAnnId === ann.id ? '#fff0f6' : '#fff',
                                    border: hoveredAnnId === ann.id ? `1.5px solid ${ann.color || '#e91e63'}` : '1.5px solid #eaeaea',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style={{
                                      width: '10px', 
                                      height: '10px', 
                                      borderRadius: '50%', 
                                      background: ann.color || '#e91e63',
                                      flexShrink: 0
                                    }}/>
                                    <span style={{fontSize: '11px', color: '#999', fontFamily: 'monospace'}}>#{index+1} ({ann.x}%, {ann.y}%)</span>
                                    <span style={{
                                      fontFamily: "'Caveat', cursive, sans-serif", 
                                      fontSize: '16px', 
                                      fontWeight: 'bold', 
                                      color: ann.color || '#e91e63',
                                      marginLeft: '4px'
                                    }}>
                                      {ann.text}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => handleRemoveAnnotation(ann.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#999',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      padding: '4px 6px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4f'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                                    title="Xóa note"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ORIGINAL AI VISION REPORT TAB */
                      <div>
                        <h4 style={{margin: '0 0 8px 0', color: '#880e4f', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                          <span>🧠 AI Vision Analysis Report:</span>
                          <button 
                            className="btn small" 
                            style={{background: '#d23a73', color: '#fff', fontSize: '11px', padding: '2px 8px'}} 
                            onClick={async () => {
                              const success = await analyzeSingleImage(selectedImgDetail, selectedImgDetail.cardId || 'reference', selectedImgDetail.cardTitle || 'Reference');
                              if (success) {
                                setSelectedImgDetail({ ...selectedImgDetail, analysisStatus: 'analyzed' });
                              }
                            }}
                          >
                            🔄 Thử đọc lại AI Vision
                          </button>
                        </h4>
                        
                        {selectedImgDetail.imageAnalysisJson ? (
                          <div style={{fontSize: '12px', lineHeight: '1.5'}}>
                            <div style={{marginBottom: 8, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e0e0e0'}}>
                              <b style={{color: '#d23a73'}}>✨ Tóm tắt (High Reference Fidelity):</b><br/>
                              {selectedImgDetail.imageAnalysisJson.summary || "Không có"}
                            </div>
                            <div style={{marginBottom: 8}}><b>🎨 Visual Style Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.visualStyleExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.visualStyleExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.visualStyleExtracted || selectedImgDetail.imageAnalysisJson.style || {})}</div>
                            <div style={{marginBottom: 8}}><b>🌈 Color Palette Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.colorPaletteExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.colorPaletteExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.colorPaletteExtracted || selectedImgDetail.imageAnalysisJson.color || {})}</div>
                            <div style={{marginBottom: 8}}><b>🖌️ Line &amp; Render Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted : JSON.stringify(selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted || selectedImgDetail.imageAnalysisJson.layer5_artStyle || {})}</div>
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
                              <b>🚫 Originality Elements (Bespoke Story Elements):</b><br/>
                              {typeof (selectedImgDetail.imageAnalysisJson.originalityElements ) === 'string' ? (selectedImgDetail.imageAnalysisJson.originalityElements ) : JSON.stringify((selectedImgDetail.imageAnalysisJson.originalityElements ) || "Khuôn mặt cụ thể, danh tính nhân vật, pose y hệt 1:1, trang phục y hệt 1:1")}
                            </div>
                          </div>
                        ) : (
                          <pre style={{margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.5, background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}>
                            {selectedImgDetail.imageAnalysisText || selectedImgDetail.analysisResult || "⚠️ Ảnh chưa được phân tích hoặc đang chờ xử lý."}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #ddd', paddingTop: '10px'}}>
                <button className="btn ghost small" onClick={() => { setSelectedImgDetail(null); setTempAnnCoords(null); }}>Đóng</button>
              </div>
            </div>
          </div>
        );
      })()}

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
                      <SafeImg src={r.previewUrl || r.data || r.storageUrl} alt="" style={{width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0}} />
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
                          style={{fontSize: 11, padding: '4px 8px', background: isAnalyzingImages ? '#ccc' : '#e91e63', color: '#fff'}} 
                          disabled={isAnalyzingImages}
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

      {/* Modal Thẻ Hồng Cốt Truyện trong RoomView */}
      {showStoryPinkCardsModal && (
        <div className="modal show" style={{zIndex: 1160, background: 'rgba(0,0,0,0.75)'}}>
          <div className="modal-card" style={{maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff8fb'}}>
            <div className="modal-head" style={{borderBottom: '2px solid #f8bbd0', paddingBottom: 12}}>
              <div>
                <p className="eyebrow" style={{color: '#d23a73', fontWeight: 700}}>STORY CONTEXT & CHARACTERS</p>
                <h3 style={{margin: 0, color: '#880e4f'}}>🌸 Thẻ Hồng Cốt Truyện & Nhân Vật ({currentStory?.title || 'Chưa đặt tên'})</h3>
              </div>
              <div style={{display: 'flex', gap: 8}}>
                {onOpenStoryForm && (
                  <button 
                    className="btn primary small" 
                    style={{background: '#d23a73', color: '#fff', fontWeight: 800, padding: '6px 14px', borderRadius: '14px'}}
                    onClick={() => {
                      setShowStoryPinkCardsModal(false);
                      onOpenStoryForm();
                    }}
                  >
                    ✏️ Sửa Story / Thêm chi tiết
                  </button>
                )}
                <button className="btn ghost small" onClick={() => setShowStoryPinkCardsModal(false)}>✕ Đóng</button>
              </div>
            </div>

            <div style={{flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '16px 4px'}}>
              {/* Thẻ Hồng 1: Tên Câu Chuyện & Cốt Truyện */}
              <div style={{ background: '#fff', border: '1.5px solid #f8bbd0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(210,58,115,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📖</span>
                  <h3 style={{ margin: 0, color: '#d23a73', fontSize: '1.05rem', fontWeight: 800 }}>Cốt Truyện & Bối Cảnh</h3>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#333', flex: 1 }}>
                  <div style={{ marginBottom: '8px' }}><b>Tên Story:</b> <span style={{ color: '#880e4f', fontWeight: 700 }}>{currentStory?.title}</span></div>
                  {currentStory?.subtitle && <div style={{ marginBottom: '8px', background: '#fff9fb', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #d23a73' }}><b>Mood:</b> {currentStory.subtitle}</div>}
                  <div><b>Nội dung chính:</b></div>
                  <div style={{ marginTop: '4px', background: '#fcf4f8', padding: '10px', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.85rem', border: '1px solid #fde0ef' }}>
                    {currentStory?.story || <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa nhập cốt truyện chi tiết.</span>}
                  </div>
                </div>
              </div>

              {/* Thẻ Hồng 2: Danh Sách Bot Characters */}
              <div style={{ background: '#fff', border: '1.5px solid #f8bbd0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(210,58,115,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>👑</span>
                    <h3 style={{ margin: 0, color: '#d23a73', fontSize: '1.05rem', fontWeight: 800 }}>Bot Characters</h3>
                  </div>
                  <span style={{ background: '#d23a73', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                    {(currentStory?.botCharacters && currentStory.botCharacters.length > 0 ? currentStory.botCharacters.length : 1)} Bot
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {currentStory?.botCharacters && currentStory.botCharacters.length > 0 ? (
                    currentStory.botCharacters.map((bc: any, bIdx: number) => (
                      <div key={bIdx} style={{ background: '#fff0f6', border: '1px solid #f8bbd0', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <b style={{ color: '#880e4f', fontSize: '0.9rem' }}>#{bIdx + 1}. {bc.displayName || `Bot Char #${bIdx + 1}`}</b>
                          <span style={{ fontSize: '0.75rem', color: bc.referenceImages?.length ? '#2e7d32' : '#888', background: '#fff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e0e0e0', fontWeight: 600 }}>
                            🖼️ {bc.referenceImages?.length || 0} ảnh ref
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#444', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto', lineHeight: 1.4 }}>
                          {bc.profileText || <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa nhập hồ sơ chi tiết.</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ background: '#fff0f6', border: '1px solid #f8bbd0', borderRadius: '10px', padding: '10px', fontSize: '0.85rem', color: '#444' }}>
                      <b style={{ color: '#880e4f' }}>Bot Char chính:</b>
                      <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
                        {currentStory?.botProfiles || <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa thiết lập Bot Profile.</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thẻ Hồng 3: Hồ Sơ Vợ Yêu ({user}) & Nhân Vật Phụ */}
              <div style={{ background: '#fff', border: '1.5px solid #f8bbd0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(210,58,115,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>👤</span>
                  <h3 style={{ margin: 0, color: '#d23a73', fontSize: '1.05rem', fontWeight: 800 }}>Hồ Sơ Vợ Yêu & Char Phụ</h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#333', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  <div style={{ background: '#fef6fa', padding: '10px', borderRadius: '8px', border: '1px solid #fde0ef' }}>
                    <b style={{ color: '#d23a73', display: 'block', marginBottom: '4px' }}>💖 Hồ Sơ Vợ Yêu ({'{user}'}):</b>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {currentStory?.userProfile || <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa nhập hồ sơ Vợ Yêu.</span>}
                    </div>
                  </div>
                  {currentStory?.sideCharacters && (
                    <div style={{ background: '#fff9fb', padding: '10px', borderRadius: '8px', border: '1px solid #fde0ef' }}>
                      <b style={{ color: '#880e4f', display: 'block', marginBottom: '4px' }}>👥 Nhân Vật Phụ:</b>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{currentStory.sideCharacters}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thẻ Hồng 4: Yêu Cầu Đặc Biệt & Tài Liệu Đính Kèm */}
              <div style={{ background: '#fff', border: '1.5px solid #f8bbd0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(210,58,115,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📌</span>
                    <h3 style={{ margin: 0, color: '#d23a73', fontSize: '1.05rem', fontWeight: 800 }}>Quy Tắc & Tài Liệu</h3>
                  </div>
                  <span style={{ background: '#8c526b', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                    {(currentStory?.files?.length || 0)} file
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#333', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                    <b style={{ color: '#e65100', display: 'block', marginBottom: '4px' }}>⚠️ Yêu Cầu Đặc Biệt:</b>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {currentStory?.requirements || <span style={{ color: '#888', fontStyle: 'italic' }}>Không có yêu cầu thêm cho prompt.</span>}
                    </div>
                  </div>
                  {currentStory?.files && currentStory.files.length > 0 && (
                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                      <b style={{ color: '#333', display: 'block', marginBottom: '6px' }}>📚 Tài Liệu Đính Kèm:</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentStory.files.map((f: any, fIdx: number) => (
                          <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: '#1565c0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>📄 {f.fileName || f.name}</span>
                            <span style={{ color: '#2e7d32', fontWeight: 700, fontSize: '0.75rem' }}>{f.parserStatus === 'extracted' ? '✅ Đã đọc' : '⏳ Sẵn sàng'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12}}>
              <button className="btn ghost small" onClick={() => setShowStoryPinkCardsModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
