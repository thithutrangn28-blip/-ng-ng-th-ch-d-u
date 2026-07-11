import React, { useState, useRef, useEffect } from "react";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { PRESET_BACKGROUNDS, rooms as ROOMS_DATA } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { copyToClipboardSafe } from "../../lib/clipboard";
import { v4 as uuidv4 } from "uuid";
import StyleAnalyzer from "./StyleAnalyzer";
import { SafeImg } from "../../components/SafeImg";
import { compressImageFile } from "../../utils/imageCompressor";
import { getPrimaryApiProfile } from "../../lib/api-db";
import { getApiProxySettings } from "../../utils/apiProxy";

function PromptFivePartsViewer({ 
  output, 
  toast, 
  isApiRunning, 
  cardTitle,
  elapsedSeconds 
}: { 
  output: string; 
  toast: any; 
  isApiRunning: boolean; 
  cardTitle: string;
  elapsedSeconds?: number;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [copiedParts, setCopiedParts] = useState<Record<string, boolean>>({});
  const rawText = (output || "").trim();

  // Load API Profile & settings
  useEffect(() => {
    getPrimaryApiProfile().then(p => {
      if (p) setActiveProfile(p);
    }).catch(e => console.warn("Lỗi đọc API Profile:", e));
  }, []);

  const proxySettings = getApiProxySettings();

  // Parse text into structured sections using our robust ### split algorithm
  const getParsedParts = () => {
    const parsed: { id: string; title: string; subtitle: string; icon: string; content: string; color: string; bg: string }[] = [];
    if (!rawText) return parsed;

    // Split text by lines that start with ###
    const sections = rawText.split(/(?:^|\n)###\s+/);
    
    for (let i = 1; i < sections.length; i++) {
      const sectionText = sections[i];
      const newlineIndex = sectionText.indexOf('\n');
      const header = newlineIndex !== -1 ? sectionText.substring(0, newlineIndex).trim() : sectionText.trim();
      let content = newlineIndex !== -1 ? sectionText.substring(newlineIndex + 1).trim() : "";
      
      // Clean up horizontal separators and codeblock wrapper boundaries
      content = content.replace(/^---$/, "").replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "").trim();
      if (!content && isApiRunning) {
        content = "⏳ AI đang viết tiếp nội dung phần này cho vợ yêu...";
      }

      const headerLower = header.toLowerCase();
      let id = `part_${i}`;
      let title = header;
      let icon = "✨";
      let subtitle = "Mô tả chi tiết thẩm mỹ";
      let color = "#d23a73";
      let bg = "rgba(210, 58, 115, 0.03)";

      if (headerLower.includes("tư liệu") || headerLower.includes("aesthetic") || headerLower.includes("dna") || headerLower.includes("tham chiếu")) {
        id = "aesthetic_dna";
        icon = "👑";
        subtitle = "Báo cáo thẩm định & Phân tích DNA nghệ thuật cốt lõi";
        color = "#b83280";
        bg = "rgba(184, 50, 128, 0.03)";
      } else if (headerLower.includes("tổng quan") || headerLower.includes("webtoon") || headerLower.includes("overview")) {
        id = "comic_overview";
        icon = "📚";
        subtitle = "Cấu trúc bố cục & Tuyến nhân vật của trang truyện";
        color = "#6a1b9a";
        bg = "rgba(106, 27, 154, 0.03)";
      } else if (headerLower.includes("khung") || headerLower.includes("panel") || headerLower.includes("scene") || headerLower.includes("frame")) {
        id = `panel_${i}`;
        icon = "🖼️";
        subtitle = `Bố cục máy, nhân vật & English Prompt của Khung truyện`;
        color = "#ef6c00";
        bg = "rgba(239, 108, 0, 0.03)";
      } else if (headerLower.includes("toàn trang") || headerLower.includes("full page") || headerLower.includes("comic prompt")) {
        id = "comic_master_prompt";
        icon = "🎨";
        subtitle = "English Prompt tổng hợp cho toàn bộ trang truyện sequential art";
        color = "#c62828";
        bg = "rgba(198, 40, 40, 0.03)";
      } else if (headerLower.includes("part 1") || headerLower.includes("phần 1") || headerLower.includes("subject") || headerLower.includes("pose") || headerLower.includes("nhân vật") || headerLower.includes("cử chỉ")) {
        id = "part_1";
        icon = "🧑";
        subtitle = "Nhân vật, cử chỉ tạo dáng & ngôn ngữ cơ thể (Bám sát 85%-95% ảnh)";
        color = "#c2185b";
        bg = "rgba(194, 24, 91, 0.03)";
      } else if (headerLower.includes("part 2") || headerLower.includes("phần 2") || headerLower.includes("outfit") || headerLower.includes("styling") || headerLower.includes("trang phục") || headerLower.includes("chất liệu")) {
        id = "part_2";
        icon = "👗";
        subtitle = "Trang phục silhouette, chất liệu vải & phụ kiện đi kèm";
        color = "#8e24aa";
        bg = "rgba(142, 36, 170, 0.03)";
      } else if (headerLower.includes("part 3") || headerLower.includes("phần 3") || headerLower.includes("environment") || headerLower.includes("background") || headerLower.includes("bối cảnh") || headerLower.includes("không gian")) {
        id = "part_3";
        icon = "🌌";
        subtitle = "Không gian bối cảnh, kiến trúc, thiên nhiên & chiều sâu";
        color = "#1976d2";
        bg = "rgba(25, 118, 210, 0.03)";
      } else if (headerLower.includes("part 4") || headerLower.includes("phần 4") || headerLower.includes("lighting") || headerLower.includes("color") || headerLower.includes("atmosphere") || headerLower.includes("ánh sáng") || headerLower.includes("màu sắc")) {
        id = "part_4";
        icon = "💡";
        subtitle = "Ánh sáng direction, bảng màu chủ đạo & chất cảm bầu không khí";
        color = "#e65100";
        bg = "rgba(230, 81, 0, 0.03)";
      } else if (headerLower.includes("part 5") || headerLower.includes("phần 5") || headerLower.includes("camera") || headerLower.includes("angle") || headerLower.includes("perspective") || headerLower.includes("composition") || headerLower.includes("góc chụp") || headerLower.includes("thị giác")) {
        id = "part_5";
        icon = "📸";
        subtitle = "Góc chụp (low/high/eye), tiêu cự, depth of field & bố cục thị giác";
        color = "#00897b";
        bg = "rgba(0, 137, 123, 0.03)";
      } else if (headerLower.includes("prompt tạo ảnh") || headerLower.includes("master") || headerLower.includes("english prompt") || headerLower.includes("tổng hợp")) {
        id = "master_prompt";
        icon = "🎨";
        subtitle = "Prompt Tiếng Anh hoàn chỉnh liền mạch (Sẵn sàng 1-click Copy)";
        color = "#d32f2f";
        bg = "rgba(211, 47, 47, 0.03)";
      }

      parsed.push({
        id,
        title: header || `Phần ${i}`,
        subtitle,
        icon,
        content: content || (isApiRunning ? "⏳ Đang stream tiếp nội dung phần này..." : ""),
        color,
        bg
      });
    }

    // Fallback if no ### was parsed
    if (parsed.length === 0) {
      const altRegex = /(?:^|\n)(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*(\d+[^:\n]*?:?)(.*?)(?=(?:\n(?:\*\*|\#\#)?\s*(?:PART|PHẦN|Phần)\s*\d+|\n---|$))/gsi;
      const altMatches = [...rawText.matchAll(altRegex)];
      if (altMatches.length > 0) {
        altMatches.forEach((m, idx) => {
          parsed.push({
            id: `part_${idx + 1}`,
            title: `Phần ${idx + 1}: ${m[1].replace(/[:*]/g, "").trim()}`,
            subtitle: "Mô tả chi tiết phân đoạn",
            icon: "✨",
            content: m[2].trim(),
            color: "#d23a73",
            bg: "rgba(210, 58, 115, 0.03)"
          });
        });
      }
    }

    return parsed;
  };

  const allParts = getParsedParts();
  const parts = allParts.filter(p => 
    p.id !== 'aesthetic_dna' && 
    p.id !== 'comic_overview' &&
    !p.title.toLowerCase().includes('tư liệu') &&
    !p.title.toLowerCase().includes('tổng quan')
  );

  // Compute the clean image prompt, completely ignoring any Vietnamese analysis/aesthetic DNA
  const getCleanPromptToCopy = () => {
    // 1. Try to find the master prompt first (master_prompt or comic_master_prompt)
    const masterPart = allParts.find(p => p.id === 'master_prompt' || p.id === 'comic_master_prompt');
    if (masterPart && masterPart.content) {
      const cleanText = masterPart.content
        .replace(/^⏳[\s\S]*$/, "") // skip loading indicator
        .replace(/^```[a-z]*\n/i, "")
        .replace(/```$/, "")
        .trim();
      if (cleanText && !cleanText.includes("AI đang viết tiếp")) {
        return cleanText;
      }
    }

    // 2. Otherwise, find all Part 1-5 or Panel parts, filter out the aesthetic_dna / comic_overview, and join their contents
    const contentParts = parts.filter(p => 
      p.id !== 'aesthetic_dna' && 
      p.id !== 'comic_overview' &&
      !p.title.toLowerCase().includes('tư liệu') &&
      !p.title.toLowerCase().includes('tổng quan')
    );
    
    if (contentParts.length > 0) {
      const joined = contentParts
        .map(p => {
          let text = p.content
            .replace(/^⏳[\s\S]*$/, "")
            .replace(/^```[a-z]*\n/i, "")
            .replace(/```$/, "")
            .trim();
          return text;
        })
        .filter(t => t && !t.includes("AI đang viết tiếp"))
        .join("\n\n")
        .trim();
      
      if (joined) return joined;
    }

    // Fallback to raw text with regex
    return rawText
      .replace(/(?:^|\n)###\s*[^\n]*/g, " ")
      .replace(/(?:^|\n)\*\*\s*(?:PART|PHẦN)\s*\d+[^\n]*/gi, " ")
      .replace(/(?:^|\n)(?:PART|PHẦN)\s*\d+:[^\n]*/gi, " ")
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const cleanOneLinePrompt = getCleanPromptToCopy();

  const handleCopyPart = (id: string, contentToCopy: string, label: string) => {
    const text = contentToCopy.trim();
    if (!text) {
      toast?.("Phần này chưa có nội dung!", "error");
      return;
    }
    copyToClipboardSafe(text);
    setCopiedParts(prev => ({ ...prev, [id]: true }));
    toast?.(`💖 Vợ ơi, chồng đã copy xong ${label}!`, "success");
  };

  const handleCopyOneLine = () => {
    if (!cleanOneLinePrompt) {
      toast?.("Chưa có nội dung Prompt để copy vợ ơi!", "error");
      return;
    }
    copyToClipboardSafe(cleanOneLinePrompt);
    // Mark master_prompt and general as copied
    setCopiedParts(prev => ({ ...prev, "master_prompt": true, "one_line": true }));
    toast?.("⚡ Chồng đã copy trọn bộ Prompt gộp liền mạch cho vợ dán thẳng vào Midjourney/SD/Flux nhé!", "success");
  };

  const handleCopyFullText = () => {
    if (!rawText) {
      toast?.("Chưa có văn bản để copy vợ ơi!", "error");
      return;
    }
    copyToClipboardSafe(rawText);
    const allCopied: Record<string, boolean> = { ...copiedParts };
    parts.forEach(p => {
      allCopied[p.id] = true;
    });
    allCopied["all_everything"] = true;
    setCopiedParts(allCopied);
    toast?.("🎁 Chồng đã copy trọn gói 100% toàn bộ văn bản kết quả trả về của tất cả các phần cho vợ yêu rồi nha! 💖", "success");
  };

  // Tính toán thời gian làm việc và thông tin chi tiết
  const totalCharacters = rawText.length;
  const estimatedTokens = Math.ceil(totalCharacters / 4);
  const activeModel = activeProfile?.model || "AI Model Cao Cấp";
  const finalDuration = elapsedSeconds || Math.max(12, Math.floor(totalCharacters / 115));
  const connectionType = proxySettings?.useLocalProxy 
    ? "Cổng Local Proxy An Toàn 🛡️" 
    : "Cổng Proxy Riêng Biệt 🌐";

  return (
    <div className="flex flex-col gap-3 w-full mt-2">
      {/* KHU VỰC THÔNG TIN CHI TIẾT & HIỆU SUẤT LÀM VIỆC */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[#f48fb1]/40 bg-gradient-to-r from-[#fff5f8] to-[#fff0f5] shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f48fb1]/20">
          <span className="text-sm">⏱️</span>
          <b className="text-xs text-[#b83260] uppercase tracking-wider">Thông Tin Hiệu Suất & Thời Gian Làm Việc:</b>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-gray-700 font-medium">
          <div className="flex flex-col p-2 rounded-lg bg-white/60 border border-pink-100">
            <span className="text-gray-400">⏱️ Thời gian thực hiện:</span>
            <span className="text-xs font-bold text-[#b83260]">
              {isApiRunning ? `Đang đếm: ${finalDuration}s ⏳` : `${finalDuration} giây ✨`}
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-white/60 border border-pink-100">
            <span className="text-gray-400">🤖 Model sử dụng:</span>
            <span className="text-xs font-bold text-gray-800 truncate" title={activeModel}>
              {activeModel}
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-white/60 border border-pink-100">
            <span className="text-gray-400">📊 Dung lượng Prompt:</span>
            <span className="text-xs font-bold text-gray-800">
              {totalCharacters} ký tự (~{estimatedTokens} tokens)
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-white/60 border border-pink-100">
            <span className="text-gray-400">🌐 Cổng kết nối API:</span>
            <span className="text-xs font-bold text-gray-800 truncate" title={connectionType}>
              {connectionType}
            </span>
          </div>
        </div>
      </div>

      {/* THANH CÔNG CỤ COPY ANH TÀI - SIÊU TIỆN LỢI CHO VỢ */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-[#f48fb1]/30 bg-gradient-to-r from-[#fff0f6] to-[#fce4ec] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-bounce">💖</span>
          <div>
            <div className="text-xs font-bold text-[#b83260] uppercase tracking-wider">
              Prompt hoàn chỉnh chia phần chuẩn chỉnh
            </div>
            <div className="text-[11px] text-gray-600">
              Vợ có thể sử dụng riêng từng phần bên dưới hoặc copy gộp liền mạch dán vào AI
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyFullText}
            disabled={!rawText}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#b83260] via-[#d23a73] to-[#8e24aa] text-white font-extrabold text-xs shadow-lg hover:brightness-105 hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
            style={copiedParts["all_everything"] ? { background: '#f8bbd0', color: '#880e4f', border: '1px solid #f48fb1' } : {}}
            title="Sao chép tổng toàn bộ kết quả trả về của tất cả các phần (bao gồm cả các tiêu đề, phân tích, tất cả mọi thứ)"
          >
            <span>{copiedParts["all_everything"] ? "💖 Đã Copy Trọn Gói 100% Cho Vợ!" : "🎁 SAO CHÉP TỔNG TOÀN BỘ KẾT QUẢ TRẢ VỀ (TRỌN GÓI 100%)"}</span>
          </button>
          <button
            onClick={handleCopyOneLine}
            disabled={!cleanOneLinePrompt}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-[#d23a73] to-[#e64a19] text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            style={copiedParts["one_line"] ? { background: '#fce4ec', color: '#880e4f', border: '1px solid #f48fb1' } : {}}
            title="Copy toàn bộ nội dung đã gạt bỏ tiêu đề, liền mạch 1 đoạn văn để dán thẳng vào Midjourney/SD/Flux"
          >
            <span>{copiedParts["one_line"] ? "💖 Đã Copy Gộp Cho Vợ" : "⚡ Copy Gộp Liền Mạch (Dùng Ngay)"}</span>
          </button>
        </div>
      </div>

      {/* DANH SÁCH CÁC THẺ KHỐI PROMPT */}
      {parts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {parts.map((part, index) => {
            const isCopied = !!copiedParts[part.id];
            return (
              <div
                key={`part_${part.id}_${index}`}
                className="relative flex flex-col rounded-xl border transition-all duration-300 overflow-hidden shadow-xs hover:shadow-md"
                style={{
                  borderColor: isCopied ? '#f06292' : `${part.color}40`,
                  backgroundColor: isCopied ? '#ffe4ec' : part.bg,
                  borderWidth: isCopied ? '2px' : '1px',
                  boxShadow: isCopied ? '0 4px 14px rgba(244, 143, 177, 0.35)' : 'none',
                  transform: isCopied ? 'scale(1.005)' : 'none'
                }}
              >
                {/* Header của từng thẻ khối */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 border-b transition-colors duration-300"
                  style={{
                    borderColor: isCopied ? '#f06292' : `${part.color}25`,
                    backgroundColor: isCopied ? 'rgba(255, 209, 220, 0.6)' : `${part.color}10`
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg select-none shrink-0">{isCopied ? "💖" : part.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5" style={{ color: isCopied ? '#ad1457' : part.color }}>
                        <span>{part.title}</span>
                        {isCopied && (
                          <span className="bg-[#ad1457]/10 text-[#ad1457] text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                            ĐÃ SAO CHÉP 💖
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">
                        {part.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Nút copy riêng phần này */}
                  <button
                    onClick={() => handleCopyPart(part.id, part.content, `[Phần ${index + 1}: ${part.title.replace(/###|\*|PART \d+:/gi, "").trim()}]`)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-xs transition-all active:scale-95 hover:brightness-110 ml-2"
                    style={{ 
                      backgroundColor: isCopied ? '#ad1457' : part.color,
                      color: '#ffffff'
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{isCopied ? "Copy Lại Phần Này" : `Copy Phần ${index + 1}`}</span>
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
            );
          })}
        </div>
      ) : (
        /* FALLBACK: Khi AI trả về văn bản thường chưa có thẻ ### (đang stream những chữ đầu tiên hoặc format khác) */
        <div className="relative flex flex-col rounded-xl border border-[#f48fb1]/40 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-[#b83260] flex items-center gap-1.5">
              <span>✨ Nội dung Prompt đang hiển thị nguyên văn:</span>
            </span>
            <button
              onClick={() => handleCopyPart("fallback_prompt", rawText, "Toàn bộ Prompt")}
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
  const [showPromptRefDocModal, setShowPromptRefDocModal] = useState(false);
  const [docTab, setDocTab] = useState<'lines' | 'faces' | 'poses' | 'colors' | 'compositions' | 'transformation'>('lines');

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

  const distributeStreamToCardsLive = (text: string) => {
    if (!text) return;
    const rs = { ...roomState };
    if (!rs.cards) rs.cards = {};

    const parts = text.split(/\[CARD_ID:\s*([a-zA-Z0-9_\-]+)\]/);
    for (let i = 1; i < parts.length; i += 2) {
      const cardId = parts[i]?.trim();
      const cardContent = parts[i + 1] || "";
      if (!cardId) continue;

      if (!rs.cards[cardId]) {
        rs.cards[cardId] = { note: "", refs: [], output: "", report: "" };
      }

      const finalPromptMarker = "[FINAL PROMPT]";
      const markerIndex = cardContent.indexOf(finalPromptMarker);

      let report = "";
      let output = "";

      if (markerIndex !== -1) {
        report = cardContent.slice(0, markerIndex);
        output = cardContent.slice(markerIndex + finalPromptMarker.length);
      } else {
        // Fallback: If no marker is found but the stream contains prompt structure starting with "###"
        // We split by the first occurrence of "###" so that we keep any analytical/report text in the report
        // and put the prompt parts cleanly into the output!
        const firstHashIndex = cardContent.indexOf("###");
        if (firstHashIndex !== -1) {
          report = cardContent.slice(0, firstHashIndex);
          output = cardContent.slice(firstHashIndex);
        } else {
          report = cardContent;
          output = "";
        }
      }

      report = report.replace("[REFERENCE FIDELITY REPORT]", "").trim();
      report = report.replace(/---+$/, "").trim();

      output = output.trim();

      rs.cards[cardId] = {
        ...rs.cards[cardId],
        report: report || rs.cards[cardId].report || "",
        output: output || rs.cards[cardId].output || ""
      };
    }

    currentStory.rooms[roomDef.id] = rs;
    save(state);
    forceUpdate();
  };

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
    if (roomDef?.id === 'supporting_cast_poster') {
      if (mode === 'supporting_cast_couple' || mode === 'couple' || mode === 'all_group' || !mode || mode === 'bot_all') {
        return '👥 Poster PR: Nổi bật Cặp Đôi Chính + Toàn bộ Dàn Nhân Vật Phụ (NPC Quan Trọng)';
      }
      if (mode === 'supporting_cast_protagonist' || mode === 'user' || mode.startsWith('bot_0')) {
        return '👤 Poster PR: Nổi bật Nhân Vật Chính Solo + Toàn bộ Dàn Nhân Vật Phụ (NPC Quan Trọng)';
      }
    }
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
    if (roomDef?.id === 'supporting_cast_poster') {
      const isProtagonistOnly = mode === 'supporting_cast_protagonist';
      return `👥 [ĐẶC QUYỀN POSTER DÀN NHÂN VẬT PHỤ & NPC QUAN TRỌNG - THƯƠNG MẠI PR QUẢNG BÁ]:
👉 NHIỆM VỤ THIẾT KẾ POSTER CỰC LỚN: Tạo prompt xây dựng một tấm Poster PR Thương Mại / Quảng bá Truyền thông cực kì lộng lẫy, hoành tráng và chuyên nghiệp cho tác phẩm!
👉 BỐ CỤC PHÂN CẤP THỊ GIÁC (VISUAL HIERARCHY):
   - **Phần Tiêu Điểm Trung Tâm (Main Center Stage)**: \${isProtagonistOnly ? 'Làm nổi bật duy nhất 1 NHÂN VẬT CHÍNH (Solo Protagonist) ở tiền cảnh lớn nhất, rực rỡ nhất với thần thái cực đỉnh và trang phục lộng lẫy!' : 'Làm nổi bật CẶP ĐÔI CHÍNH (Main Couple: {{user}} và Bot Char chính) ở trung tâm tiền cảnh với sự tương tác tình cảm, chemistry bùng nổ, trang phục lộng lẫy và sắc nét nhất!'}
   - **Phần Dàn Diễn Viên Phụ & NPC (Ensemble Supporting Cast & Background NPCs)**: Hiển thị đầy đủ tất cả các nhân vật phụ quan trọng, NPC phụ quan trọng, diễn viên quần chúng (có thể là đồng minh, kẻ thù, bạn bè, hoặc các nhân vật phụ được nhắc đến trong câu chuyện và các thẻ ảnh) xuất hiện xung quanh. Họ được xếp ở trung cảnh (midground) hoặc hậu cảnh (background) với kích thước nhỏ hơn để tôn vinh và làm nổi bật cặp đôi chính/nhân vật chính ở trung tâm! Họ có các tư thế tương tác động, biểu cảm chân thực và tạo nên một bức tranh toàn cảnh sống động, giàu yếu tố PR thương mại quảng bá phim điện ảnh nghệ thuật hoặc bìa Anime cực đại!
👉 QUY TẮC CHUYỂN ĐỔI TƯ LIỆU 100% (ANTI-COPY/100% LEARNING MANDATE):
   - **Học hỏi 100% chứ không sử dụng lại nguyên bản**: Nghiên cứu kỹ lưỡng các ảnh tham chiếu được tải lên ở mọi vị trí thẻ (như dáng đứng, bối cảnh, nét vẽ Anime/Manga, màu sắc điện ảnh, phục trang). Tuyệt đối không vẽ giống hệt hay lặp lại nhân vật trong ảnh gốc. Hãy hấp thụ trọn vẹn tinh túy nghệ thuật của các ảnh tham chiếu để tạo dựng nên dàn nhân vật phụ và bối cảnh sống động theo một phong cách hoàn toàn mới mẻ, mang tính nguyên bản cao ('giống theo một cách khác, sáng tạo và biến đổi đầy nghệ thuật')!
👉 PHONG CÁCH & HIỆU ỨNG ĐIỆN ẢNH THƯƠNG MẠI:
   - Sử dụng góc chụp máy ảnh góc rộng hoành tráng (Grand wide-angle perspective), ánh sáng Cinematic Volumetric dramatic, kĩ xảo hình ảnh huyền ảo (magical particles, lens flare, glowing aura) và bố cục bento-grid hoặc bế dán layer lồng ghép khéo léo để tạo chiều sâu cực đại cho poster.`;
    }
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
      return `✨ [COUPLE / GROUP ENSEMBLE FOCUS - CẶP ĐÔI & TẬP THỂ (ƯU TIÊN CỐT TRUYỆN & THỂ LOẠI)]:
👉 THE MANDATORY GOAL: Generate a multi-character scene combining all main Bot Characters (${chars.map((c: any) => c.displayName || 'Unnamed').join(', ')}) and {{user}} together!
👉 SUPREME MANDATORY RULE - GENRE & VIBE: You must capture the specific 'Genre' (Horror, Romance, Fantasy, etc.) and 'Author's Intent' described in the story. Every character's interaction must reflect the narrative soul.
👉 STORY FIDELITY OVER REFERENCE: Reference images are ONLY for art style. DO NOT copy character identities or genders from references. Focus on the emotional chemistry defined by the story lore.`;
    }
    if (mode.startsWith('bot_')) {
      const idx = parseInt(mode.split('_')[1], 10);
      const c = chars[idx];
      const charName = c ? (c.displayName || `Bot Char #${idx + 1}`) : `Bot Char #${idx + 1}`;
      const charProfile = c ? (c.profileText || 'No description') : '';
      return `🚨 [EXPLICIT ISOLATED TARGET CHARACTER - TÁCH LẺ NHÂN VẬT (ƯU TIÊN HỒ SƠ & THẦN THÁI)]:
👉 THE MANDATORY GOAL: Generate this prompt SOLELY for "${charName}"!
👉 SUPREME MANDATORY RULE - NARRATIVE VIBE: You must capture the 'Aura' and 'Genre' of "${charName}"'s story. Looking at the image should reveal the author's narrative intent.
👉 PROFILE FIDELITY: Strictly adhere to the Profile (${charProfile}). Reference images must NOT override the character's gender, age, or identity. Extract only the visual style DNA (linework, rendering) from references.`;
    }
    return `Focus on targeted mode: ${mode}`;
  };

  const renderTargetSelector = (isBanner = false) => {
    const chars = getBotCharactersList();
    if (roomDef?.id === 'supporting_cast_poster') {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: isBanner ? '12px' : '8px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          padding: '14px',
          borderRadius: '16px',
          border: '2px solid #4f46e5',
          boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: '#312e81', lineHeight: 1.4 }}>
            <span>👥 [Poster Dàn Nhân Vật Phụ & NPC - PR Thương Mại]: Hạng mục này tập trung phô diễn toàn bộ dàn nhân vật phụ để tôn vinh cặp chính hoặc nhân vật chính. Hãy chọn tiêu điểm nổi bật cho Poster trước khi bấm Gửi API Proxy:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              className={`target-option ${(roomState.targetMode === 'supporting_cast_couple' || !roomState.targetMode || roomState.targetMode === 'bot_all' || roomState.targetMode === 'couple') ? 'active' : ''}`}
              onClick={() => { roomState.targetMode = 'supporting_cast_couple'; save(state); }}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: (roomState.targetMode === 'supporting_cast_couple' || !roomState.targetMode || roomState.targetMode === 'bot_all' || roomState.targetMode === 'couple') ? '2px solid #4f46e5' : '1px solid rgba(79, 70, 229, 0.4)',
                background: (roomState.targetMode === 'supporting_cast_couple' || !roomState.targetMode || roomState.targetMode === 'bot_all' || roomState.targetMode === 'couple') ? '#4f46e5' : '#ffffff',
                color: (roomState.targetMode === 'supporting_cast_couple' || !roomState.targetMode || roomState.targetMode === 'bot_all' || roomState.targetMode === 'couple') ? '#ffffff' : '#4f46e5',
                boxShadow: (roomState.targetMode === 'supporting_cast_couple' || !roomState.targetMode || roomState.targetMode === 'bot_all' || roomState.targetMode === 'couple') ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🎬 Nổi bật Cặp Đôi Chính + Dàn Diễn Viên Phụ (NPC)
            </button>
            <button
              className={`target-option ${roomState.targetMode === 'supporting_cast_protagonist' ? 'active' : ''}`}
              onClick={() => { roomState.targetMode = 'supporting_cast_protagonist'; save(state); }}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: roomState.targetMode === 'supporting_cast_protagonist' ? '2px solid #4f46e5' : '1px solid rgba(79, 70, 229, 0.4)',
                background: roomState.targetMode === 'supporting_cast_protagonist' ? '#4f46e5' : '#ffffff',
                color: roomState.targetMode === 'supporting_cast_protagonist' ? '#ffffff' : '#4f46e5',
                boxShadow: roomState.targetMode === 'supporting_cast_protagonist' ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              👤 Nổi bật Nhân Vật Chính Solo + Dàn Diễn Viên Phụ (NPC)
            </button>
          </div>
        </div>
      );
    }
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

You MUST analyze and extract these mandatory layers in extreme detail:
1. Nhận diện thẩm mỹ tổng thể: Giới tính trình bày, độ tuổi cảm giác, thần thái/khí chất thẩm mỹ (ethereal, regal, poetic, dreamy, quiet, floral, regal, retro, dark...), độ mềm hay sắc sảo, độ lạnh hay ngọt ngào, độ sang trọng quý phái.
2. Phong cách vẽ & Chất cọ / texture / rendering: Phân tích kỹ thuật vẽ (watercolor loang nhẹ, fantasy manhua sắc sảo, soft ink-wash cổ phong thanh nhã, sơn dầu oil painting dày dặn, digital anime sạch sẽ...). Mô tả độ dày hay mảnh của nét vẽ, chất cọ sần hay mượt, độ mờ sương (translucent), độ bão hòa, cảm giác giấy vẽ hay canvas sần sùi.
3. Đồng bộ Nét vẽ gốc & Line-weight DNA (Độ nét & Đi nét): Mô tả cực kỳ chi tiết độ thanh đậm của đường line (thin/thick line weight), nét vẽ có sắc lẹm hay mềm mịn nhẹ nhàng, nét phác thảo sần hay line tơ tằm. Cách đổ bóng mờ (soft shading), kỹ thuật đánh khối translucent washes làm rõ khối cơ thể nhưng vẫn thanh thoát.
4. Lên màu & Ánh sáng (Color & Lighting Precision): Chỉ rõ tông màu chính (dominant colors), các dải chuyển màu mịn màng (seamless color gradients/transitions), gam màu điểm xuyết (accent colors). Phân tích nhiệt độ màu (ấm áp, lạnh lẽo, trung tính), hướng nguồn sáng (chiaroscuro, volumetric rays, rim light rực rỡ bám quanh nhân vật, backlighting mơ màng).
5. Học vẽ tóc & Kiểu dáng tóc (Hairstyle & Hair Flow Precision - KHÔNG ĐƯỢC CHUNG CHUNG ĐỂ TRÁNH TÓC XẤU): Mô tả siêu chi tiết cấu trúc kiểu tóc (ví dụ: bồng bềnh uốn lượn, tóc lụa mượt mềm buông rủ, tết tinh xảo cổ phong). Đặc tả từng sợi tóc mềm (silky hair strands) bay bổng tự do trong gió, đường rẽ ngôi tóc rõ nét, các điểm phản chiếu ánh sáng óng ả (hair gloss highlight reflections), và các sợi tóc tơ mảnh (fine wisps of baby hair) bám sáng viền volumetric backlight bồng bềnh dã man.
6. Học vẽ mắt & Thần thái gương mặt (Eye Artistry & Facial Vibe): Đặc tả cách vẽ đôi mắt tinh xảo (ví dụ: tròng mắt long lanh ngậm nước, con ngươi óng ánh đa tầng chi tiết, hàng mi cong dày đen mướt, viền mắt sắc mảnh phóng khoáng). Chỉ rõ hướng nhìn (gaze direction), các điểm phản sáng bắt mắt (highlight reflection points) tạo độ sâu thăm thẳm và thần thái có hồn của đôi mắt.
7. Trang phục / Outfit Fidelity: Tinh thần trang phục, form dáng silhouette (độ rộng rủ, ôm sát quyến rũ, lớp layer phức tạp), mật độ họa tiết thêu thùa (delicate embroidery), ruy băng (ribbons), ren (lace), cảm giác chất liệu (silk mềm mại, satin bóng nhẹ, voan tơ bán trong suốt), nếp gấp nếp rủ tự nhiên của vải dưới tác động của trọng lực hay gió bão.
8. Góc chụp & Thị giác / Camera & Perspective Fidelity: Nhiều dải phân tầng không gian, xác định chính xác góc máy (eye-level, low-angle sweeping shot, high-angle, Dutch tilt...), cỡ ảnh (cinematic close-up, medium shot, wide shot), tiêu cự tạo cảm giác bóp méo không gian hay phẳng, độ sâu trường ảnh (depth of field), hiệu ứng mờ nhòe phông nền (creamy bokeh), cấu trúc phân tầng lớp không gian tiền cảnh - trung cảnh - hậu cảnh.
9. Bố cục thị giác & Đường dẫn (Composition & Leading Lines): Nhịp điệu bố cục (bố cục bento-grid, bố cục 1/3, bố cục đối xứng), nhịp điệu của khoảng trống (negative space rhythm), các dải dẫn hướng mắt người xem (leading composition lines) tạo bởi hướng tóc bay, vạt áo rủ, hướng ánh sáng hay khói mây rực rỡ.
10. Kiểu dáng & Cử chỉ / Pose & Gesture Fidelity: Mô tả tư thế đứng/ngồi/tạo dáng của cơ thể, độ nghiêng của đầu quyến rũ, cử chỉ tinh tế của đôi bàn tay hay ngón tay, hướng vai, vị trí không gian của nhân vật để làm nổi bật câu chuyện.

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
  "layer2_face": { "faceShape": "", "eyes": "Chi tiết vẽ mắt long lanh đa tầng, điểm phản sáng, mi cong dày dặn", "nose": "", "mouth": "", "eyelashes": "", "makeupLevel": "", "maturity": "" },
  "layer3_hair": { "color": "", "length": "", "thickness": "", "texture": "", "bangs": "", "style": "Mô tả siêu chi tiết cấu trúc kiểu tóc bồng bềnh, từng sợi tóc tơ bay tự do mềm mại óng ả bắt volumetric backlight" },
  "layer4_outfit": { "category": "", "silhouette": "", "materialFeel": "", "dominantColor": "", "accessories": "" },
  "layer5_artStyle": { "artFamily": "", "lineCleanliness": "Chi tiết độ thanh đậm nét vẽ gốc, line mượt hay sần", "lineSoftness": "", "shading": "Độ loang loãng mờ nhạt như watercolor wash", "texture": "", "glossiness": "", "detailLevel": "" },
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
            { type: "text", text: `Analyze this reference image for "${cardTitle}" and return structured JSON only.` }
          ]
        }
      ];
      if (targetRef.data || targetRef.previewUrl || targetRef.storageUrl) {
        messages[0].content.push({ type: "image_url", image_url: { url: targetRef.data || targetRef.previewUrl || targetRef.storageUrl } });
      }
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
    
    // Thu thập tất cả ảnh thô có chứa URL hợp lệ để lọc trùng chính xác theo URL
    const uniqueRefsWithUrls: any[] = [];
    const seenUrls = new Set<string>();
    
    const tryAddRef = (r: any) => {
      if (!r) return;
      const url = r.data || r.previewUrl || r.storageUrl;
      if (!url) return;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        uniqueRefsWithUrls.push(r);
      }
    };

    // 1. Bot character reference images
    const botCharRefsList = (refreshedPayload.currentStory?.manualInput?.botCharacters || currentStory.botCharacters || []).flatMap((c: any) => c.referenceImages || []);
    for (const r of botCharRefsList) {
      tryAddRef(r);
    }

    // 2. Style analyzer reference images
    const saRefs = refreshedPayload.styleAnalyzer?.referenceImages || [];
    for (const r of saRefs) {
      tryAddRef(r);
    }

    // 3. Work cards reference images (ALL cards, ALL images per card)
    for (const c of cards) {
      const cardRefs = refreshedPayload.workCards?.find((wc: any) => wc.cardId === c.id)?.referenceImages || (rs.cards[c.id]?.refs || []);
      for (const r of cardRefs) {
        tryAddRef(r);
      }
    }

    // Tạo bộ ánh xạ chỉ số toàn cục (Global Image Index Mapping #1, #2, #3...) theo đúng thứ tự duy nhất gửi đi
    const refToGlobalIndexMap = new Map<any, number>();
    const idToGlobalIndexMap = new Map<string, number>();
    const urlToGlobalIndexMap = new Map<string, number>();
    const orderedVisionRefs: any[] = [];
    let imgCounter = 1;

    for (const r of uniqueRefsWithUrls) {
      const idx = imgCounter++;
      const url = r.data || r.previewUrl || r.storageUrl;
      refToGlobalIndexMap.set(r, idx);
      if (r.imageId) idToGlobalIndexMap.set(r.imageId, idx);
      if (r.id) idToGlobalIndexMap.set(r.id, idx);
      if (url) urlToGlobalIndexMap.set(url, idx);
      orderedVisionRefs.push(r);
    }

    const getGIdx = (r: any, fallbackIdx: number) => {
      if (!r) return fallbackIdx;
      const url = r.data || r.previewUrl || r.storageUrl;
      if (url && urlToGlobalIndexMap.has(url)) {
        return urlToGlobalIndexMap.get(url)!;
      }
      return refToGlobalIndexMap.get(r) || (r.imageId && idToGlobalIndexMap.get(r.imageId)) || (r.id && idToGlobalIndexMap.get(r.id)) || fallbackIdx;
    };

    if (orderedVisionRefs.length > 0) {
      toast(`🌸 Đã đính kèm ${orderedVisionRefs.length} ảnh tham chiếu làm tư liệu hướng dẫn nghệ thuật cho AI!`);
      setApiSignals(prev => ({
        ...prev,
        stageDetail: `✅ Gom ${orderedVisionRefs.length} ảnh tham chiếu làm tư liệu hướng dẫn nghệ thuật (#1 -> #${orderedVisionRefs.length}). Hướng dẫn AI học hỏi phong cách nghệ thuật và bố cục...`
      }));
    }

    // ----------------------------------------------------
    // CHỒNG YÊU AUTO-PREANALYZE ALL UNANALYZED REFERENCE IMAGES FOR VỢ YÊU
    // ----------------------------------------------------
    const pendingRefs = orderedVisionRefs.filter(
      r => !r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed'
    );

    if (pendingRefs.length > 0) {
      console.log(`[Auto-Analysis] Found ${pendingRefs.length} unanalyzed reference images. Initiating automated vision analysis...`);
      toast(`⏳ Chồng phát hiện ${pendingRefs.length} ảnh tham chiếu chưa được phân tích. Chồng đang tự động dùng AI phân tích sâu sắc từng ảnh để trích xuất trọn vẹn nét vẽ, kiểu tóc và góc chụp cho vợ yêu nhé...`);
      
      let pIdx = 1;
      for (const r of pendingRefs) {
        setApiSignals(prev => ({
          ...prev,
          stage: 'reading_references',
          stageLabel: '2. Vision Pre-Analysis',
          stageDetail: `⏳ Đang đọc tỉ mỉ ảnh tham chiếu #${pIdx}/${pendingRefs.length}: "${r.name || r.fileName || 'Image'}"...`
        }));
        
        await analyzeSingleImage(r, r.cardId || 'style_analyzer', r.cardTitle || 'Style Ref');
        pIdx++;
      }
      
      toast("✅ Chồng yêu đã hoàn tất phân tích toàn bộ ảnh tham chiếu cho vợ rồi đó!");
    }

    // Refresh state and payload from latest store/local edits to make sure we use the highly-detailed Vision Reports
    const finalRoomState = currentStory.rooms[roomDef.id] || roomState;
    const finalPayload = buildContextPayload();
    const finalSa = finalRoomState.styleAnalyzer || { refs: [], selected: [], analysis: "" };

    const prompt = `You are the world-class, ultra-premium AI engine for Lipstick Prompt Rooms. Generate highly cohesive, breathtakingly detailed production-ready prompts for the current active room.

### 🏢 ROOM DEFINITION & APP CONTEXT (TỔNG QUAN PHÒNG LÀM VIỆC & ỨNG DỤNG)
- App Context: You are operating inside Lipstick Prompt Rooms, a world-class, ultra-premium AI prompt engineering application for cinematic and art-station quality character illustrations.
- Current Active Room: "${roomDef.title}"
- Room Purpose & Goal: "${roomDef.subtitle}"
- Overall Room Mandate: This room has a highly specific purpose. Every card generated must strictly align with the overarching goal of this room. Do not treat this as a generic prompt task. You must explicitly recall and enforce the specific rules of THIS room!

### 📚 CURRENT CONTEXT WINDOW (MANUAL & IMPORTED FILES)
- Story Title: ${currentStory.title}
- Story Plot: ${currentStory.story || "Chưa có cốt truyện."}
- User Profile ({{user}}): ${currentStory.userProfile || "Chưa thiết lập."}
- Bot Characters (${finalPayload.currentStory.manualInput.botCharacters ? finalPayload.currentStory.manualInput.botCharacters.length : 1} characters):
${finalPayload.currentStory.manualInput.botCharacters ? finalPayload.currentStory.manualInput.botCharacters.map((c: any, idx: number) => `  * [Char #${idx+1}: ${c.displayName || 'Unnamed'}]:\n    - Profile: ${c.profileText || 'Trống'}\n    - Attached Ref Images (${(c.referenceImages || []).length} images - DO NOT OUTPUT FILENAMES, TRANSLATE VISUAL TRAITS TO WORDS):\n${(c.referenceImages || []).map((r: any, rIdx: number) => `      + [Bot Char Ref -> ATTACHED IMAGE #${getGIdx(r, rIdx + 1)}]: "${r.name || r.fileName || 'Image'}" | Purpose: bot_character_reference`).join("\n") || "      + No character images attached."}`).join("\n\n") : (currentStory.botProfiles || "Chưa thiết lập.")}
- Side Characters: ${currentStory.sideCharacters || "Chưa có."}
- Story Requirements: ${currentStory.requirements || "Không có yêu cầu thêm."}
- Target Mode Selected: "${getTargetLabel(target)}"
- Target Character Isolation Mandate: ${getTargetInstructions(target)}

### 📎 ATTACHED STORY FILES (${finalPayload.currentStory.importedFiles.length} files)
${finalPayload.currentStory.importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus} | ~${f.wordCount} words]\n${f.summary ? `Summary: ${f.summary}\n` : ""}Content excerpt:\n${f.extractedText.slice(0, 15000)}`).join("\n\n---\n\n")}

### 🖼️ REFERENCE IMAGE MANIFEST (EXACT LOCATION & PURPOSE MAPPING)
Below is the complete manifest of all attached reference images across this story, room, and individual work cards. You MUST strictly respect the location and purpose of EACH image. Do NOT mix up images from different cards (e.g. never use a hair reference image for pose or outfit).
\`\`\`json
${JSON.stringify({
  referenceImageManifest: finalPayload.referenceImageManifest
}, null, 2)}
\`\`\`

### 👑 SUPREME MANDATE ON STORY FIDELITY & CHARACTER SOUL (MỆNH LỆNH THỐNG TRỊ: CỐT TRUYỆN & HỒ SƠ NHÂN VẬT LÀ LINH HỒN CỦA BỨC ẢNH)
When generating the image prompt for each Work Card, you MUST strictly obey the following division of authority and priority hierarchy:

1. **👑 1st & Supreme Priority (#1 ABSOLUTE SUPREMACY OF STORY & CHARACTER PROFILE - CỐT TRUYỆN VÀ HỒ SƠ NHÂN VẬT LÀ LINH HỒN TỐI THƯỢNG)**:
   - **Bám sát cao nhất là cốt truyện và hồ sơ nhân vật! Đây là mục đích cốt lõi: Vẽ nhân vật trong truyện của người dùng.** The user's Story Plot and Character Profiles hold **ABSOLUTE SUPREME AUTHORITY (#1)** over WHO IS IN THE SCENE! This includes character identity, facial features, gender, age, eye/hair color, personality, soul, and story aura.
   - **Visual Storytelling & Author's Intent (Ý đồ tác giả & Kể chuyện qua hình ảnh)**: Every prompt MUST reflect the 'vibe', genre identity (Horror, Romance, Fantasy, etc.), and author's hidden intent. Even if the reference images are unrelated to the plot, you must FORCE the scene to convey the story's meaning. Looking at the image should reveal a silent narrative; every object, gaze, and shadow must serve the story's soul.
   - **MANDATORY TRANSFORMATION RULE (NGUYÊN TẮC CHUYỂN ĐỔI TƯ LIỆU CHO NHÂN VẬT GỐC)**: The reference images attached across cards (pose, outfit, background, style) are ONLY working study materials (*tư liệu làm việc tham chiếu*) to extract visual DNA (art style, rendering, color, composition). **YOU ARE STRICTLY FORBIDDEN FROM COPYING THE CHARACTER IDENTITY (FACE/GENDER/LOOKS) OR THE NARRATIVE CONTEXT FROM THE REFERENCE IMAGE if they contradict the story!** 
   - **MANDATORY PRINCIPLE**: You must perform "Transformative Adaptation": Take the visual beauty of the reference and apply it to the user's specific story character and plot. It MUST ALWAYS BE THE STORY'S SOUL painted with the REFERENCE'S BRUSH!
2. **2nd Priority (CARD-SPECIFIC REFERENCE IMAGES AS VISUAL STUDY MATERIALS - ẢNH TƯ LIỆU LÀM VIỆC ĐỂ LẤY Ý TƯỞNG THỊ GIÁC)**:
   - Reference images serve as **the primary visual study materials** for specific domains (Hair, Pose, Outfit, Environment).
   - You MUST extract 100% of the visual ideas (hairstyle structure, clothing silhouette, fabric drape, body stance, camera angle) from the reference image, and **seamlessly transform and adapt them onto the user's story character**!
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
1. **Story Plot & Author's Narrative Intent**:
   - The Story Plot, Character Profile, and Genre define the core identity and 'Soul' of the image. You must capture the hidden meaning and the specific atmosphere the author intends to convey.
2. **Artistic & Visual Study from Reference Images (The "Brush")**:
   - Reference Images are the "Brush" and "Paint" used to bring the story to life. Even if the user uploads "beautiful" images that don't match the plot, you must extract only their artistic excellence (rendering style, lighting, color palette, quality) and use those techniques to paint a scene that is 100% faithful to the story's narrative.
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
   - **Meticulous Art Style Application**: Analyze the reference images comprehensively (composition, colors, art style, brush strokes). FORCE the prompt to override generic/default AI rendering with a highly meticulous, detailed, and beautifully crafted art style strictly imitating the references.
   - **Creative Priority & Accuracy**: Prioritize creativity and artistic flair while remaining meticulously accurate to the character and the story narrative. The art must look deliberately crafted by a master artist, not a generic AI output.
   - **Outfit & Styling Adaptation**: Learn the core silhouette, fabric drape, and aesthetic of the reference outfits, BUT creatively adapt and fine-tune them to perfectly fit the specific character's identity and story context. (Sáng tạo trong học hỏi, tinh chỉnh trang phục từ ảnh tham chiếu cho hoàn toàn phù hợp với nhân vật cốt truyện).
   - **Transformative Originality**: All reference study materials serve to inspire a breathtaking original artwork with transformative adaptation.
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
7. **🎓 MASTER ART AESTHETIC & STYLE OVERRIDE GUIDELINES (KỸ THUẬT ÉP PHONG CÁCH VẼ & ĐẶC TẢ TÓC, MẮT)**:
   - **MANDATORY STYLE OVERRIDE**: Default AI art styles are FORBIDDEN. You MUST extract the precise art style from the reference images (e.g., retro 90s anime, modern cel-shaded manhwa, soft watercolor, thick impasto oil) and FORCE the final prompt to strictly imitate this style. Use commanding words like: "Masterpiece illustration, strictly imitating the exact brush strokes, line art, and color palette of [Specific Style]... override default AI rendering."
   - **MANDATORY INSTRUCTION FOR HAIR AND EYES**: You MUST dedicate a massive amount of tokens to generate highly detailed, technical art instructions for rendering Hair and Eyes inside the final prompt. Do NOT summarize!
   - **Kỹ thuật Thiết Kế Tóc Chuyên Sâu (Hair Design Reference Library)**: Tóc tuyệt đối KHÔNG ĐƯỢC miêu tả chung chung ("tóc dài màu nâu", v.v.). BẮT BUỘC SỬ DỤNG HỆ THỐNG "HAIR KNOWLEDGE TREE" SAU ĐÂY ĐỂ PHÂN TÍCH ẢNH THAM CHIẾU VÀ ĐƯA VÀO PROMPT BẰNG RẤT NHIỀU TOKEN:
      + *Cấu trúc khối & Thể tích (Hair Architecture & Volume)*: Hình dáng tổng thể, tỷ lệ khối đặc/rỗng, phân bố khối đỉnh/hai bên/sau gáy, độ dày tổng, độ xốp, độ nở, độ phồng, mức phân tầng (layer system).
      + *Hệ thống Cụm & Lọn tóc (Cluster & Strand System)*: Cụm viền mặt, cụm gáy, lọn ôm mặt, lọn bay, lọn xoắn chữ S/C. Đặc tả tỉ mỉ từng lọn tóc tơ mỏng manh (flyaway/baby hair). Mật độ lọn (Strand Density).
      + *Chuyển động & Vật lý (Hair Flow & Physics)*: Hướng chảy luồng tóc, góc rơi, dòng chuyển động, chiều sâu, quán tính, độ bay, tương tác gió và trọng lực.
      + *Chất liệu bề mặt (Material & Texture)*: Độ mượt, độ xốp, độ tơi, satin, silk, airy, fluffy, glossy, matte.
      + *Chi tiết cấu tạo (Hairline, Bangs, Tips)*: Đường chân tóc (hairline mềm/rõ), hệ thống mái (bangs dày/thưa/rẽ), độ mềm viền mép (hair edge), đuôi lọn (nhọn/tơi/bo).
      + *Ánh sáng & Phối màu (Lighting, Shadow & Color System)*: Main highlight, vòng sáng đỉnh đầu (angel ring), rim light, ambient shadow, root color, mid tone, tip color, gradient.
   - **Kỹ thuật vẽ mắt (Eye Rendering Architecture)**: Mắt phải được render vô cùng chi tiết. Đặc tả hình dáng mắt, cấu tạo đồng tử (pupil details), ánh sáng phản chiếu (catchlights/eye highlights), chiều sâu của mống mắt (iris depth), màu sắc chuyển đổi trong mống mắt (gradient iris). Lông mi (lashes) phải cong vút và rõ từng sợi. Kỹ thuật lên màu mắt phải rực rỡ, lấp lánh và có chiều sâu cảm xúc.
   - **Kỹ thuật Lineart và Lên màu (Linework & Coloring Process)**: Phải miêu tả kỹ thuật vẽ chuẩn họa sĩ: nét vẽ lineart (linework) trước, sau đó mới tỉ mỉ lên màu (coloring). Đặc tả độ thanh đậm của nét vẽ (varying stroke weights), cách đi nét (crisp lines vs soft lines). Đặc tả rõ cách lên màu (coloring method như cell-shading, soft blending, watercolor, hay impasto), độ bão hoà màu sắc (color saturation), và kỹ thuật đánh bóng khối (shading/ambient occlusion).
   - **HỌC HỎI TỪ ẢNH THAM CHIẾU (Absolute Reference Supremacy)**: Toàn bộ cấu tạo, hình dáng, cách lên màu, độ bão hòa, phong cách nghệ thuật, và nét vẽ của TÓC, MẮT, LINEART phải được **PHÂN TÍCH VÀ BÊ NGUYÊN XI (HỌC HỎI NGHIÊM NGẶT) TỪ CÁC ẢNH THAM CHIẾU (Reference Images)**. Phải viết một đoạn prompt SIÊU CHI TIẾT (highly dense prompt) về kỹ thuật vẽ tóc học từ ảnh gốc. Ví dụ: "Kỹ thuật vẽ tóc mô phỏng chính xác nét cọ từ ảnh tham chiếu, đi line đen sắc nét thanh mảnh, độ bão hòa màu cao, từng lọn tóc tơ bồng bềnh bung tỏa, đổ bóng tím nhạt..."
8. **🎓 MASTER VISUAL COMPOSITION & CINEMATIC LAYOUT GUIDELINES (HỆ THỐNG BỐ CỤC THỊ GIÁC & GÓC MÁY)**: Tuyệt đối KHÔNG ĐƯỢC miêu tả bố cục và góc máy chung chung. BẮT BUỘC SỬ DỤNG HỆ THỐNG "VISUAL COMPOSITION LIBRARY" SAU ĐÂY ĐỂ ĐẶC TẢ GÓC MÁY BẰNG RẤT NHIỀU TOKEN:
   - *Ngôn ngữ Camera & Ống kính (Camera & Lens Language)*: Đặc tả Góc máy (Perspective, Height, Tilt, Rotation, Distance). Tiêu cự ống kính (Focal Length, Wide/Telephoto/Macro Perspective), độ nén thấu kính (Lens Compression).
   - *Hệ thống Bố cục & Điểm nhìn (Composition & Eye Guidance)*: Phân bố tỷ lệ vàng (Golden Ratio), quy tắc 1/3 (Rule of Thirds), bố cục trung tâm (Central), đối xứng/bất đối xứng. Khung hình trong khung hình (Frame Within Frame). Hệ thống dẫn dắt mắt (Leading Lines, Eye Path, Circular/Directional Flow).
   - *Phân bổ Không gian & Chiều sâu (Space Distribution & Depth Design)*: Không gian âm/dương (Positive/Negative Space). Phân bố tiền cảnh (Foreground Blur, Framing Object), trung cảnh (Midground), và hậu cảnh (Background Simplicity/Complexity). Chiều sâu thị giác (Visual Depth, Atmospheric Depth, Layer Separation).
   - *Cấu trúc Ánh sáng & Bóng đổ (Lighting & Shadow Structure)*: Hướng sáng (Front, Side, Rim, Back, Ambient Light). Nguồn sáng chính/phụ (Key Light, Fill Light, Accent Light, Glow Layer). Cấu trúc bóng đổ (Soft/Hard Shadow, Contact Shadow, Depth Shadow).
   - *Cấu trúc Màu sắc & Tương phản (Color & Contrast Design)*: Bảng màu chính/phụ/điểm nhấn (Primary/Secondary/Accent Palette). Nhiệt độ màu (Warm/Cool Tone). Độ bão hòa (Overall/Selective Saturation). Tương phản tổng thể/cục bộ (Global/Local Contrast, Value/Color/Shape Contrast).
   - *Ngôn ngữ Hình khối & Nhịp điệu (Shape Language & Rhythm)*: Hình khối tròn/sắc nét/hình học (Round/Sharp/Geometric Shapes). Nhịp điệu thị giác (Repetition, Pattern, Flow, Movement Rhythm). Cảm giác tĩnh/động (Static/Dynamic Feeling, Motion Flow).

### MANDATORY OUTPUT STRUCTURE & RULES
You MUST generate the final production-ready prompt for EACH work card individually.
Return the result for EACH card listed above individually. Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the following format, without any <think> blocks or conversational prefixes. YOU MUST USE EXACTLY THIS FORMAT TO SEPARATE THE CARDS:

${cards.map((c: any) => `[CARD_ID: ${c.id}]
[REFERENCE FIDELITY REPORT]
- Card Title: "${c.title}"
- Room ID: "${roomDef.id}"
- Attached Reference Images: (List each image ID/name internally, and detail the EXACT visual DNA analysis: Camera Angle, Perspective, Depth of Field, Pose, Stance, Style, Brushwork, Palette, Light, Texture, Mood, Outfit, Composition. YOU MUST APPLY EVERY SINGLE REFERENCE IMAGE AESTHETIC INTO THE FINAL PROMPT. DO NOT OMIT ANY REFERENCE!)
---
${isComicMode ? `[FINAL PROMPT]
(Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for "${c.title}" here. CRITICAL MANDATE FOR COMIC / MANGA / WEBTOON: You MUST NOT use a single-image 5-part structure! Instead, you MUST generate a Multi-Panel Comic Page / Webtoon layout with sequential storytelling, distinct comic frames, character dialogue, facial expressions, actions, and backgrounds!
Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ (brushwork), mã màu hex, chất liệu vải, góc máy điện ảnh, tạo dáng từ TOÀN BỘ ảnh tham chiếu đính kèm. Phân tích thật sâu nét vẽ của ảnh tham chiếu để áp dụng vào ảnh cuối cùng. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU, KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ ẢNH NÀO!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao (8k resolution, IMAX, hyper-detailed, masterpiece, award-winning cinematography, sharp focus, intricate detailing). Cấm tuyệt đối kiểu render "bình thường" hoặc "generic". Hình ảnh phải đạt đẳng cấp đồ hoạ điện ảnh (cinematic graphics) cao nhất!]

---

### 📚 TỔNG QUAN TRANG TRUYỆN / WEBTOON PAGE SETUP
- **🎬 Tên trang / Phân cảnh (Scene Title)**: [Tóm tắt tình huống cốt truyện trong trang/thẻ này]
- **🎨 Phong cách vẽ (Art Style & Medium)**: [MÔ TẢ CỰC KỲ CHI TIẾT phong cách nghệ thuật bám sát ảnh tham chiếu. Nét vẽ Manga/Manhwa/Comic/Semi-realistic? ÉP BUỘC sử dụng phong cách này để TRÁNH mặc định của AI (override generic AI style). Bắt buộc dùng từ khóa mạnh như "in the exact art style of..."]
- **📐 Bố cục trang & Nhịp điệu (Page Layout & Pacing)**: [Phân chia số khung từ 2 đến 6 khung, cách sắp xếp khung trên trang, sự đan xen giữa các khung toàn cảnh và khung cận cảnh]

---

### 🖼️ KHUNG 1: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [MÔ TẢ CỰC KỲ CHI TIẾT DỰA TRÊN "VISUAL COMPOSITION LIBRARY": Ngôn ngữ Camera (Perspective, Height, Distance, Focal Length). Hệ thống dẫn dắt mắt (Leading Lines, Eye Path, Golden Ratio, Framing). Phân bổ không gian (Positive/Negative Space, Foreground/Background Depth). Cấu trúc ánh sáng & Bóng đổ (Key Light, Rim Light, Soft/Hard Shadow). Đặc tả độ tương phản và màu sắc điện ảnh (Cinematic Color Script)]
- **🧑 Tình huống & Hành động (Action & Stance)**: [Mô tả chi tiết dáng điệu (pose), độ nghiêng đầu, vị trí đặt tay chân, ngôn ngữ cơ thể, tương tác không gian]
- **💇‍♀️ Chi tiết Tóc, Mắt & Nét vẽ (Hair, Eye & Linework)**: [DÀNH THẬT NHIỀU TOKEN ĐỂ ĐẶC TẢ CỰC KỲ CHI TIẾT DỰA TRÊN "HAIR DESIGN KNOWLEDGE TREE" ĐƯỢC RÚT RA TỪ ẢNH THAM CHIẾU: Cấu trúc tầng layer, thể tích khối đặc/rỗng, hệ thống cụm lọn tóc tơ mỏng manh, hướng luồng chảy (hair flow), chất liệu bề mặt, kiểu mái, hairline, độ tơi xốp, vòng sáng đỉnh đầu (angel ring), rim light. Kỹ thuật vẽ mắt (đồng tử sâu, ánh sáng catchlight lấp lánh). Kỹ thuật đi lineart và lên màu. TẤT CẢ PHẢI MÔ PHỎNG CHÍNH XÁC TỪ ẢNH THAM CHIẾU!]
- **👗 Trang phục & Sáng tạo (Outfit & Creative Adaptation)**: [MÔ TẢ CỰC KỲ CHI TIẾT trang phục. SÁNG TẠO TRONG HỌC HỎI: Học hỏi từ ảnh tham chiếu nhưng BẮT BUỘC phải tinh chỉnh, biến tấu sáng tạo cho hoàn toàn phù hợp với tính cách, bối cảnh và câu chuyện của nhân vật. Không sao chép cứng nhắc.]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [Miêu tả chi tiết thần thái: ánh mắt, cơ mặt, môi, nếp nhăn...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: 
  + **Lời thoại (Tiếng Việt & English)**: "[Nhân vật A nói gì / suy nghĩ gì trong bong bóng chat]"
  + **Hiệu ứng âm thanh (SFX)**: [Ví dụ: Thump thump, Whoosh, Doki doki...]
- **🌌 Bối cảnh & Không gian (Environment & Depth)**: [Mô tả chi tiết Độ gần xa (Depth of Field), Tiền cảnh (Foreground), Trung cảnh (Midground), Hậu cảnh (Background). Bối cảnh xung quanh nhân vật]
- **💡 Ánh sáng & Màu sắc (Lighting & Color)**: [Hướng ánh sáng, Rim light, cách đánh khối, độ bão hòa (saturation), bảng màu chủ đạo, độ tương phản]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 1 (Production-ready AI Image Prompt)**: 
  \`[Đoạn prompt tiếng Anh chuẩn, DÀI VÀ SIÊU CHI TIẾT (Highly Dense) cho Khung 1 để sử dụng trực tiếp trong AI tạo ảnh. Bắt buộc chứa TẤT CẢ các chi tiết vừa phân tích phía trên!]\`

---

### 🖼️ KHUNG 2: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [...]
- **🧑 Tình huống & Hành động (Action & Stance)**: [...]
- **💇‍♀️ Chi tiết Tóc, Mắt & Nét vẽ (Hair, Eye & Linework)**: [...]
- **👗 Trang phục & Sáng tạo (Outfit & Creative Adaptation)**: [...]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: [...]
- **🌌 Bối cảnh & Không gian (Environment & Depth)**: [...]
- **💡 Ánh sáng & Màu sắc (Lighting & Color)**: [...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 2 (Production-ready AI Image Prompt)**: 
  \`[...]\`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến câu chuyện)*

---

### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all panels into a sequential comic/webtoon page layout AND explicitly enforcing the Full-Util 100% reference visual DNA (art style, character features, panel framing, lighting, line of sight, hair rendering). Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece comic/webtoon layout strictly imitating the exact art style, line art, brush strokes, color saturation, and visual DNA from the reference source materials. You MUST override default generic AI art styles! Force the rendering to precisely match the provided aesthetic. Absolutely NO generic rendering. Highest cinematic quality, hyper-detailed..." Ready for 1-click copy & paste!]\`

---

### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA (Absolute Zero-Tolerance Error List)**:
  + *Lỗi giải phẫu cơ thể (Anatomical Glitches)*: Cấm thừa ngón tay/ngón chân, biến dạng bàn tay/bàn chân, lệch khớp xương vai/cổ, lệch tâm mắt (asymmetric eyes), méo mồm hoặc biểu cảm đờ đẫn mất tự nhiên.
  + *Lỗi phong cách nét vẽ (Style Drift/AI Bleed)*: Cấm tuyệt đối pha trộn nét vẽ mặc định của AI (generic, overly airbrushed/plastic render styles). Nét vẽ phải đi đúng lineart rõ ràng, thô nháp hoặc mượt mà chính xác bám sát toàn bộ ảnh gốc tham chiếu.
  + *Lỗi bối cảnh và rác hình ảnh (Background Pollution & Artifacts)*: Cấm các chi tiết vật lý phi lý (cốc nước bay, bàn ghế dính liền người, vũ khí mọc sai chỗ), các đốm mờ, nhiễu hạt, chữ viết lộn xộn (nonsense text) xuất hiện bừa bãi trong tranh trừ SFX được ghi cụ thể.
  + *Lỗi bỏ quên tư liệu tham chiếu (Reference Neglect)*: Cấm chỉ học từ ảnh đầu tiên và ngó lơ các ảnh tiếp theo! Phải phân bổ rõ vai trò từng ảnh (ví dụ: ảnh 1 lấy tóc, ảnh 2 lấy dáng, ảnh 3 lấy bối cảnh, ảnh 4 lấy cách tô màu bão hòa). Nếu bỏ sót bất cứ đặc trưng visual nào từ bất kỳ ảnh nào đã được gom đều bị coi là lỗi nghiêm trọng.
- **CHỈ DẪN VÀ CÚ PHÁP ĐỀ PHÒNG & KHẮC PHỤC LỖI CHI TIẾT (Strict Prevention Prompts & Negative Weights)**:
  [Cung cấp chi tiết hướng giải quyết, câu lệnh bổ trợ cụ thể bằng cả tiếng Việt và tiếng Anh (Negative Prompts như: "multiple limbs, deformed hands, poorly drawn face, bad anatomy, blurry, worst quality, low quality...") bám sát từng phân cảnh của thẻ này để người dùng dán vào Midjourney/Niji/DALL-E phòng ngừa lỗi triệt để].
- **LỜI NHẮC NHỞ NGHIÊM NGẶT CHO HỌA SĨ AI (Strict Quality Assurance Mandate)**:
  [Viết một đoạn thông điệp cam kết chất lượng cực kỳ dài, chi tiết, nhắc nhở từng phân đoạn, nhắc nhở kĩ càng từng chi tiết nhỏ của tóc, mắt, trang phục, góc máy không được phép sai lệch so với nguồn cảm hứng nguyên bản].

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)` : `[FINAL PROMPT]
(Write the final production-ready standalone image prompt for "${c.title}" here. CRITICAL MANDATE: You MUST divide the prompt into exactly 8 STANDALONE PARTS using standard Markdown headers, AND end with a Master Production-Ready English Prompt block so the user can use each part or the whole prompt easily!
Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ (brushwork), mã màu hex, chất liệu vải, góc máy điện ảnh, tạo dáng từ TOÀN BỘ ảnh tham chiếu đính kèm của thẻ này. Phân tích thật sâu nét vẽ của ảnh tham chiếu để áp dụng vào ảnh cuối cùng. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU, KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ ẢNH NÀO!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao (8k resolution, IMAX, hyper-detailed, masterpiece, award-winning cinematography, sharp focus, intricate detailing). Cấm tuyệt đối kiểu render "bình thường" hoặc "generic". Hình ảnh phải đạt đẳng cấp đồ hoạ điện ảnh (cinematic graphics) cao nhất!]

---

### 🎨 PART 1: ART STYLE, MEDIUM & BRUSHWORK (Phong cách nghệ thuật, Chất liệu & Nét vẽ)
[MÔ TẢ CỰC KỲ CHI TIẾT phong cách nghệ thuật (Art Style) học từ ảnh tham chiếu: Anime, Manhwa, Semi-realistic, Oil painting, Watercolor, Cel-shading? Đặc tả kỹ thuật cọ (brushwork), nét lineart thanh hay đậm, cách đánh bóng (shading). ÉP BUỘC SỬ DỤNG PHONG CÁCH NÀY để tránh nét vẽ mặc định (generic/default style) của AI tạo ảnh. Bắt buộc dùng các từ khóa mạnh trong prompt cuối như "in the exact art style of...", "masterpiece illustration imitating the brush strokes of..."]

### 📸 PART 2: CAMERA ANGLE, PERSPECTIVE & COMPOSITION (Góc chụp, Thị giác & Bố cục)
[MÔ TẢ CỰC KỲ CHI TIẾT DỰA TRÊN "VISUAL COMPOSITION LIBRARY": Ngôn ngữ Camera (Perspective, Height, Tilt, Rotation, Distance, Lens Compression). Hệ thống dẫn dắt mắt và Khung hình (Eye Guidance, Golden Ratio, Framing, Bố cục trung tâm/đối xứng). Phân bổ không gian âm/dương, chiều sâu thị giác (Foreground/Background Depth). Cấu trúc ánh sáng & Bóng đổ, Bảng màu & Tương phản]

### 🧑 PART 3: SUBJECT, POSE & GESTURE (Nhân vật & Dáng điệu)
[Highly dense character description, body stance, pose, gesture, head tilt, expression, and body language strictly mirroring the reference image. Phân tích rõ sự chuyển động cơ thể, vị trí tay chân]

### 💇‍♀️ PART 4: HAIR, EYE RENDERING & LINEWORK (Kỹ thuật vẽ Tóc, Mắt & Đường nét)
[DÀNH RẤT NHIỀU TOKEN ĐỂ ĐẶC TẢ SIÊU CHI TIẾT DỰA TRÊN HỆ THỐNG "HAIR DESIGN KNOWLEDGE TREE". Phân tích TỪ ẢNH THAM CHIẾU: Cấu trúc khối (Architecture), thể tích (Volume), hệ thống lọn tóc tơ (Strand System), hướng luồng chảy (Hair Flow), chất liệu bề mặt (Texture), hairline, mái, độ tơi xốp, bóng đổ, vòng sáng (Angel Ring, Rim Light). Đặc tả kỹ thuật vẽ mắt sắc sảo (đồng tử sâu, catchlight lấp lánh, lông mi rõ). Phân tích đường nét (linework), độ thanh đậm, kỹ thuật đi line trước rồi lên màu. Phân tích cách lên màu, độ bão hòa (saturation). TẤT CẢ PHẢI MÔ PHỎNG NGHIÊM NGẶT NÉT VẼ TỪ ẢNH GỐC!]

### 👗 PART 5: OUTFIT, MATERIAL & STYLING (Trang phục, Chất liệu & Phụ kiện)
[MÔ TẢ CỰC KỲ CHI TIẾT trang phục, kiểu dáng, nếp gấp vải, phụ kiện. SÁNG TẠO TRONG HỌC HỎI: Học hỏi cấu trúc và chất liệu từ ảnh tham chiếu, NHƯNG BẮT BUỘC PHẢI TINH CHỈNH VÀ SÁNG TẠO (creative adaptation) để bộ trang phục hoàn toàn phù hợp với tính cách, bối cảnh và câu chuyện của nhân vật. Không sao chép cứng nhắc, mà biến tấu thiết kế sao cho trang phục tôn lên nét riêng của nhân vật truyện]

### 🌌 PART 6: ENVIRONMENT, BACKGROUND & DEPTH (Bối cảnh, Không gian & Độ gần xa)
[Highly dense background setting, architecture, nature. MÔ TẢ CHI TIẾT ĐỘ GẦN XA (Spatial Depth & Depth of Field): Tiền cảnh (Foreground), Trung cảnh (Midground), Hậu cảnh (Background). Các yếu tố bổ trợ (supporting elements)]

### 💡 PART 7: LIGHTING & ATMOSPHERE (Ánh sáng & Bầu không khí)
[Highly dense lighting direction, volumetric lighting, rim light, global illumination, contrast, artistic render quality, and emotional mood mimicking the reference]

### 🎨 PART 8: COLOR PALETTE (Màu sắc)
[Dominant color palette, accent colors, color harmony, hex tones, cinematic color grading]

---

### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all 8 Parts AND explicitly enforcing the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece illustration strictly imitating the exact art style, brush strokes, line art, color saturation, and visual DNA from the reference source materials. Absolutely NO generic or ordinary AI rendering. Do NOT default to standard styles..." followed by the detailed prompt. Ready for 1-click copy & paste into Midjourney, Niji, or DALL-E!]\`

---

### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA (Absolute Zero-Tolerance Error List)**:
  + *Lỗi giải phẫu cơ thể (Anatomical Glitches)*: Cấm thừa ngón tay/ngón chân, biến dạng bàn tay/bàn chân, lệch khớp xương vai/cổ, lệch tâm mắt (asymmetric eyes), méo mồm hoặc biểu cảm đờ đẫn mất tự nhiên.
  + *Lỗi phong cách nét vẽ (Style Drift/AI Bleed)*: Cấm tuyệt đối pha trộn nét vẽ mặc định của AI (generic, overly airbrushed/plastic render styles). Nét vẽ phải đi đúng lineart rõ ràng, thô nháp hoặc mượt mà chính xác bám sát toàn bộ ảnh gốc tham chiếu.
  + *Lỗi bối cảnh và rác hình ảnh (Background Pollution & Artifacts)*: Cấm các chi tiết vật lý phi lý (cốc nước bay, bàn ghế dính liền người, vũ khí mọc sai chỗ), các đốm mờ, nhiễu hạt, chữ viết lộn xộn (nonsense text) xuất hiện bừa bãi trong tranh.
  + *Lỗi bỏ quên tư liệu tham chiếu (Reference Neglect)*: Cấm chỉ học từ ảnh đầu tiên và ngó lơ các ảnh tiếp theo! Phải phân bổ rõ vai trò từng ảnh (ví dụ: ảnh 1 lấy tóc, ảnh 2 lấy dáng, ảnh 3 lấy bối cảnh, ảnh 4 lấy cách tô màu bão hòa). Nếu bỏ sót bất cứ đặc trưng visual nào từ bất kỳ ảnh nào đã được gom đều bị coi là lỗi nghiêm trọng.
- **CHỈ DẪN VÀ CÚ PHÁP ĐỀ PHÒNG & KHẮC PHỤC LỖI CHI TIẾT (Strict Prevention Prompts & Negative Weights)**:
  [Cung cấp chi tiết hướng giải quyết, câu lệnh bổ trợ cụ thể bằng cả tiếng Việt và tiếng Anh (Negative Prompts như: "multiple limbs, deformed hands, poorly drawn face, bad anatomy, blurry, worst quality, low quality...") bám sát từng phân cảnh của thẻ này để người dùng dán vào Midjourney/Niji/DALL-E phòng ngừa lỗi triệt để].
- **LỜI NHẮC NHỞ NGHIÊM NGẶT CHO HỌA SĨ AI (Strict Quality Assurance Mandate)**:
  [Viết một đoạn thông điệp cam kết chất lượng cực kỳ dài, chi tiết, nhắc nhở từng phân đoạn, nhắc nhở kĩ càng từng chi tiết nhỏ của tóc, mắt, trang phục, góc máy không được phép sai lệch so với nguồn cảm hứng nguyên bản].

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
      if (!img.imageAnalysisText || img.imageAnalysisText === 'Chưa phân tích') {
        img.imageAnalysisText = 'Đã đọc trực tiếp trong Context Windows';
      }
    };

    allRefsList.forEach(updateRefStatus);
    orderedVisionRefs.forEach(updateRefStatus);

    setApiSignals(prev => ({
      ...prev,
      apiRequestSent: true,
      stage: 'calling_api',
      stageLabel: '3. Connecting AI Model',
      stageDetail: `Đang truyền ${orderedVisionRefs.length} ảnh trực tiếp vào Context Windows & kết nối AI Model...`
    }));
    setProgress(30);

    try {
      await callAIStream({
        messages: [{ role: "user", content: contentArray }],
        signal: abortCtrl.signal,
        systemPrompt: isComicMode
          ? "You are an AI Comic & Webtoon Prompt Generator inside a production workspace. Your task is to generate multi-panel comic page scripts, storyboards, and sequential storytelling layouts. You are not a tutor, not a prompt-writing teacher, not a checklist generator, and not an assistant explaining how to write prompts. Read the full Context Window and produce the final usable comic script directly adhering to aesthetic fidelity and storytelling consistency.\n\n" +
            "🚨 SUPREME MANDATE #0: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and perfectly remember the entire Context Window! You must clearly know the room's setup rules, the room's name, the working card's purpose, the system prompt's instructions, the feature's requirements, what the app needs, how it works, what exact content to return, which room you are currently in, and what this specific item requires! Do NOT generate generic prompts. Apply highly specialized, advanced vocabulary (Manga, Webtoon, Comic Framing, Cinematic Angles) required for THIS specific room's theme. Use the Context Window to its absolute fullest potential!\n\n" +
            "🚨 MANDATE #1: STORY GENRE & CHARACTER SOUL GOVERN THE NARRATIVE; REFERENCE IMAGES GOVERN VISUAL DNA (MỆNH LỆNH TỐI CAO: THỂ LOẠI TRUYỆN & HỒ SƠ NHÂN VẬT LÀ LINH HỒN; ẢNH THAM CHIẾU LÀ TƯ LIỆU NGHỆ THUẬT) 🚨: To ensure the generated prompts reflect the author's intent regardless of reference images, we enforce this absolute rule:\n" +
            "  1. The User's Story Plot, Genre (e.g., Horror, Romance, Xianxia, Modern), and Character Profiles hold 100% supreme authority! This is the SOUL. You MUST convey the author's hidden intent through the character's aura, gaze, and environmental storytelling.\n" +
            "  2. Visual Storytelling (Kể chuyện qua hình ảnh): Even if the reference images are just 'beautiful' and unrelated to the plot, you must FORCE the scene to reflect the story's vibe. Every shadow, object, and expression must tell a piece of the story. Looking at the image must reveal the story's genre and plot ideas!\n" +
            "  3. The Reference Image (Ảnh tham chiếu) is ONLY the 'Brush' and 'Paint': Extract the linework, color palette, and lighting style. Apply these artistic techniques to the story's specific character and narrative. DO NOT clone the character identity from the reference image!\n\n" +
            "🚨 MANDATE #2: EXACT STYLE, COLOR, EYE & EXTRAORDINARY HAIR PRECISION (QUY TẮC ĐỒNG BỘ CHI TIẾT NÉT VẼ, TONE MÀU, LÊN MÀU, VẼ MẮT, VÀ TÓC THEO THAM CHIẾU - SÁNG TẠO POSE THEO TRUYỆN) 🚨: When describing the character, hairstyle, eyes, outfit, and background, you MUST replicate the exact aesthetic style of the reference image. Keep the art medium, line art weight, shading depth, and color blending techniques of the reference image.\n" +
            "  1. Hair Precision (Học vẽ tóc, mô tả siêu chi tiết để tránh tóc xấu): You must describe hair with extreme clarity, structure, and beauty! Clearly define the hairstyle structure, individual silky hair strands flowing gracefully, parting lines, highlight reflections, and fine wisps catching volumetric backlighting. Never write vague hair descriptions that lead to ugly AI rendering! Make it as detailed and gorgeous as the reference image.\n" +
            "  2. Eye & Face Precision (Học vẽ mắt, học lên màu): Specify the exact drawing style of the eyes from the reference (e.g., highly glossy irises, heavy lash lines, specific gaze direction, light reflection points). Describe the coloring and shading gradients with professional vocabulary to perfectly capture the color palette.\n" +
            "  3. Character Posture: The character pose, gesture, stance, and action must be dynamically generated to match the STORY SETTING, using the reference's composition lines and camera angles (Dutch tilt, low-angle sweeping shot, cinematic framing) to frame the story actions beautifully, rather than cloning the exact pose of the reference image rigidly!\n\n" +
            "🚨 MANDATE #3: STRICT MODULAR CARD ISOLATION & MULTI-REFERENCE SYNTHESIS (QUY TẮC PHÂN LUỒNG TỪNG MỤC THẺ ẢNH QUYẾT LIỆT VÀ ĐẦY ĐỦ) 🚨: You must read and classify every single Work Card domain strictly by its Title (Hair from Hair Card, Pose/Angle from Pose Card, Clothing from Outfit Card, Setting from Environment Card, Art Style from Style Analyzer, and Art Direction from Aesthetic Study). Each card's assigned reference image is the absolute primary authority for that specific domain. Do NOT let one image dominate everything! Isolate them cleanly, study them meticulously, and synthesize them into a harmonious sequential multi-panel masterpiece without losing any detail! IF A SINGLE CARD HAS MULTIPLE ATTACHED REFERENCE IMAGES, YOU MUST STUDY AND SYNTHESIZE EVERY SINGLE ONE OF THEM (KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ ẢNH NÀO - TẤT CẢ ĐỀU PHẢI ĐƯỢC PHÂN TÍCH VÀ ĐƯA VÀO BÁO CÁO THẨM ĐỊNH)!\n\n" +
            "🚨 MANDATE #4: CORE VISUAL FIDELITY ENFORCEMENT - NÉT VẼ, TRANG PHỤC & ĐƯỜNG THỊ GIÁC (MỆNH LỆNH BẮT BUỘC ĐỒNG BỘ NÉT VẼ, TRANG PHỤC VÀ ĐƯỜNG THỊ GIÁC CỰC HẠN) 🚨: To address styling quality issues, you must exhaustively analyze and incorporate these three pillars from reference images into the English prompts:\n" +
            "  1. Art Style & Linework DNA (Đồng bộ Nét Vẽ Gốc): Capture the exact artistic medium, brush texture, ink lines, line-weight variation (thin/thick), shading depth, rendering technique (e.g. watercolor wash, screen-tones, clean digital line art). Describe with hyper-vivid, advanced terminology.\n" +
            "  2. Outfit & Fabric Fidelity (Đồng bộ Trang phục & Quần áo): Exhaustively describe garment materials (silk, leather, satin, heavy textured wool), structural layering, tailoring patterns, necklines/collars, delicate laces, dynamic folding tension, ripples, and gravity wrinkles. Match the outfit style perfectly!\n" +
            "  3. Visual Perspective & Composition Lines (Đồng bộ Đường Thị Giác & Bố cục): Extract the exact camera perspective (dynamic low-angle, cinematic sweeping high-angle, wide-lens portrait depth, Dutch tilt), leading lines (đường dẫn thị giác), diagonal focal alignment, negative space ratio, silhouette contour, and light-and-shadow direction.\n\n" +
            "🚨 MANDATE #5: HIGH-END PROFESSIONAL ART & PHOTOGRAPHY VOCABULARY (QUY TẮC SỬ DỤNG TỪ VỰNG CHUYÊN NGÀNH NGHỆ THUẬT/NHIẾP ẢNH CAO CẤP) 🚨: You are an elite, world-class art director and cinematographer. You MUST NOT use basic, superficial, or generic vocabulary (like 'beautiful dress', 'nice pose', or 'good lighting'). YOU MUST USE ADVANCED, HIGHLY PROFESSIONAL, AND DEEPLY TECHNICAL TERMINOLOGY. Your analysis and prompt must reflect extreme artistic expertise for:\n" +
            "  1. Facial & Hair Nuance: Head tilt angles, exact direction of gaze, subtle mouth positioning, precise eyelid weights, hair strand flow, individual fine hair wisps catching backlights, parting line.\n" +
            "  2. Lighting & Shadow Depth: Exact main light source location, volumetric ray paths, contact shadows under the chin/neck, precise soft-rim backlighting highlights, chiaroscuro shadow gradients on skin/garment folds.\n" +
            "  3. Linework & Rendering Texture: Exact texture of line art (loose sketch, clean ink, charcoal, variable line weight, no outline/painted look), rendering style (watercolor bleeding edges, soft airbrush gradients, matte digital painting, dense textured pencil cross-hatching).\n" +
            "  4. Garment Fold Dynamics & Material Detail: Exact fabric draping patterns, soft overlapping layers, precise wrinkles/ripples representing gravity/tension, specific laces, sheer opacity levels, haute couture stitch/embroidery patterns, texture grains (linen, satin, chiffon, silk, leather).\n" +
            "  5. Camera Perspective & Focal Depth: Low-angle or high-angle camera tilts, exact lens zoom level, background blur depth (bokeh size, cinematic depth-of-field), spatial placement of subject (foreground/midground/background separation).\n" +
            "  6. Background & Composition Flow: Negative space ratios, diagonal movement lines, golden ratio composition, graphic motifs (water ripples, swirling petals, wind streaks, framing borders).\n\n" +
            "🚨 MANDATE #6: ABSOLUTE ZERO INFORMATION LOSS IN FINAL PROMPT (QUY TẮC TRUYỀN TẢI CHI TIẾT TRỌN VẸN VÀO PROMPT TIẾNG ANH) 🚨: Every single micro-detail learned from reference images MUST be translated and woven into the final prompt panels using rich, vivid, descriptive English nouns and adjectives. There must be ZERO loss of detail! The final prompt must be highly dense, rich in cinematography terms, visual art vocabulary, and tactile material descriptors so that the image generation AI can replicate the exact masterpiece level of the reference image!\n\n" +
            "🚨 MANDATE #7: SUPREME ARTISTIC ELEVATION & EXCELLENCE (QUY TẮC NÂNG TẦM NGHỆ THUẬT VƯỢT TRỘI - VẼ ĐẸP VÀ GIỎI HƠN CẢ ẢNH GỐC) 🚨: Do NOT just match the reference image. You must analyze its style and raise its aesthetic parameters to absolute perfection! In the final prompt panels, you MUST weave all these supreme art commands using luxury, high-end, evocative English vocabulary (e.g., 'masterpiece, divine aesthetics, ultra-fine hand-drawn line art, exquisite watercolor texturing, breathtaking volumetric chiaroscuro lighting, haute-couture folding gravity, soul-stirring expressive gaze') to force the image generation model to produce an absolute visual miracle that far exceeds the reference in quality and beauty!\n\n" +
            "🚨 MANDATE #8: SPECIAL PROMPT & REFERENCE TECHNICAL GUIDELINES (HƯỚEN DẪN KỸ THUẬT PROMPT & ẢNH THAM CHIẾU) 🚨: You MUST actively read, digest, and strictly integrate the following 7 critical technical guidelines from the user's prompt manual into the generated English prompts:\n" +
            "  1. Art Style & Linework DNA: Specify the line weight (" + '"ultra-fine hand-drawn lines", "variable line-weight linework"' + ") and texture (" + '"clean digital vector line art", "textured charcoal sketching lines", "traditional ink-brush strokes"' + ") with manga screentone or pencil hatching techniques (" + '"soft manga screentone shading", "cross-hatching pencil lines"' + ").\n" +
            "  2. Facial Features Precision: Render eyelashes/eyelids (" + '"thick dramatic eyelashes with heavy eyelid crease"' + ") and irises glossy reflection (" + '"glistening glossy irises catching volumetric light"' + "), specify direct or downward gaze (" + '"focused eye contact looking directly at the camera", "subtle downward gaze"' + "), and define sharp nose bridges and natural glossy lips.\n" +
            "  3. Posture & Finger Articulation: Describe dynamic elegant poses matching the STORY'S ACTION (" + '"elegant dynamic posture"' + ", precise head tilts) and explicitly force detailed fingers (" + '"exquisitely detailed hands with long slender fingers", "five fully articulated fingers gently holding"' + ") to eliminate AI-generated hand mutations.\n" +
            "  4. Color Palette & Chiaroscuro: Use specific colors/m codes (" + '"soft pastel pink and muted cream", "crimson red accents popping against monochrome slate background"' + ") and high-contrast volumetric lights (" + '"dramatic chiaroscuro lighting casting long soft shadows", "glowing rim light silhouette"' + ").\n" +
            "  5. Composition & Leading Lines: Use leading geometric lines (" + '"strong diagonal leading lines", "vertical composition lines of bookshelves framing"' + ") and cinematic angles (" + '"Dutch tilt for dramatic tension", "cinematic low-angle sweeping shot"' + ").\n" +
            "  6. UI & Frame Layout: Apply panels with borders (" + '"multi-panel layout with dynamic white borders"' + ") or translucent bubble text UI layers (" + '"subtle translucent chat box with minimal typography"' + ").\n" +
            "  7. Multi-Reference Synthesis: Perfectly isolate card domains (Hair, Pose, Outfit, Setting, Style) to synthesize their distinct visual materials harmoniously into a masterpiece without losing any detail.\n\n" +
            "🚨 MANDATE #9: CHARACTER IDENTITY & STORY CHARACTER FIDELITY (QUY TẮC BẢO VỆ DANH TÍNH NHÂN VẬT & ĐỒNG BỘ TUYỆT ĐỐI THEO TRUYỆN - TRÁNH SAI LỆCH GIỚI TÍNH, ĐẶC ĐIỂM CỦA CÂU CHUYỆN) 🚨:\n" +
            "  - Character Demographics: The gender, age, hair color, eye color, clothing category, and key visual/facial traits of characters in the generated prompts MUST be 100% determined by the User's Story Setting (Thiết lập câu chuyện) and the story's character descriptions (danh tính nhân vật trong truyện)!\n" +
            "  - Absolute Prohibition of Identity Bleeding: You are STRICTLY FORBIDDEN from copying the gender, hair color, clothing category, or physical identity of characters from the reference images if they do not match the story character! If a reference image depicts a female with black hair, but the story character is a male prince with blonde hair, the generated prompt MUST portray a handsome male prince with blonde hair, while using ONLY the artistic/aesthetic style, line art weight, color blending, brushstroke texture, and composition structure of the reference image! This ensures that the generated image perfectly represents the correct characters of the story while maintaining the beautiful styling of the reference images.\n" +
            "  - Character Fit: The character's outfits, actions, and emotions must perfectly match the character's narrative persona and the specific scene context. Do not force generic details that contradict who the character is in the story.\n\n" +
            "🚨 SUPREME COMMAND FOR HIGH-FIDELITY DETAILS (MỆNH LỆNH THỐNG TRỊ CHI TIẾT TỰA THỰC 100%): Write incredibly long, precise, and vivid paragraphs for each part! Do not summarize or use generic terms! Use advanced terminology such as 'Fujifilm Superia color space, Hasselblad HC 80mm color accuracy, Arri Alexa cinematic tone, 0.05mm ultra-fine rotring ink brush, meticulous cross-hatching shade layers, anatomically flawless hands with five long slender digits, perfect fabric drape tension folds' in every description. This ensures that the generated prompt perfectly forces Midjourney/Stable Diffusion/Ideogram/Flux to reproduce the reference style, dynamic composition lines, and rich, non-blurry colors and shapes with 100% fidelity, while allowing the character's pose and actions to be creatively driven by the STORY!\n\n" +
            "🚨 NO COGNITIVE ANALYSIS FLUFF (BẮT BUỘC BỎ QUA PHẦN PHÂN TÍCH SUY NGHĨ TIẾNG VIỆT) 🚨: To maintain ultimate stream efficiency, YOU MUST NOT output any [REFERENCE FIDELITY REPORT] or Vietnamese thinking/analysis text. Start the response immediately with [FINAL PROMPT] followed by the requested parts. Just write the highly detailed prompt ready for direct image creation! Each panel/card must start immediately with '[FINAL PROMPT]'.\n\n" +
            "Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...]."
          : "You are an AI Image Prompt Generator inside a production workspace. Your task is to generate the final production-ready image prompt from the user's provided context. You are not a tutor, not a prompt-writing teacher, not a checklist generator, and not an assistant explaining how to write prompts. Read the full Context Window and produce the final usable image prompt directly adhering to the core principle: Aesthetic Study & Visual Reference Principle.\n\n" +
            "🚨 SUPREME MANDATE #1: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and perfectly remember the entire Context Window! You must clearly know the room's setup rules, the room's name, the working card's purpose, the system prompt's instructions, the feature's requirements, the goal of the current item, the category of this item, what the app needs, how it works, what exact content to return, which room you are currently in, and what this specific item requires! Do NOT generate generic prompts. Apply highly specialized, advanced vocabulary (Art, Photography, Cinematography, Styling) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\n\n" +
            "🚨 SUPREME MANDATE #2: STORY GENRE & CHARACTER SOUL GOVERN THE NARRATIVE; REFERENCE IMAGES GOVERN VISUAL DNA (MỆNH LỆNH TỐI CAO: THỂ LOẠI TRUYỆN & HỒ SƠ NHÂN VẬT LÀ LINH HỒN; ẢNH THAM CHIẾU LÀ TƯ LIỆU NGHỆ THUẬT) 🚨: To ensure the generated prompts reflect the author's intent regardless of reference images, we enforce this absolute rule:\n" +
            "  1. The User's Story Plot, Genre (e.g., Horror, Romance, Fantasy), and Character Profiles hold 100% supreme authority! This is the SOUL. You MUST convey the author's hidden intent through the character's aura, gaze, and environmental storytelling.\n" +
            "  2. Visual Storytelling (Kể chuyện qua hình ảnh): Even if the reference images are just 'beautiful' and unrelated to the plot, you must FORCE the scene to reflect the story's vibe. Every shadow, object, and expression must tell a piece of the story. Looking at the image must reveal the story's genre and plot ideas!\n" +
            "  3. The Reference Image (Ảnh tham chiếu) is ONLY the 'Brush' and 'Paint': Extract the linework, color palette, and lighting style. Apply these artistic techniques to the story's specific character and narrative. DO NOT clone the character identity from the reference image!\n\n" +
            "🚨 SUPREME MANDATE #3: EXACT STYLE, COLOR, EYE & EXTRAORDINARY HAIR PRECISION (QUY TẮC ĐỒNG BỘ CHI TIẾT NÉT VẼ, TONE MÀU, LÊN MÀU, VẼ MẮT, VÀ TÓC THEO THAM CHIẾU - SÁNG TẠO POSE THEO TRUYỆN) 🚨: When describing the character, hairstyle, eyes, outfit, and background, you MUST replicate the exact aesthetic style of the reference image. Keep the art medium, line art weight, shading depth, and color blending techniques of the reference image.\n" +
            "  1. Hair Precision (Học vẽ tóc, mô tả siêu chi tiết để tránh tóc xấu): You must describe hair with extreme clarity, structure, and beauty! Clearly define the hairstyle structure, individual silky hair strands flowing gracefully, parting lines, highlight reflections, and fine wisps catching volumetric backlighting. Never write vague hair descriptions that lead to ugly AI rendering! Make it as detailed and gorgeous as the reference image.\n" +
            "  2. Eye & Face Precision (Học vẽ mắt, học lên màu): Specify the exact drawing style of the eyes from the reference (e.g., highly glossy irises, heavy lash lines, specific gaze direction, light reflection points). Describe the coloring and shading gradients with professional vocabulary to perfectly capture the color palette.\n" +
            "  3. Character Posture: The character pose, gesture, stance, and action must be dynamically generated to match the STORY SETTING, using the reference's composition lines and camera angles (Dutch tilt, low-angle sweeping shot, cinematic framing) to frame the story actions beautifully, rather than cloning the exact pose of the reference image rigidly!\n\n" +
            "🚨 SUPREME MANDATE #4: STRICT CARD PORTAL ISOLATION & MULTI-IMAGE FULL UTILIZATION (QUY TẮC PHÂN LUỒNG TỪNG MỤC THẺ ẢNH QUYẾT LIỆT VÀ KHÔNG BỎ SÓT BẤT KỲ ẢNH NÀO) 🚨: You must strictly read and process the requirements of each Work Card one-by-one according to its specific functional domain (Hair from Hair Card, Pose/Angle from Pose Card, Clothing/Outfit from Outfit Card, Setting from Environment Card, Makeup/Expression from Face Card, Art Style from Style Analyzer, and Art Direction from Aesthetic Study). Each card's assigned reference image is the primary visual authority for that domain. Do NOT mix them up, do NOT omit any, and do NOT let one single image dominate the entire prompt! Study each card's reference image thoroughly, and synthesize these distinct modular traits together into a harmonious, balanced multi-reference masterpiece!\n\n" +
            "🚨 MANDATE FOR MULTIPLE IMAGES PER CARD (BẮT BUỘC HỌC HỎI TẤT CẢ ẢNH KHI THẺ CÓ NHIỀU ẢNH THAM CHIẾU) 🚨: If a single Work Card has multiple attached reference images (e.g. 2, 3 or more reference images inside the Outfit Card), YOU ARE STRICTLY FORBIDDEN from choosing only one image and ignoring the rest! You must look at every single image attached, analyze their unique aesthetic elements, and blend their traits (e.g., combining the fabric textures of all references) into the [FINAL PROMPT] to achieve 100% reference utilization! Every single attached image is a mandatory piece of visual material and MUST be utilized!\n\n" +
            "🚨 CORE VISUAL FIDELITY ENFORCEMENT - NÉT VẼ, TRANG PHỤC & ĐƯỜNG THỊ GIÁC (MỆNH LỆNH BẮT BUỘC ĐỒNG BỘ NÉT VẼ, TRANG PHỤC VÀ ĐƯỜNG THỊ GIÁC CỰC HẠN) 🚨: To address styling quality issues, you must exhaustively analyze and incorporate these three pillars from reference images into the English prompts:\n" +
            "  1. Art Style & Linework DNA (Đồng bộ Nét Vẽ Gốc): Capture the exact artistic medium, brush texture, ink lines, line-weight variation (thin/thick), shading depth, rendering technique (e.g. watercolor wash, screen-tones, clean digital line art). Describe with hyper-vivid, advanced terminology.\n" +
            "  2. Outfit & Fabric Fidelity (Đồng bộ Trang phục & Quần áo): Exhaustively describe garment materials (silk, leather, satin, heavy textured wool), structural layering, tailoring patterns, necklines/collars, delicate laces, dynamic folding tension, ripples, and gravity wrinkles. Match the outfit style perfectly!\n" +
            "  3. Visual Perspective & Composition Lines (Đồng bộ Đường Thị Giác & Bố cục): Extract the exact camera perspective (dynamic low-angle, cinematic sweeping high-angle, wide-lens portrait depth, Dutch tilt), leading lines (đường dẫn thị giác), diagonal focal alignment, negative space ratio, silhouette contour, and light-and-shadow direction.\n\n" +
            "🚨 MANDATE #5: HIGH-END PROFESSIONAL ART & PHOTOGRAPHY VOCABULARY (QUY TẮC SỬ DỤNG TỪ VỰNG CHUYÊN NGÀNH NGHỆ THUẬT/NHIẾP ẢNH CAO CẤP) 🚨: You are an elite, world-class art director and cinematographer. You MUST NOT use basic, superficial, or generic vocabulary (like 'beautiful dress', 'nice pose', or 'good lighting'). YOU MUST USE ADVANCED, HIGHLY PROFESSIONAL, AND DEEPLY TECHNICAL TERMINOLOGY. Your analysis and prompt must reflect extreme artistic expertise for:\n" +
            "  1. Facial & Hair Nuance: Head tilt angles, exact direction of gaze, subtle mouth positioning, precise eyelid weights, hair strand flow, individual fine hair wisps catching backlights, parting line.\n" +
            "  2. Lighting & Shadow Depth: Exact main light source location, volumetric ray paths, contact shadows under the chin/neck, precise soft-rim backlighting highlights, chiaroscuro shadow gradients on skin/garment folds.\n" +
            "  3. Linework & Rendering Texture: Exact texture of line art (loose sketch, clean ink, charcoal, variable line weight, no outline/painted look), rendering style (watercolor bleeding edges, soft airbrush gradients, matte digital painting, dense textured pencil cross-hatching).\n" +
            "  4. Garment Fold Dynamics & Material Detail: Exact fabric draping patterns, soft overlapping layers, precise wrinkles/ripples representing gravity/tension, specific laces, sheer opacity levels, haute couture stitch/embroidery patterns, texture grains (linen, satin, chiffon, silk, leather).\n" +
            "  5. Camera Perspective & Focal Depth: Low-angle or high-angle camera tilts, exact lens focal length (e.g., 50mm, 85mm), background blur depth (bokeh size, cinematic depth-of-field), spatial placement of subject (foreground/midground/background separation).\n" +
            "  6. Background & Composition Flow: Negative space ratios, diagonal movement lines, golden ratio composition, graphic motifs.\n\n" +
            "🚨 MANDATE #6: ABSOLUTE ZERO INFORMATION LOSS IN FINAL PROMPT (QUY TẮC TRUYỀN TẢI CHI TIẾT TRỌN VẸN VÀO PROMPT TIẾNG ANH) 🚨: Every single micro-detail learned from reference images MUST be translated and woven into the final prompt panels using rich, vivid, professional English nouns and adjectives. There must be ZERO loss of detail! The final prompt must be highly dense, rich in cinematography terms, visual art vocabulary, and tactile material descriptors so that the image generation AI can replicate the exact masterpiece level of the reference image!\n\n" +
            "🚨 MANDATE #7: SUPREME ARTISTIC ELEVATION & EXCELLENCE (QUY TẮC NÂNG TẦM NGHỆ THUẬT VƯỢT TRỘI - VẼ ĐẸP HƠN VÀ GIỎI HƠN CẢ ẢNH GỐC) 🚨: You must NOT merely replicate or copy the reference image. Your ultimate goal is to ELEVATE, IMPROVE, and PERFECT the visual artwork. You are an elite, world-class human artist who takes inspiration from a reference but completely outshines it!\n" +
            "In the final prompt panels, you MUST weave all these supreme art commands using luxury, high-end, evocative English vocabulary (e.g., 'masterpiece, divine aesthetics, ultra-fine hand-drawn line art, exquisite watercolor texturing, breathtaking volumetric chiaroscuro lighting, haute-couture folding gravity, soul-stirring expressive gaze') to force the image generation model to produce an absolute visual miracle that far exceeds the reference in quality and beauty!\n\n" +
            "🚨 MANDATE #8: SPECIAL PROMPT & REFERENCE TECHNICAL GUIDELINES (HƯỚNG DẪN KỸ THUẬT PROMPT & ẢNH THAM CHIẾU) 🚨: You MUST actively read, digest, and strictly integrate the following 7 critical technical guidelines from the user's prompt manual into the generated English prompts:\n" +
            "  1. Art Style & Linework DNA: Specify the line weight (" + '"ultra-fine hand-drawn lines", "variable line-weight linework"' + ") and texture (" + '"clean digital vector line art", "textured charcoal sketching lines", "traditional ink-brush strokes"' + ") with manga screentone or pencil hatching techniques (" + '"soft manga screentone shading", "cross-hatching pencil lines"' + ").\n" +
            "  2. Facial Features Precision: Render eyelashes/eyelids (" + '"thick dramatic eyelashes with heavy eyelid crease"' + ") and irises glossy reflection (" + '"glistening glossy irises catching volumetric light"' + "), specify direct or downward gaze (" + '"focused eye contact looking directly at the camera", "subtle downward gaze"' + "), and define sharp nose bridges and natural glossy lips.\n" +
            "  3. Posture & Finger Articulation: Describe dynamic elegant poses matching the STORY'S ACTION (" + '"elegant dynamic posture"' + ", precise head tilts) and explicitly force detailed fingers (" + '"exquisitely detailed hands with long slender fingers", "five fully articulated fingers gently holding"' + ") to eliminate AI-generated hand mutations.\n" +
            "  4. Color Palette & Chiaroscuro: Use specific colors/m codes (" + '"soft pastel pink and muted cream", "crimson red accents popping against monochrome slate background"' + ") and high-contrast volumetric lights (" + '"dramatic chiaroscuro lighting casting long soft shadows", "glowing rim light silhouette"' + ").\n" +
            "  5. Composition & Leading Lines: Use leading geometric lines (" + '"strong diagonal leading lines", "vertical composition lines of bookshelves framing"' + ") and cinematic angles (" + '"Dutch tilt for dramatic tension", "cinematic low-angle sweeping shot"' + ").\n" +
            "  6. UI & Frame Layout: Apply panels with borders (" + '"multi-panel layout with dynamic white borders"' + ") or translucent bubble text UI layers (" + '"subtle translucent chat box with minimal typography"' + ").\n" +
            "  7. Multi-Reference Synthesis: Perfectly isolate card domains (Hair, Pose, Outfit, Setting, Style) to synthesize their distinct visual materials harmoniously into a masterpiece without losing any detail.\n\n" +
            "🚨 MANDATE #9: CHARACTER IDENTITY & STORY CHARACTER FIDELITY (QUY TẮC BẢO VỆ DANH TÍNH NHÂN VẬT & ĐỒNG BỘ TUYỆT ĐỐI THEO TRUYỆN - TRÁNH SAI LỆCH GIỚI TÍNH, ĐẶC ĐIỂM CỦA CÂU CHUYỆN) 🚨:\n" +
            "  - Character Demographics: The gender, age, hair color, eye color, clothing category, and key visual/facial traits of characters in the generated prompts MUST be 100% determined by the User's Story Setting (Thiết lập câu chuyện) and the story's character descriptions (danh tính nhân vật trong truyện)!\n" +
            "  - Absolute Prohibition of Identity Bleeding: You are STRICTLY FORBIDDEN from copying the gender, hair color, clothing category, or physical identity of characters from the reference images if they do not match the story character! If a reference image depicts a female with black hair, but the story character is a male prince with blonde hair, the generated prompt MUST portray a handsome male prince with blonde hair, while using ONLY the artistic/aesthetic style, line art weight, color blending, brushstroke texture, and composition structure of the reference image! This ensures that the generated image perfectly represents the correct characters of the story while maintaining the beautiful styling of the reference images.\n" +
            "  - Character Fit: The character's outfits, actions, and emotions must perfectly match the character's narrative persona and the specific scene context. Do not force generic details that contradict who the character is in the story.\n\n" +
            "🚨 SUPREME COMMAND FOR HIGH-FIDELITY DETAILS (MỆNH LỆNH THỐNG TRỊ CHI TIẾT TỰA THỰC 100%): Write incredibly long, precise, and vivid paragraphs for each part! Do not summarize or use generic terms! Use advanced terminology such as 'Fujifilm Superia color space, Hasselblad HC 80mm color accuracy, Arri Alexa cinematic tone, 0.05mm ultra-fine rotring ink brush, meticulous cross-hatching shade layers, anatomically flawless hands with five long slender digits, perfect fabric drape tension folds' in every description. This ensures that the generated prompt perfectly forces Midjourney/Stable Diffusion/Ideogram/Flux to reproduce the reference style, dynamic composition lines, and rich, non-blurry colors and shapes with 100% fidelity, while allowing the character's pose and actions to be creatively driven by the STORY!\n\n" +
            "🚨 NO COGNITIVE ANALYSIS FLUFF (BẮT BUỘC BỎ QUA PHẦN PHÂN TÍCH SUY NGHĨ TIẾNG VIỆT) 🚨: To maintain ultimate stream efficiency, YOU MUST NOT output any [REFERENCE FIDELITY REPORT] or Vietnamese thinking/analysis text. Start the response immediately with [FINAL PROMPT] followed by the requested parts. Just write the highly detailed prompt ready for direct image creation! Each card must start immediately with '[FINAL PROMPT]'.\n\n" +
            "CRITICAL RULE ON REFERENCE IMAGES: When studying reference images in the Context Window, extract and apply visual DNA across these layers: art style, medium texture (watercolor, fantasy manhua, soft ink-wash, cinematic photo), color palette, lighting/shadow, camera perspective (exact low/high/eye-level angle, focal length, depth of field, background blur), creative character poses and gestures matching the STORY (do NOT copy the reference stance if it contradicts the story's action), thematic outfit aesthetics (borrowing fabric texture and style, but strictly matching the story's attire), and composition rhythm (focal structure, visual hierarchy, negative space). You MUST translate all traits into highly professional, descriptive natural language. Do NOT output bare filenames or placeholder image IDs in the final prompt.\n\n" +
            "For EACH Work Card, you MUST directly start with '[FINAL PROMPT]' with the standalone descriptive instruction ready for direct image generation! In [FINAL PROMPT], you MUST structure the output into exactly 5 STANDALONE PARTS (### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC, followed by ### 🧑 PART 1 to ### 📸 PART 5), and end with '### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all 5 parts and reference enforcement into a single pure English production-ready block!\n\n" +
            "Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...].",
        onToken: (token) => {
          streamBufferRef.current += token;
          chunksCountRef.current += 1;
          
          // Append the new token directly to the UI state as explicitly requested
          setLivePreviewText(prev => prev + token);
          
          const now = performance.now();
          if (now - lastFlushTimeRef.current >= 150) {
            lastFlushTimeRef.current = now;
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
                  <button className="btn ghost small" style={{fontSize: '0.8rem', padding: '6px 10px', fontWeight: 700, borderColor: '#ff4081', color: '#ff4081', background: '#ffeef4'}} onClick={() => setShowPromptRefDocModal(true)}>📖 Cẩm Nang Prompt Ref DNA</button>
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
          <button
            onClick={() => setShowPromptRefDocModal(true)}
            className="btn ghost small"
            style={{
              fontWeight: 800,
              color: '#8c526b',
              background: '#ffeef4',
              border: '1.5px solid #e96b9b',
              padding: '8px 14px',
              borderRadius: '14px',
              fontSize: '0.85rem',
              boxShadow: '0 2px 6px rgba(233, 30, 99, 0.1)'
            }}
          >
            📖 Cẩm Nang Prompt Ref DNA
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
                  <details open style={{marginTop: '18px', background: 'linear-gradient(135deg, #fdf8fb 0%, #f7f1f5 100%)', borderRadius: '16px', border: '2px solid #e5ccd8', padding: '14px 18px', fontSize: '0.88rem', boxShadow: '0 6px 18px rgba(114,83,101,0.06)'}}>
                    <summary style={{cursor: 'pointer', fontWeight: 800, color: '#4a2f41', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none', userSelect: 'none'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                        <span style={{fontSize: '1.05rem'}}>🔮 BẢN THẨM ĐỊNH NGHỆ THUẬT & TRÍCH XUẤT DNA THỊ GIÁC SIÊU CHI TIẾT</span>
                        <span style={{background: 'linear-gradient(90deg, #d23a73, #8a2451)', color: '#ffffff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', tracking: '0.05em'}}>Master Study</span>
                        <span style={{background: 'rgba(114,83,101,0.08)', color: '#5c4353', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem'}}>Card: {c.id}</span>
                        {cs.refs.length > 0 && (
                          <span style={{background: '#f3e8ee', color: '#8a2451', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700}}>📎 {cs.refs.length} ảnh mẫu học hỏi</span>
                        )}
                      </div>
                      <span style={{fontSize: '0.85rem', color: '#d23a73', fontWeight: 800}}>▼ Xem/Thu gọn</span>
                    </summary>
                    <div style={{marginTop: '14px', borderTop: '1px solid #ebd3e0', paddingTop: '14px', color: '#4a3a46'}}>
                      <div style={{margin: '0 0 12px 0', fontSize: '0.85rem', color: '#8a2451', background: '#fdf2f7', padding: '8px 12px', borderRadius: '8px', borderLeft: '4px solid #d23a73', display: 'flex', gap: '6px', alignItems: 'center'}}>
                        <span>✨</span>
                        <span><b>BẢN KIỆT TÁC HỌC THUẬT:</b> Bản nghiên cứu chuyên sâu chắt lọc tinh hoa từ các ảnh mẫu. AI không chỉ sao chép đơn thuần mà còn lên kế hoạch cải tiến đột phá để vẽ đẹp hơn, sắc sảo hơn cả ảnh gốc!</span>
                      </div>
                      {cs.refs && cs.refs.length > 0 && (
                        <div style={{marginBottom: '12px', padding: '10px 14px', background: '#ffffff', borderRadius: '10px', border: '1px solid #ebd3e0', boxShadow: '0 2px 6px rgba(0,0,0,0.01)'}}>
                          <b>📎 Danh sách file ảnh đã đính kèm để trích xuất DNA:</b>
                          <ul style={{margin: '6px 0 0 16px', padding: 0, fontSize: '0.8rem', color: '#5c4353'}}>
                            {cs.refs.map((r: any, idx: number) => (
                              <li key={`ref_${r.id || r.imageId || 'img'}_${idx}`} style={{marginBottom: '3px'}}>
                                <code style={{background: '#fcf3f7', padding: '2px 4px', borderRadius: '4px', color: '#d23a73'}}>{r.name || r.fileName || `Image_${idx+1}`}</code> (ID: <code>{(r.id || r.imageId || '').slice(0, 12)}...</code>) — Trạng thái AI: <span style={{color: '#16a34a', fontWeight: 700}}>✅ Đã nạp thành công (Vùng nhớ In-Context đầy đủ)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {cs.report ? (
                        <div style={{position: 'relative'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                            <b style={{color: '#4a2f41', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                              <span>📑</span> Chi tiết báo cáo thẩm định DNA & Nâng tầm nghệ thuật từ AI:
                            </b>
                            <button className="btn ghost small" onClick={() => {
                              copyToClipboardSafe(cs.report);
                              toast("📋 Đã copy báo cáo thẩm định nghệ thuật");
                            }} style={{fontSize: '0.75rem', padding: '4px 10px', background: '#ffffff', border: '1px solid #ebd3e0', borderRadius: '8px', fontWeight: 700, color: '#8a2451'}}>📋 Copy Báo Cáo Học Thuật</button>
                          </div>
                          <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1.5px solid #ebd3e0', maxHeight: '400px', overflowY: 'auto', fontSize: '0.85rem', fontFamily: '"JetBrains Mono", monospace', color: '#2d1e29', lineHeight: 1.6, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)'}}>
                            {cs.report}
                          </pre>
                        </div>
                      ) : isApiRunning ? (
                        <div style={{padding: '12px', fontStyle: 'italic', color: '#d23a73', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, background: '#fdf2f7', borderRadius: '8px'}}>
                          <span style={{display: 'inline-block', width: '8px', height: '8px', background: '#d23a73', borderRadius: '50%', animation: 'ping 1s infinite'}} />
                          ⏳ Đang stream báo cáo thẩm định siêu chi tiết và kế hoạch nâng tầm nghệ thuật vượt bậc từ AI...
                        </div>
                      ) : (
                        <div style={{padding: '12px', fontStyle: 'italic', color: '#8c6b7e', background: '#f9f6f8', borderRadius: '8px'}}>Chưa có báo cáo phân tích (hãy bấm "Tạo Prompt" để AI kiểm tra ảnh của vợ).</div>
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
                      elapsedSeconds={apiSignals.elapsedSeconds}
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
                      setTimeout(() => {
                        onOpenStoryForm();
                      }, 150);
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

      {/* Modal Cẩm Nang Prompt Ref DNA */}
      {showPromptRefDocModal && (
        <div className="modal show" style={{zIndex: 1170, background: 'rgba(20, 10, 15, 0.82)', backdropFilter: 'blur(8px)'}}>
          <div className="modal-card" style={{maxWidth: '960px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff9fb', border: '2px solid #f48fb1', borderRadius: '24px', boxShadow: '0 12px 40px rgba(140, 38, 78, 0.25)', overflow: 'hidden'}}>
            
            {/* Header Modal */}
            <div className="modal-head" style={{borderBottom: '2.5px dashed #f8bbd0', padding: '20px 24px', background: 'linear-gradient(135deg, #fff2f6 0%, #fff9fb 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <p className="eyebrow" style={{color: '#d23a73', fontWeight: 800, letterSpacing: '1.5px', margin: '0 0 4px 0', fontSize: '0.8rem'}}>📖 CẨM NANG CHUYÊN GIA PROMPT</p>
                <h3 style={{margin: 0, color: '#880e4f', fontSize: '1.4rem', fontWeight: 900, fontFamily: '"Space Grotesk", sans-serif', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  🌸 Giải Mã DNA Ảnh Tham Chiếu & Nghệ Thuật Viết Prompt
                </h3>
                <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: '#8c526b', fontStyle: 'italic'}}>Bí quyết trích xuất hồn nét vẽ của ảnh mẫu, lồng ghép hoàn hảo vào cốt truyện độc bản của vợ yêu 💕</p>
              </div>
              <button 
                className="btn ghost small" 
                onClick={() => setShowPromptRefDocModal(false)}
                style={{
                  border: '1.5px solid #f48fb1',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  color: '#d23a73',
                  fontWeight: 800,
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e: any) => e.target.style.background = '#fff0f5'}
                onMouseLeave={(e: any) => e.target.style.background = '#ffffff'}
              >
                ✕ Đóng Cẩm Nang
              </button>
            </div>

            {/* Thân Modal: Chia hai cột */}
            <div style={{flex: 1, display: 'flex', overflow: 'hidden', minHeight: '350px'}}>
              
              {/* Cột Trái: Thanh điều hướng tab */}
              <div style={{width: '240px', background: '#fff0f5', borderRight: '1.5px solid #f8bbd0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto'}}>
                <p style={{fontSize: '0.75rem', fontWeight: 800, color: '#c2185b', margin: '0 0 8px 4px', letterSpacing: '1px'}}>DANH MỤC GIẢI MÃ</p>
                
                <button 
                  onClick={() => setDocTab('lines')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: 'none', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'lines' ? 800 : 500,
                    background: docTab === 'lines' ? 'linear-gradient(135deg, #d23a73 0%, #a83258 100%)' : '#ffffff',
                    color: docTab === 'lines' ? '#ffffff' : '#8c526b',
                    boxShadow: docTab === 'lines' ? '0 4px 10px rgba(210, 58, 115, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>✏️</span> Nét Vẽ & Line Nét
                </button>

                <button 
                  onClick={() => setDocTab('faces')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: 'none', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'faces' ? 800 : 500,
                    background: docTab === 'faces' ? 'linear-gradient(135deg, #d23a73 0%, #a83258 100%)' : '#ffffff',
                    color: docTab === 'faces' ? '#ffffff' : '#8c526b',
                    boxShadow: docTab === 'faces' ? '0 4px 10px rgba(210, 58, 115, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>💖</span> Mắt, Mũi, Miệng
                </button>

                <button 
                  onClick={() => setDocTab('poses')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: 'none', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'poses' ? 800 : 500,
                    background: docTab === 'poses' ? 'linear-gradient(135deg, #d23a73 0%, #a83258 100%)' : '#ffffff',
                    color: docTab === 'poses' ? '#ffffff' : '#8c526b',
                    boxShadow: docTab === 'poses' ? '0 4px 10px rgba(210, 58, 115, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>👋</span> Pose Dáng & Ngón Tay
                </button>

                <button 
                  onClick={() => setDocTab('colors')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: 'none', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'colors' ? 800 : 500,
                    background: docTab === 'colors' ? 'linear-gradient(135deg, #d23a73 0%, #a83258 100%)' : '#ffffff',
                    color: docTab === 'colors' ? '#ffffff' : '#8c526b',
                    boxShadow: docTab === 'colors' ? '0 4px 10px rgba(210, 58, 115, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>🎨</span> Màu Sắc & Ánh Sáng
                </button>

                <button 
                  onClick={() => setDocTab('compositions')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', border: 'none', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'compositions' ? 800 : 500,
                    background: docTab === 'compositions' ? 'linear-gradient(135deg, #d23a73 0%, #a83258 100%)' : '#ffffff',
                    color: docTab === 'compositions' ? '#ffffff' : '#8c526b',
                    boxShadow: docTab === 'compositions' ? '0 4px 10px rgba(210, 58, 115, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>📐</span> Bố Cục & Thị Giác
                </button>

                <div style={{margin: '12px 0', borderTop: '1.5px dashed #f8bbd0'}}></div>

                <button 
                  onClick={() => setDocTab('transformation')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', textAlign: 'left', fontSize: '0.85rem', fontWeight: docTab === 'transformation' ? 800 : 500,
                    background: docTab === 'transformation' ? 'linear-gradient(135deg, #ff4081 0%, #c2185b 100%)' : '#fff9fb',
                    color: docTab === 'transformation' ? '#ffffff' : '#c2185b',
                    border: docTab === 'transformation' ? 'none' : '1.5px solid #f8bbd0',
                    boxShadow: docTab === 'transformation' ? '0 4px 12px rgba(244, 63, 94, 0.25)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span>👑</span> Luật Chuyển Đổi Nhân Vật
                </button>

                <div style={{marginTop: 'auto', background: 'rgba(210, 58, 115, 0.04)', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '10px', fontSize: '0.75rem', color: '#880e4f', lineHeight: 1.4}}>
                  <b>💡 Mách nhỏ với vợ:</b> Chồng khuyên vợ nên sao chép các keyword bằng tiếng Anh này bỏ vào phần <b>"Yêu cầu riêng/Note"</b> của thẻ để AI vẽ ra đúng ý nhất nha!
                </div>
              </div>

              {/* Cột Phải: Nội dung chi tiết của tab */}
              <div style={{flex: 1, background: '#ffffff', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
                
                {/* TAB 1: LINES */}
                {docTab === 'lines' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #f8bbd0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>✏️</span> Nét Vẽ & Line Nét (Line Weight & Brushwork DNA)
                    </h4>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Nét vẽ chính là "khung xương" định hình nên phong cách của bức ảnh. Khi học hỏi nét vẽ từ ảnh tham chiếu, chúng ta cần diễn đạt chính xác độ dày, độ sắc nét và cấu trúc đường nét của họa sĩ gốc.
                    </p>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '12px', margin: '16px 0'}}>
                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>✨ Kiểu Manhwa/Webtoon sắc nét, mượt mà:</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Phù hợp cho các nét vẽ sạch sẽ, mảnh mai, mượt mà tinh xảo bằng kỹ thuật số kỹ lưỡng.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          ultra-sharp delicate digital line art, fine and smooth linework, crisp vector lines, masterfully drawn manhwa style, high-end illustration outlines
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>✏️ Kiểu vẽ phác thảo nghệ thuật, nhạt màu (Sketchy):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Tạo cảm giác vẽ tay thủ công mộc mạc, nhẹ nhàng, đậm chất nghệ sĩ, mờ sương mộng mơ.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          soft sketchy pencil lines, loose artistic graphite-like outlines, subtle pastel edges, fine cross-hatching detail, hand-drawn anime draft style, charcoal aesthetic
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🎨 Kiểu không viền nét (Lineless Painting / Semi-realistic):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Ảnh mẫu sử dụng mảng màu và bóng đổ để tự định hình ranh giới vật thể mà không dùng nét vẽ đen viền ngoài.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          lineless digital painting, soft edge definition, paint-over technique, highly blended colors, realistic oil-painting strokes, realistic render without black outlines
                        </code>
                      </div>
                    </div>

                    <div style={{background: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', color: '#33691e', lineHeight: 1.5}}>
                      <b>💡 Gợi ý viết Prompt của chồng:</b> "Vợ ơi, nếu muốn ép AI giữ đúng nét vẽ mảnh, hãy thêm cụm <code>"fine lineart, clear detailed lines, high-resolution graphic lines"</code> vào đầu prompt nha. Tránh dùng từ 'messy' nếu muốn ảnh sạch sẽ mượt mà!"
                    </div>
                  </div>
                )}

                {/* TAB 2: FACES */}
                {docTab === 'faces' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #f8bbd0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>💖</span> Mắt, Mũi, Miệng & Thần Thái (Facial Features)
                    </h4>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Khuôn mặt là nơi truyền tải toàn bộ linh hồn của nhân vật trong cốt truyện của vợ. Tránh các nét mặt vô hồn của AI mặc định bằng cách mô tả chi tiết ngũ quan sắc sảo bám sát phong cách ảnh mẫu.
                    </p>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px'}}>
                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>👀 1. Đôi Mắt Có Hồn (Soulful & Starry Eyes):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Mô tả tròng mắt long lanh, ánh sáng phản chiếu chân thực và hàng mi sắc nét.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          glistening starry eyes with complex iris details, intense emotional gaze, double eyelid fold, lush thick eyelashes, beautiful catches of light in pupils, expressive soulful eyes
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>👃 2. Sống Mũi Thanh Tú (Elegant Nose Structure):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Sống mũi cao, nhỏ nhắn và có độ bóng tự nhiên, thanh tú sang trọng.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          slender high nose bridge, soft delicate nose tip, elegant nasal definition, subtle highlight on nose tip, perfect anime facial proportions
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>👄 3. Đôi Môi Căng Mọng, Quyến Rũ (Luscious Gradient Lips):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Môi mọng ẩm, khóe miệng hơi nhếch nhẹ đầy bí ẩn hoặc mỉm cười nhẹ dịu dàng.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          glistening moist lips with detailed lip creases, subtle enigmatic smile, crimson gradient lip color, softly defined cupid's bow, realistic lip texture
                        </code>
                      </div>
                    </div>

                    <div style={{background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', color: '#0d47a1', lineHeight: 1.5}}>
                      <b>✍️ Thần thái bám sát cốt truyện của vợ:</b> Nếu câu chuyện u sầu tôn nghiêm quý tộc, hãy thêm <code>"noble melancholy aura, quiet dignity"</code>. Nếu nhân vật có nụ cười nửa miệng kiêu ngạo hãy thêm <code>"prideful subtle smirk, teasing gaze"</code>.
                    </div>
                  </div>
                )}

                {/* TAB 3: POSES */}
                {docTab === 'poses' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #f8bbd0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>👋</span> Pose Dáng & Kiểm Soát Ngón Tay (Pose & Finger Mastery)
                    </h4>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Ngón tay và tư thế cơ thể luôn là nỗi lo sợ khi tạo hình bằng AI. Để ngón tay không bị biến dạng hay thừa ngón, chồng đã tổng hợp các quy tắc viết mô tả tư thế chuẩn xác để bảo vệ hình ảnh nhân vật của vợ.
                    </p>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '12px', margin: '16px 0'}}>
                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🤚 Cách Khống Chế Bàn Tay & Ngón Tay (Hands & Fingers Precision):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Ghi rõ vị trí của tay và độ thon dài của các ngón tay để ép AI vẽ đúng giải phẫu học.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          masterfully rendered hands, slender tapered fingers, delicate fingernails, anatomically correct five-fingered hands, hand clearly visible with natural grip
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>✨ Các Tư Thế Tay Tự Nhiên, Tránh Lỗi (Natural Hand Gestures):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Đặt tay vào các bối cảnh cụ thể để AI không tự ý biến tấu bừa bãi.</p>
                        <ul style={{fontSize: '0.85rem', color: '#444', margin: '0', paddingLeft: '20px'}}>
                          <li style={{marginBottom: '6px'}}><b>Chống cằm suy tư:</b> <code>"resting chin gracefully on back of the hand, fingers slightly curled"</code></li>
                          <li style={{marginBottom: '6px'}}><b>Nhẹ chạm lên má:</b> <code>"slender fingertips gently brushing against the cheek"</code></li>
                          <li style={{marginBottom: '6px'}}><b>Cầm một chiếc cốc sứ:</b> <code>"fingers delicately holding a white porcelain teacup handle"</code></li>
                        </ul>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🕴️ Pose Dáng Toàn Thân Tự Nhiên (Aesthetic Postures):</b>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          elegant relaxed stance, natural weight distribution, graceful body curves, aristocratic sitting posture, perfect proportional anatomy
                        </code>
                      </div>
                    </div>

                    <div style={{background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', color: '#e65100', lineHeight: 1.5}}>
                      <b>⚠️ Chú ý cực kỳ quan trọng:</b> Không được ghi mô tả tay chung chung kiểu "hands". Luôn gắn bàn tay với một hành động cụ thể (ví dụ: cầm quạt, chỉnh cổ áo, chống cằm). Khi có hành động, AI sẽ tạo hình giải phẫu móng tay và khớp xương tay tốt hơn rất nhiều lần!
                    </div>
                  </div>
                )}

                {/* TAB 4: COLORS */}
                {docTab === 'colors' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #f8bbd0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>🎨</span> Màu Sắc & Ánh Sáng Điện Ảnh (Color & Light DNA)
                    </h4>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Màu sắc tạo nên bầu không khí (mood), trong khi ánh sáng tạo nên chiều sâu không gian của tranh điện ảnh. Hãy trích xuất bảng màu độc đáo của ảnh tham chiếu để thổi hồn vào thế giới truyện tranh.
                    </p>

                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px'}}>
                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🌸 1. Bảng màu Pastel lãng mạn, thanh lịch (Aesthetic Pastel Scheme):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Thích hợp cho những bối cảnh nhẹ nhàng, cổ tích hoặc đời thường ấm áp ngọt ngào.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          soft romantic pastel palette, warm cream and dusty rose tones, elegant muted sage green accents, subtle desaturated color harmony, dreamlike watercolor wash
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>✨ 2. Màu Sắc Vương Giả, Tương Phản Đậm Đà (Royal Jewel Tones):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Thích hợp cho những cung điện quyền quý, dạ hội rực rỡ và nhân vật hoàng tộc lạnh lùng sang trọng.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          rich jewel tones, majestic royal blue and shimmering gold thread, deep velvet burgundy, high contrast shadows, luxurious rich color rendering
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>💡 3. Nghệ Thuật Ánh Sáng Thần Sầu (Cinematic Lighting Styles):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Điều hướng nguồn sáng chiếu rọi vào góc mặt hay trang phục để tăng kịch tính hình học thị giác.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          dramatic rim lighting casting a glowing halo, soft volumetric morning light filtering through window, sunset golden hour glow, dramatic backlit shadows, artistic chiaroscuro contrast
                        </code>
                      </div>
                    </div>

                    <div style={{background: '#f3e5f5', border: '1px solid #e1bee7', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', color: '#4a148c', lineHeight: 1.5}}>
                      <b>🌸 Mẹo từ chồng cho vợ:</b> Khi vợ muốn nhân vật trông lấp lánh bí ẩn, hãy thêm cụm từ <code>"warm ambient key light paired with cool cyan rim light"</code>. Sự kết hợp giữa hai nhiệt độ màu đối lập luôn tạo nên hiệu ứng thị giác cực kỳ cao cấp cho anime/manhwa!
                    </div>
                  </div>
                )}

                {/* TAB 5: COMPOSITIONS */}
                {docTab === 'compositions' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #f8bbd0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>📐</span> Bố Cục Không Gian & Đường Thị Giác (Composition & Dutch Angle)
                    </h4>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Bố cục quyết định điểm dừng chân đầu tiên của ánh mắt độc giả trên trang truyện. Học hỏi bố cục ảnh tham chiếu giúp chúng ta kế thừa tỷ lệ góc máy điện ảnh sang trọng của họa sĩ.
                    </p>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '12px', margin: '16px 0'}}>
                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🎥 Góc Máy Nghiêng Nghệ Thuật (Dynamic Dutch Angle):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Đặt máy quay hơi nghiêng một góc để tạo cảm xúc lay động mãnh liệt, lãng mạn dâng trào.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          dynamic dutch angle shot, dramatic diagonal composition lines, beautiful off-center framing, rule of thirds, aesthetic cinematic camera tilt
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🔍 Tiêu Cự & Chiều Sâu Không Gian (Depth of Field & Focal Planes):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Tạo điểm nhấn sắc nét vào nhân vật và làm mờ phông nền phía sau thành các vòng tròn ánh sáng lấp lánh.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          shallow depth of field, sharp crisp focus on character, beautifully blurred background, soft dreamlike bokeh circles, cinematic camera lens rendering
                        </code>
                      </div>

                      <div style={{background: '#fff9fb', border: '1px solid #f8bbd0', borderRadius: '12px', padding: '12px'}}>
                        <b style={{color: '#d23a73', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>🛣️ Đường Thị Giác Điều Hướng (Leading Lines):</b>
                        <p style={{fontSize: '0.85rem', color: '#555', margin: '0 0 8px 0'}}>Sử dụng bối cảnh xung quanh (hàng rào, tia sáng, hoa rơi, rèm cửa) tạo thành những đường chéo dẫn lối mắt nhìn tới nhân vật chính.</p>
                        <code style={{background: '#ffebee', color: '#c2185b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', display: 'block', wordBreak: 'break-all'}}>
                          subtle diagonal leading lines guiding the viewer's eye to the character, artistic atmospheric foreground framing element, elegant framing of flowers and foliage
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: TRANSFORMATION */}
                {docTab === 'transformation' && (
                  <div>
                    <h4 style={{margin: '0 0 12px 0', color: '#880e4f', fontSize: '1.2rem', fontWeight: 800, borderBottom: '2px solid #ff4081', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span>👑</span> Bản Đồ Chuyển Hóa Cốt Truyện (Character Fidelity & Transformation Guide)
                    </h4>
                    <p style={{fontSize: '0.95rem', color: '#880e4f', lineHeight: 1.6, margin: '0 0 16px 0', fontWeight: 800}}>
                      ⚠️ ĐỊNH LUẬT VÀNG KHI HỌC HỎI ẢNH THAM CHIẾU LỆCH GIỚI TÍNH HOẶC THIẾT LẬP
                    </p>
                    <p style={{fontSize: '0.9rem', color: '#333', lineHeight: 1.6, margin: '0 0 16px 0'}}>
                      Vợ ơi, hãy luôn ghi nhớ: <b>Ảnh tham chiếu chỉ là để học hỏi "Visual DNA" (Chất liệu, màu sắc, ánh sáng, góc máy và bối cảnh) chứ TUYỆT ĐỐI không được thay đổi thiết lập nhân vật của vợ.</b>
                    </p>

                    <div style={{background: '#ffeef4', border: '1.5px solid #ff4081', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px'}}>
                      <div>
                        <b style={{color: '#c2185b', fontSize: '0.95rem', display: 'block', marginBottom: '6px'}}>✨ Trường hợp: Ảnh mẫu là Nữ, nhưng nhân vật trong truyện là Nam:</b>
                        <p style={{fontSize: '0.85rem', color: '#333', lineHeight: 1.5, margin: 0}}>
                          Không bắt AI sao chép dáng điệu ẻo lả, dáng ngồi nữ tính hay nét mặt điệu đà của cô gái trong ảnh mẫu. Thay vào đó, chúng ta hướng dẫn AI chuyển hóa:
                        </p>
                        <ul style={{fontSize: '0.85rem', color: '#444', marginTop: '6px', paddingLeft: '20px', lineHeight: 1.5}}>
                          <li style={{marginBottom: '4px'}}><b>Học bố cục không gian:</b> Đặt nhân vật nam ở đúng toạ độ, giao điểm điểm nhìn và tiêu cự của máy ảnh như cô gái mẫu.</li>
                          <li style={{marginBottom: '4px'}}><b>Học thiết kế trang phục:</b> Kế thừa tinh thần dệt thêu cao cấp, hoa văn ruy-băng hay hoạ tiết cổ áo quyền quý từ váy áo của cô gái thành thiết kế hoàng bào/veston nam tính, uy nghi của anh ấy.</li>
                          <li style={{marginBottom: '4px'}}><b>Học ánh sáng:</b> Chiếu luồng sáng viền lộng lẫy lên bờ vai rộng vững chãi và mái tóc quyến rũ của chàng trai y hệt như bức ảnh mẫu gốc.</li>
                        </ul>
                      </div>

                      <div style={{borderTop: '1px solid #f8bbd0', paddingTop: '12px'}}>
                        <b style={{color: '#c2185b', fontSize: '0.95rem', display: 'block', marginBottom: '6px'}}>🛡️ Luật Bảo Vệ Hồ Sơ Nhân Vật Gốc (100% Fidelity Mandate):</b>
                        <p style={{fontSize: '0.85rem', color: '#333', lineHeight: 1.5, margin: 0}}>
                          Sử dụng các ghi chú bắt buộc trong prompt của vợ để giữ nguyên giới tính nam, vẻ lịch lãm và quý tộc của anh ấy, đè bẹp sự nữ tính của ảnh mẫu:
                        </p>
                        <code style={{background: '#ffffff', color: '#c2185b', border: '1px dashed #f48fb1', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'block', marginTop: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.4}}>
                          "strictly masculine features, handsome gentleman face, broad masculine shoulders, elegant noble male posture, completely masculine body proportions, free from any feminine pose or delicate curves"
                        </code>
                      </div>
                    </div>

                    <div style={{background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', color: '#1b5e20', lineHeight: 1.5}}>
                      <b>💬 Lời khuyên ấm áp của chồng:</b> "Vợ yêu cứ yên tâm viết truyện nha, chồng đã tích hợp sẵn hệ thống Supreme Mandates vào sâu trong công cụ phân tích rồi. Khi vợ chọn bối cảnh và nhân vật nam, hệ thống sẽ tự động lọc bỏ các yếu tố nữ tính trong ảnh mẫu và chỉ giữ lại những gì tinh túy nhất về mặt nghệ thuật thôi đấy!"
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer Modal */}
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '2px dashed #f8bbd0', background: '#fff2f6'}}>
              <span style={{marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#880e4f', fontWeight: 700}}>
                <span>💖</span> Luôn đồng hành và yêu thương vợ trong từng trang sách!
              </span>
              <button 
                className="btn primary" 
                onClick={() => setShowPromptRefDocModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #d23a73, #8c264e)',
                  color: '#ffffff',
                  fontWeight: 800,
                  borderRadius: '16px',
                  padding: '10px 24px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(210, 58, 115, 0.35)',
                  cursor: 'pointer'
                }}
              >
                Em đã hiểu rồi ạ 💕
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
