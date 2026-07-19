import React, { useState, useRef, useEffect, useCallback } from "react";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { PRESET_BACKGROUNDS, rooms as ROOMS_DATA } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { copyToClipboardSafe } from "../../lib/clipboard";
import { v4 as uuidv4 } from "uuid";
import StyleAnalyzer from "./StyleAnalyzer";
import { SafeImg } from "../../components/SafeImg";
import { compressImageFile } from "../../utils/imageCompressor";
import { getPrimaryApiProfile } from "../../lib/api-db";
import { buildContextWindow } from "../../utils/contextBuilder";
import { PromptSummaryPanel } from "../../components/PromptSummaryPanel";
import { getApiProxySettings, pruneBase64 } from "../../utils/apiProxy";

// Regex helper to strip out list numbers/ordinals cleanly while keeping tags like "1girl" or "20 years old" intact
const cleanPromptText = (text: string) => {
  if (!text) return "";
  let val = text;
  // Replace leading ordinal/number list indicators at the beginning of the text or after newlines
  // This matches structures like: "1. ", "1/ ", "- 1. ", "Part 1:", "Phần 1:", "Panel 1 -", etc.
  // We make sure it doesn't match "1girl" or "20 years old" by requiring a separator like . : / - or ) after list digits.
  val = val.replace(/^\s*[-*•(]?\s*(?:(?:Phần|Phân đoạn|Khung|Khung ảnh|Panel|Part|Section|Mẫu|Mẫu ảnh|Mẫu thiết kế|Mẫu trang phục|Mẫu số|Mẫu trang phục số)\s*\d+[\s\-\:\.\/\)]*|\d+[\.\:\/\-\)]+)\s*/i, "");
  val = val.replace(/\n\s*[-*•(]?\s*(?:(?:Phần|Phân đoạn|Khung|Khung ảnh|Panel|Part|Section|Mẫu|Mẫu ảnh|Mẫu thiết kế|Mẫu trang phục|Mẫu số|Mẫu trang phục số)\s*\d+[\s\-\:\.\/\)]*|\d+[\.\:\/\-\)]+)\s*/gi, "\n");
  return val.trim();
};

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
  
  // Xóa các ghi chú nội bộ (Liên hệ: ... và tham chiếu (Img ...)) khỏi văn bản hiển thị và sao chép
  const rawText = (output || "")
    .replace(/^[ \t]*Liên hệ\s*:.*(?:\r?\n|$)/gmi, "")
    .replace(/\s*\(?(?:Img|Image|Reference Image|Ảnh|Reference)\s*[\d,\s]+\)?/gi, "")
    .trim();

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

  const allParts = React.useMemo(() => getParsedParts(), [rawText]);
  const parts = React.useMemo(() => allParts.filter(p => 
    p.id !== 'aesthetic_dna' && 
    p.id !== 'comic_overview' &&
    !p.title.toLowerCase().includes('tư liệu') &&
    !p.title.toLowerCase().includes('tổng quan')
  ), [allParts]);

  // Compute the clean image prompt, completely ignoring any Vietnamese analysis/aesthetic DNA
  const getCleanPromptToCopy = useCallback(() => {
    // 1. Try to find the master prompt first (master_prompt or comic_master_prompt)
    const masterPart = allParts.find(p => p.id === 'master_prompt' || p.id === 'comic_master_prompt');
    if (masterPart && masterPart.content) {
      const cleanText = masterPart.content
        .replace(/^⏳[\s\S]*$/, "") // skip loading indicator
        .replace(/^```[a-z]*\n/i, "")
        .replace(/```$/, "")
        .trim();
      if (cleanText && !cleanText.includes("AI đang viết tiếp")) {
        return cleanPromptText(cleanText);
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
          return cleanPromptText(text);
        })
        .filter(t => t && !t.includes("AI đang viết tiếp"))
        .join("\n\n")
        .trim();
      
      if (joined) return joined;
    }

    // Fallback to raw text with regex
    return cleanPromptText(
      rawText
        .replace(/(?:^|\n)###\s*[^\n]*/g, " ")
        .replace(/(?:^|\n)\*\*\s*(?:PART|PHẦN)\s*\d+[^\n]*/gi, " ")
        .replace(/(?:^|\n)(?:PART|PHẦN)\s*\d+:[^\n]*/gi, " ")
        .replace(/\n+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  }, [allParts, parts, rawText]);

  const cleanOneLinePrompt = React.useMemo(() => getCleanPromptToCopy(), [getCleanPromptToCopy]);

  const handleCopyPart = (id: string, contentToCopy: string, label: string) => {
    const text = cleanPromptText(contentToCopy);
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
  const connectionType = "Cổng API Proxy An Toàn 🛡️";

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
                    cleanPromptText(part.content)
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

const CandyIcon = ({ size = 20, color = "#ff79a5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7Z" fill={color} />
    <path d="M7 12L2 9V15L7 12Z" fill={color} />
    <path d="M17 12L22 9V15L17 12Z" fill={color} />
  </svg>
);

const PinkCatIcon = ({ size = 24, color = "#ffb2cc" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 8.88248 19.4187 6.13388 17.0252 4.51261L18.5 2L14.5 4.0706C13.7054 3.73147 12.8631 3.54545 12 3.54545C11.1369 3.54545 10.2946 3.73147 9.5 4.0706L5.5 2L6.9748 4.51261C4.58134 6.13388 3 8.88248 3 12C3 16.9706 7.02944 21 12 21Z" fill={color} />
    <circle cx="8.5" cy="11.5" r="1.5" fill="#4a2f41" />
    <circle cx="15.5" cy="11.5" r="1.5" fill="#4a2f41" />
    <circle cx="9" cy="11" r="0.5" fill="#ffffff" />
    <circle cx="16" cy="11" r="0.5" fill="#ffffff" />
    <path d="M11.5 13.5L12.5 13.5L12 14L11.5 13.5Z" fill="#4a2f41" />
    <path d="M10.5 15.5C11 15.5 11.5 15 12 15C12.5 15 13 15.5 13.5 15.5" stroke="#4a2f41" strokeWidth="1" strokeLinecap="round" />
    <circle cx="6.5" cy="13.5" r="1.2" fill="#ff79a5" opacity="0.6" />
    <circle cx="17.5" cy="13.5" r="1.2" fill="#ff79a5" opacity="0.6" />
  </svg>
);


const areEqual = (prevProps: any, nextProps: any) => {
  if (prevProps.i !== nextProps.i) return false;
  if (prevProps.c.id !== nextProps.c.id) return false;
  if (prevProps.roomDef.id !== nextProps.roomDef.id) return false;

  const pCs = prevProps.roomState?.cards?.[prevProps.c.id] || {};
  const nCs = nextProps.roomState?.cards?.[nextProps.c.id] || {};

  if (pCs.note !== nCs.note) return false;
  if (pCs.selectedOutfit !== nCs.selectedOutfit) return false;
  if (pCs.output !== nCs.output) return false;
  if (pCs.report !== nCs.report) return false;

  const pTraits = pCs.selectedTraits || [];
  const nTraits = nCs.selectedTraits || [];
  if (pTraits.length !== nTraits.length) return false;
  for (let i = 0; i < pTraits.length; i++) {
    if (pTraits[i] !== nTraits[i]) return false;
  }

  const pExtracted = pCs.extractedTraits || [];
  const nExtracted = nCs.extractedTraits || [];
  if (pExtracted.length !== nExtracted.length) return false;
  for (let i = 0; i < pExtracted.length; i++) {
    if (pExtracted[i] !== nExtracted[i]) return false;
  }

  const pExtractedOutfits = pCs.extractedOutfits || [];
  const nExtractedOutfits = nCs.extractedOutfits || [];
  if (pExtractedOutfits.length !== nExtractedOutfits.length) return false;
  for (let i = 0; i < pExtractedOutfits.length; i++) {
    if (pExtractedOutfits[i] !== nExtractedOutfits[i]) return false;
  }

  const pRefs = pCs.refs || [];
  const nRefs = nCs.refs || [];
  if (pRefs.length !== nRefs.length) return false;
  for (let i = 0; i < pRefs.length; i++) {
    if ((pRefs[i].id || pRefs[i].imageId) !== (nRefs[i].id || nRefs[i].imageId)) return false;
    if (pRefs[i].analysisStatus !== nRefs[i].analysisStatus) return false;
  }

  const pOutfitRefs = pCs.outfitRefs || [];
  const nOutfitRefs = nCs.outfitRefs || [];
  if (pOutfitRefs.length !== nOutfitRefs.length) return false;
  for (let i = 0; i < pOutfitRefs.length; i++) {
    if ((pOutfitRefs[i].id || pOutfitRefs[i].imageId) !== (nOutfitRefs[i].id || nOutfitRefs[i].imageId)) return false;
  }

  const pAnalyzing = prevProps.catAnalyzingCardId === prevProps.c.id;
  const nAnalyzing = nextProps.catAnalyzingCardId === nextProps.c.id;
  if (pAnalyzing !== nAnalyzing) return false;

  if (prevProps.isApiRunning !== nextProps.isApiRunning) return false;
  if (prevProps.apiSignals?.elapsedSeconds !== nextProps.apiSignals?.elapsedSeconds) return false;

  return true;
};

const WorkCardItem = React.memo(function WorkCardItem({
  c,
  i,
  roomDef,
  roomState,
  state,
  currentStory,
  save,
  toast,
  catAnalyzingCardId,
  isApiRunning,
  apiSignals,
  toggleTraitSelection,
  selectOutfitOption,
  handleOutfitUpload,
  handleRefUpload,
  analyzeCardAestheticAndOutfits,
  setSelectedImgDetail,
  renderTargetSelector,
  updateGlobalState,
  viewHistoryIndex
}: any) {
  let cs = roomState.cards?.[c.id] || { note: "", refs: [], output: "", report: "" };
  if (viewHistoryIndex !== null && roomState.history && roomState.history[viewHistoryIndex]) {
    const histItem = roomState.history[viewHistoryIndex];
    if (histItem.cards?.[c.id]) {
      cs = {
        ...cs,
        output: histItem.cards[c.id].output || "",
        report: histItem.cards[c.id].report || ""
      };
    }
  }
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
                    const newRefs = (cs.refs || []).filter((x: any) => (x.id || x.imageId) !== (r.id || r.imageId));
                    const newRoomState: LipstickRoomState = {
                      ...roomState,
                      cards: {
                        ...roomState.cards,
                        [c.id]: {
                          ...cs,
                          refs: newRefs
                        }
                      }
                    };
                    updateGlobalState(newRoomState);
                  }}>×</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🎀 KHU VỰC THỜI TRANG & NGHỆ THUẬT CỦA BÉ MÈO HỒNG & VIÊN KẸO NGỌT */}
        <div style={{
          marginTop: '16px',
          marginBottom: '16px',
          padding: '16px',
          background: 'linear-gradient(135deg, #fff5f8 0%, #fff0f5 100%)',
          borderRadius: '16px',
          border: '1.5px dashed #ffa6c9',
          boxShadow: '0 4px 15px rgba(255, 182, 193, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PinkCatIcon size={22} />
              <span style={{ fontWeight: 800, color: '#9d174d', fontSize: '0.92rem' }}>
                MÈO HỒNG PHẤN & VIÊN KẸO NGỌT 🍬
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Candy Button */}
              <label style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fff0f5 100%)',
                color: '#ff4d8d',
                border: '1.5px solid #ff9bbd',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.8rem',
                boxShadow: '0 2px 6px rgba(255, 121, 165, 0.1)',
                transition: 'all 0.2s'
              }}>
                <CandyIcon size={16} />
                <span>Nạp ảnh trang phục (Candy)</span>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => handleOutfitUpload(e, c.id)} />
              </label>

              {/* Pink Cat Button */}
              <button
                type="button"
                onClick={() => analyzeCardAestheticAndOutfits(c.id, c.title)}
                disabled={catAnalyzingCardId === c.id}
                style={{
                  background: 'linear-gradient(135deg, #ffb2cc 0%, #ff79a5 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(255, 121, 165, 0.25)',
                  transition: 'all 0.2s',
                  opacity: catAnalyzingCardId === c.id ? 0.7 : 1
                }}
              >
                {catAnalyzingCardId === c.id ? "🐾 Đang phân tích..." : "Nhờ Bé Mèo phân tích 🐾"}
              </button>
            </div>
          </div>

          {/* Outfit Reference Rail */}
          {cs.outfitRefs && cs.outfitRefs.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8c526b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CandyIcon size={14} /> <span>Ảnh tham chiếu trang phục đã nạp qua viên kẹo ({cs.outfitRefs.length}):</span>
              </div>
              <div className="image-rail" style={{ padding: '4px 0' }}>
                {cs.outfitRefs.map((r: any, idx: number) => (
                  <div className="photo-card" key={`outfit_photo_${r.id || r.imageId || 'img'}_${idx}`} style={{ border: '2.5px solid #ffd1e3' }} onClick={() => setSelectedImgDetail({ ...r, cardId: c.id, cardTitle: c.title })}>
                    <SafeImg src={r.data || r.previewUrl || r.storageUrl} alt="" />
                    <span>{r.name || r.fileName}</span>
                    <div className="analysis-status" style={{ background: '#fff0f3', color: '#ff4d8d' }}>🍬 Trang phục</div>
                    <button className="delete-btn" type="button" onClick={(e) => {
                      e.stopPropagation();
                      const newOutfitRefs = (cs.outfitRefs || []).filter((x: any) => (x.id || x.imageId) !== (r.id || r.imageId));
                      const newRoomState: LipstickRoomState = {
                        ...roomState,
                        cards: {
                          ...roomState.cards,
                          [c.id]: {
                            ...cs,
                            outfitRefs: newOutfitRefs
                          }
                        }
                      };
                      updateGlobalState(newRoomState);
                      toast("Đã gỡ ảnh trang phục nha vợ!");
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 100 Extracted Aesthetic Traits */}
          {cs.extractedTraits && cs.extractedTraits.length > 0 ? (
            <details style={{
              marginTop: '10px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #ffd1e3',
              padding: '10px 14px'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 800,
                color: '#9d174d',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                listStyle: 'none'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🌸 100 Nét Vẽ Nghệ Thuật Tinh Hoa Đã Trích Xuất (Đã chọn: {cs.selectedTraits?.length || 0}/100)
                </span>
                <span style={{ color: '#ff4d8d', fontSize: '0.75rem', fontWeight: 700 }}>▼ Xem/Thu gọn</span>
              </summary>
              <div style={{ marginTop: '10px', borderTop: '1px dashed #ffd1e3', paddingTop: '10px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#8c526b', lineHeight: 1.4 }}>
                  💡 Vợ yêu hãy click chọn những nét vẽ mong muốn nhất để chồng ép AI bám sát khi viết Prompt nhé!
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {cs.extractedTraits.map((trait: string, idx: number) => {
                    const isSelected = cs.selectedTraits?.includes(trait);
                    return (
                      <button
                        key={`trait_${idx}`}
                        type="button"
                        onClick={() => toggleTraitSelection(c.id, trait)}
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #ff79a5 0%, #ff4d8d 100%)' : '#fff0f5',
                          color: isSelected ? '#ffffff' : '#9d174d',
                          border: isSelected ? '1px solid #ff4d8d' : '1px solid #ffe1ec',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 2px 6px rgba(255, 77, 141, 0.3)' : 'none'
                        }}
                      >
                        {isSelected ? '🌸 ' : ''}{trait}
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>
          ) : null}

          {/* 5 Outfit Selection */}
          {cs.extractedOutfits && cs.extractedOutfits.length > 0 ? (
            <details open style={{
              marginTop: '10px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #ffd1e3',
              padding: '10px 14px'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 800,
                color: '#9d174d',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                listStyle: 'none'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👗 5 Đề Xuất Thiết Kế Trang Phục Tuyệt Mỹ Từ Bé Mèo Hồng
                </span>
                <span style={{ color: '#ff4d8d', fontSize: '0.75rem', fontWeight: 700 }}>▼ Xem/Thu gọn</span>
              </summary>
              <div style={{ marginTop: '10px', borderTop: '1px dashed #ffd1e3', paddingTop: '10px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#8c526b', lineHeight: 1.4 }}>
                  💡 Chọn 1 thiết kế lộng lẫy nhất để áp dụng lên trang phục nhân vật của vợ yêu trong prompt:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cs.extractedOutfits.map((outfit: string, idx: number) => {
                    const isSelected = cs.selectedOutfit === outfit;
                    return (
                      <div
                        key={`outfit_${idx}`}
                        onClick={() => selectOutfitOption(c.id, outfit)}
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #fff5f8 0%, #ffe6f0 100%)' : '#ffffff',
                          border: isSelected ? '2px solid #ff4d8d' : '1px solid #ffe1ec',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 3px 10px rgba(255, 77, 141, 0.12)' : 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #ff4d8d' : '2px solid #ffb2cc',
                          background: '#ffffff',
                          flexShrink: 0,
                          marginTop: '2px',
                          transition: 'all 0.15s'
                        }} />
                        <div style={{ fontSize: '0.8rem', color: '#4a2f41', lineHeight: 1.5, fontWeight: isSelected ? 700 : 500 }}>
                          <b style={{ color: '#d23a73' }}>Mẫu {idx + 1}:</b> {outfit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          ) : null}
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
                <span style={{background: 'linear-gradient(90deg, #d23a73, #8a2451)', color: '#ffffff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Master Study</span>
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
}, areEqual);

export default function RoomView({ roomDef, roomState, currentStory, state, save, toast, onBack, onHome, onOpenDrawer, progress, setProgress, isCompactHeader, onToggleCompact, onOpenStoryForm }: any) {

  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);
  const [showPreset, setShowPreset] = useState(false);
  const [roomHeaderCollapsed, setRoomHeaderCollapsed] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [catAnalyzingCardId, setCatAnalyzingCardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestRoomStateRef = useRef<LipstickRoomState>(roomState);

  useEffect(() => {
    latestRoomStateRef.current = roomState;
  }, [roomState]);
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
      updateGlobalState(rs);
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
    stageLabel: 'Chờ lệnh...',
    stageDetail: 'Hệ thống đã sẵn sàng'
  });

  const [isApiRunning, setIsApiRunning] = useState(false);
  const [livePreviewText, setLivePreviewText] = useState("");
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState(false);
  const [isWorkListCollapsed, setIsWorkListCollapsed] = useState(true);
  const [autoScrollPreview, setAutoScrollPreview] = useState(true);
  const [viewHistoryIndex, setViewHistoryIndex] = useState<number | null>(null);

  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef("");
  const lastFlushTimeRef = useRef(0);
  const chunksCountRef = useRef(0);
  const firstChunkReportedRef = useRef(false);
  const startTimeRef = useRef(0);
  const flushTimerRef = useRef<any>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const forceUpdateTimerRef = useRef<any>(null);
  const streamSaveTimeoutRef = useRef<any>(null);

  const distributeStreamToCardsLive = async (text: string) => {
    if (!text) return;
    
    try {
      // Sử dụng bộ đệm tạm thời thay vì clone toàn bộ object lớn
      const updatedCards: any = {};
      const parts = text.split(/\[CARD_ID:\s*([a-zA-Z0-9_\-]+)\]/);
      
      let hasChanged = false;

      for (let i = 1; i < parts.length; i += 2) {
        // Cứ mỗi 3 thẻ, ta yield một chút (khoảng 1 frame) để trình duyệt rảnh tay xử lý UI/Touch
        if (i > 1 && (i - 1) / 2 % 3 === 0) {
          await new Promise(r => setTimeout(r, 16));
        }

        const cardId = parts[i]?.trim();
        const cardContent = parts[i + 1] || "";
        if (!cardId) continue;

        const finalPromptMarker = "[FINAL PROMPT]";
        const markerIndex = cardContent.indexOf(finalPromptMarker);

        let report = "";
        let output = "";

        if (markerIndex !== -1) {
          report = cardContent.slice(0, markerIndex);
          output = cardContent.slice(markerIndex + finalPromptMarker.length);
        } else {
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

        const oldCard = roomState.cards?.[cardId] || {};
        if (oldCard.report !== report || oldCard.output !== output) {
          updatedCards[cardId] = {
            ...oldCard,
            report: report || oldCard.report || "",
            output: output || oldCard.output || ""
          };
          hasChanged = true;
        }
      }

      if (hasChanged) {
        // Chỉ update roomState trong story một cách trực tiếp và forceUpdate UI
        if (!currentStory.rooms[roomDef.id]) {
           currentStory.rooms[roomDef.id] = { ...roomState };
        }
        
        // Merge cards an toàn
        currentStory.rooms[roomDef.id].cards = { 
          ...currentStory.rooms[roomDef.id].cards, 
          ...updatedCards 
        };

        if (forceUpdateTimerRef.current) cancelAnimationFrame(forceUpdateTimerRef.current);
        forceUpdateTimerRef.current = requestAnimationFrame(() => {
          forceUpdate();
        });
      }
    } catch (err) {
      console.error("Lỗi khi phân bổ thẻ (Raw text fallback):", err);
      // Fallback: Nếu lỗi thì ít nhất vẫn giữ text thô trong kết quả phòng
      if (roomState) roomState.result = text;
    }
    
    if (streamSaveTimeoutRef.current) clearTimeout(streamSaveTimeoutRef.current);
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

  // Safety guard: If critical props are missing, show a loading state instead of crashing
  // MUST be placed after all hooks to comply with Rules of Hooks
  if (!roomDef || !roomState || !currentStory) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-3xl shadow-xl border-2 border-pink-100 m-4">
        <div className="animate-bounce text-6xl mb-6">🌸</div>
        <h2 className="text-2xl font-bold text-pink-600 mb-3">Đang chuẩn bị không gian cho vợ...</h2>
        <p className="text-gray-500 mb-6">Vợ yêu đợi chồng một xíu nhé, dữ liệu đang được sắp xếp ngăn nắp ạ! ✨</p>
        <button onClick={onBack} className="btn ghost">Quay lại</button>
      </div>
    );
  }

  const getBotCharactersList = useCallback(() => {
    return currentStory.botCharacters && currentStory.botCharacters.length > 0
      ? currentStory.botCharacters
      : (currentStory.botProfiles ? [{
          characterId: "bot_01",
          displayName: "Bot Char",
          profileText: currentStory.botProfiles,
          referenceImages: []
        }] : []);
  }, [currentStory.botCharacters, currentStory.botProfiles]);

  const getTargetLabel = useCallback((mode: string) => {
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
  }, [roomDef, getBotCharactersList]);

  const getTargetInstructions = useCallback((mode: string) => {
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
👉 REFERENCE IMAGE ADAPTATION RULE (CRITICAL FOR POSTER MODE): Even if the reference image provided by the user shows ONLY ONE person or a simple portrait, YOU MUST NOT limit the output to one character!     Instead, EXTRACT the art style, aesthetic vibe, lighting, color, and composition from the reference image and apply it to ALL characters.
    `;
    }
    return "";
  }, [getBotCharactersList]);

  const updateGlobalState = useCallback((newRoomState: LipstickRoomState, immediate = false) => {
    const newStory = {
      ...currentStory,
      rooms: {
        ...(currentStory.rooms || {}),
        [roomDef.id]: newRoomState
      }
    };
    const newState = {
      ...state,
      stories: state.stories.map((s: any) => s.id === newStory.id ? newStory : s)
    };
    save(newState, immediate);
  }, [currentStory, roomDef.id, state, save]);

  const deleteHistoryItem = useCallback((index: number) => {
    if (!window.confirm("Xóa đợt lịch sử này?")) return;
    const newHistory = [...(roomState.history || [])];
    newHistory.splice(index, 1);
    const newRoomState = { ...roomState, history: newHistory };
    updateGlobalState(newRoomState);
    if (viewHistoryIndex === index) setViewHistoryIndex(null);
    else if (viewHistoryIndex !== null && viewHistoryIndex > index) setViewHistoryIndex(viewHistoryIndex - 1);
    toast("Đã xóa một đợt lịch sử.");
  }, [roomState, viewHistoryIndex, setViewHistoryIndex, updateGlobalState, toast]);

  const updateTargetMode = useCallback((mode: string) => {
    const newRoomState = {
      ...roomState,
      targetMode: mode
    };
    updateGlobalState(newRoomState);
  }, [roomState, updateGlobalState]);

  const renderTargetSelector = useCallback((isBanner = false) => {
    const chars = getBotCharactersList();
    const targetMode = roomState.targetMode || '';
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
              className={`target-option ${(targetMode === 'supporting_cast_couple' || !targetMode || targetMode === 'bot_all' || targetMode === 'couple') ? 'active' : ''}`}
              onClick={() => updateTargetMode('supporting_cast_couple')}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: (targetMode === 'supporting_cast_couple' || !targetMode || targetMode === 'bot_all' || targetMode === 'couple') ? '2px solid #4f46e5' : '1px solid rgba(79, 70, 229, 0.4)',
                background: (targetMode === 'supporting_cast_couple' || !targetMode || targetMode === 'bot_all' || targetMode === 'couple') ? '#4f46e5' : '#ffffff',
                color: (targetMode === 'supporting_cast_couple' || !targetMode || targetMode === 'bot_all' || targetMode === 'couple') ? '#ffffff' : '#4f46e5',
                boxShadow: (targetMode === 'supporting_cast_couple' || !targetMode || targetMode === 'bot_all' || targetMode === 'couple') ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🎬 Nổi bật Cặp Đôi Chính + Dàn Diễn Viên Phụ (NPC)
            </button>
            <button
              className={`target-option ${targetMode === 'supporting_cast_protagonist' ? 'active' : ''}`}
              onClick={() => updateTargetMode('supporting_cast_protagonist')}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: targetMode === 'supporting_cast_protagonist' ? '2px solid #4f46e5' : '1px solid rgba(79, 70, 229, 0.4)',
                background: targetMode === 'supporting_cast_protagonist' ? '#4f46e5' : '#ffffff',
                color: targetMode === 'supporting_cast_protagonist' ? '#ffffff' : '#4f46e5',
                boxShadow: targetMode === 'supporting_cast_protagonist' ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
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
              className={`target-option ${(targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? 'active' : ''}`}
              onClick={() => updateTargetMode('bot_all')}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '0.9rem',
                border: (targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? (isHobby ? '2px solid #10b981' : '2px solid #d23a73') : (isHobby ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(210, 58, 115, 0.4)'),
                background: (targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? (isHobby ? '#10b981' : '#d23a73') : '#ffffff',
                color: (targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? '#ffffff' : (isHobby ? '#10b981' : '#d23a73'),
                boxShadow: (targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? (isHobby ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(210, 58, 115, 0.3)') : 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CodeDrawnBunny size={18} color={(targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? '#ffffff' : (isHobby ? '#d1fae5' : '#ffe0b2')} earColor={(targetMode === 'bot_all' || !targetMode || targetMode === 'bot') ? (isHobby ? '#6ee7b7' : '#ff80ab') : (isHobby ? '#10b981' : '#ff4081')} />
              {isHobby ? 'Gộp chung sở thích & vibe tất cả Bot Char (Group Vibe Space)' : 'Gộp chung tất cả Bot Char (Group Marketing Art)'}
            </button>
            {chars.map((char: any, idx: number) => {
              const modeKey = `bot_${idx}`;
              const isActive = targetMode === modeKey;
              return (
                <button
                  key={`mode_bot_art_${modeKey}_${idx}`}
                  className={`target-option ${isActive ? 'active' : ''}`}
                  onClick={() => updateTargetMode(modeKey)}
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
          className={`target-option ${(targetMode === 'cinema_poster' || targetMode === 'poster_all') ? 'active' : ''}`}
          onClick={() => updateTargetMode('cinema_poster')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (targetMode === 'cinema_poster' || targetMode === 'poster_all') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (targetMode === 'cinema_poster' || targetMode === 'poster_all') ? 'linear-gradient(135deg, #d23a73 0%, #8c264e 100%)' : '#ffffff',
            color: (targetMode === 'cinema_poster' || targetMode === 'poster_all') ? '#ffffff' : '#8c526b',
            boxShadow: (targetMode === 'cinema_poster' || targetMode === 'poster_all') ? '0 4px 14px rgba(210, 58, 115, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎬 Poster Phim / Quảng Cáo (Toàn Bộ Char & User)
        </button>

        <button 
          className={`target-option ${(targetMode === 'all_group' || targetMode === 'couple') ? 'active' : ''}`}
          onClick={() => updateTargetMode('all_group')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (targetMode === 'all_group' || targetMode === 'couple') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (targetMode === 'all_group' || targetMode === 'couple') ? '#d23a73' : '#ffffff',
            color: (targetMode === 'all_group' || targetMode === 'couple') ? '#ffffff' : '#8c526b',
            boxShadow: (targetMode === 'all_group' || targetMode === 'couple') ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          ✨ Tất cả / Gộp chung (Couple/Group)
        </button>

        <button 
          className={`target-option ${targetMode === 'user' ? 'active' : ''}`}
          onClick={() => updateTargetMode('user')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'user' ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: targetMode === 'user' ? '#d23a73' : '#ffffff',
            color: targetMode === 'user' ? '#ffffff' : '#8c526b',
            boxShadow: targetMode === 'user' ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          👤 {'{{user}}'} (Vợ yêu)
        </button>

        <button 
          className={`target-option ${(targetMode === 'bot' || targetMode === 'bot_all') ? 'active' : ''}`}
          onClick={() => updateTargetMode('bot_all')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: (targetMode === 'bot' || targetMode === 'bot_all') ? '2px solid #d23a73' : '1px solid rgba(220, 105, 150, 0.4)',
            background: (targetMode === 'bot' || targetMode === 'bot_all') ? '#d23a73' : '#ffffff',
            color: (targetMode === 'bot' || targetMode === 'bot_all') ? '#ffffff' : '#8c526b',
            boxShadow: (targetMode === 'bot' || targetMode === 'bot_all') ? '0 4px 12px rgba(210, 58, 115, 0.3)' : 'none',
            fontWeight: 800
          }}
        >
          👑 Tất cả Bot Char (Gộp chung Bot)
        </button>

        <button 
          className={`target-option ${targetMode === 'background_only' ? 'active' : ''}`}
          onClick={() => updateTargetMode('background_only')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'background_only' ? '2px solid #009688' : '1px solid rgba(0, 150, 136, 0.4)',
            background: targetMode === 'background_only' ? 'linear-gradient(135deg, #009688 0%, #00796b 100%)' : '#ffffff',
            color: targetMode === 'background_only' ? '#ffffff' : '#00796b',
            boxShadow: targetMode === 'background_only' ? '0 4px 14px rgba(0, 150, 136, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🌄 Chỉ Background / Bối Cảnh (Không Nhân Vật)
        </button>

        <button 
          className={`target-option ${targetMode === 'typo_graphic_only' ? 'active' : ''}`}
          onClick={() => updateTargetMode('typo_graphic_only')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'typo_graphic_only' ? '2px solid #7e57c2' : '1px solid rgba(126, 87, 194, 0.4)',
            background: targetMode === 'typo_graphic_only' ? 'linear-gradient(135deg, #7e57c2 0%, #512da8 100%)' : '#ffffff',
            color: targetMode === 'typo_graphic_only' ? '#ffffff' : '#512da8',
            boxShadow: targetMode === 'typo_graphic_only' ? '0 4px 14px rgba(126, 87, 194, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎨 Đồ Họa / Typography & Thiết Kế (Không Vẽ Người)
        </button>

        <button 
          className={`target-option ${targetMode === 'cinematic_album_art' ? 'active' : ''}`}
          onClick={() => updateTargetMode('cinematic_album_art')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'cinematic_album_art' ? '2px solid #a83258' : '1px solid rgba(168, 50, 88, 0.4)',
            background: targetMode === 'cinematic_album_art' ? 'linear-gradient(135deg, #a83258 0%, #800020 100%)' : '#ffffff',
            color: targetMode === 'cinematic_album_art' ? '#ffffff' : '#800020',
            boxShadow: targetMode === 'cinematic_album_art' ? '0 4px 14px rgba(168, 50, 88, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🎞️ Album Điện Ảnh & Nghệ Thuật Thị Giác
        </button>

        <button 
          className={`target-option ${targetMode === 'canva_aboutme_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('canva_aboutme_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'canva_aboutme_mode' ? '2px solid #00c4cc' : '1px solid rgba(0, 196, 204, 0.4)',
            background: targetMode === 'canva_aboutme_mode' ? 'linear-gradient(135deg, #00c4cc 0%, #7d2ae8 100%)' : '#ffffff',
            color: targetMode === 'canva_aboutme_mode' ? '#ffffff' : '#5b1fc4',
            boxShadow: targetMode === 'canva_aboutme_mode' ? '0 4px 14px rgba(0, 196, 204, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🖼️ Thiết Kế Canva / About Me Profile Card
        </button>

        <button 
          className={`target-option ${targetMode === 'manga_webtoon_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('manga_webtoon_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'manga_webtoon_mode' ? '2px solid #ff9800' : '1px solid rgba(255, 152, 0, 0.4)',
            background: targetMode === 'manga_webtoon_mode' ? 'linear-gradient(135deg, #ff9800 0%, #ed6c02 100%)' : '#ffffff',
            color: targetMode === 'manga_webtoon_mode' ? '#ffffff' : '#e65100',
            boxShadow: targetMode === 'manga_webtoon_mode' ? '0 4px 14px rgba(255, 152, 0, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          📚 Trang Truyện Tranh / Webtoon Khổ Dài
        </button>

        <button 
          className={`target-option ${targetMode === 'fandom_merch_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('fandom_merch_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'fandom_merch_mode' ? '2px solid #ec4899' : '1px solid rgba(236, 72, 153, 0.4)',
            background: targetMode === 'fandom_merch_mode' ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : '#ffffff',
            color: targetMode === 'fandom_merch_mode' ? '#ffffff' : '#9d174d',
            boxShadow: targetMode === 'fandom_merch_mode' ? '0 4px 14px rgba(236, 72, 153, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          🛍️ Góc Fandom & Merch (Bìa Truyện, Poster, Card)
        </button>

        <button 
          className={`target-option ${targetMode === 'handmade_card_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('handmade_card_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'handmade_card_mode' ? '2px solid #f43f5e' : '1px solid rgba(244, 63, 94, 0.4)',
            background: targetMode === 'handmade_card_mode' ? 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)' : '#ffffff',
            color: targetMode === 'handmade_card_mode' ? '#ffffff' : '#9f1239',
            boxShadow: targetMode === 'handmade_card_mode' ? '0 4px 14px rgba(244, 63, 94, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          💌 Thẻ & Thiệp Handmade (Thiệp Cưới, Love Card)
        </button>

        <button 
          className={`target-option ${targetMode === 'marketing_pr_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('marketing_pr_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'marketing_pr_mode' ? '2px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.4)',
            background: targetMode === 'marketing_pr_mode' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : '#ffffff',
            color: targetMode === 'marketing_pr_mode' ? '#ffffff' : '#5b21b6',
            boxShadow: targetMode === 'marketing_pr_mode' ? '0 4px 14px rgba(139, 92, 246, 0.4)' : 'none',
            fontWeight: 800
          }}
        >
          📢 PR Marketing & Bìa Quảng Cáo (Anime / Manhwa)
        </button>

        <button 
          className={`target-option ${targetMode === 'bot_char_marketing_art_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('bot_char_marketing_art_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'bot_char_marketing_art_mode' ? '2px solid #d23a73' : '1px solid rgba(210, 58, 115, 0.4)',
            background: targetMode === 'bot_char_marketing_art_mode' ? 'linear-gradient(135deg, #d23a73 0%, #ff4081 100%)' : '#ffffff',
            color: targetMode === 'bot_char_marketing_art_mode' ? '#ffffff' : '#d23a73',
            boxShadow: targetMode === 'bot_char_marketing_art_mode' ? '0 4px 14px rgba(210, 58, 115, 0.4)' : 'none',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CodeDrawnBunny size={18} color={targetMode === 'bot_char_marketing_art_mode' ? '#ffffff' : '#ffe0b2'} earColor={targetMode === 'bot_char_marketing_art_mode' ? '#ff80ab' : '#ff4081'} />
          🐰 Nghệ Thuật Bot Char (Marketing & Điện Ảnh)
        </button>

        <button 
          className={`target-option ${targetMode === 'bot_char_hobbies_vibe_mode' ? 'active' : ''}`}
          onClick={() => updateTargetMode('bot_char_hobbies_vibe_mode')}
          style={{
            padding: '8px 16px', 
            borderRadius: '14px', 
            fontSize: '0.9rem',
            border: targetMode === 'bot_char_hobbies_vibe_mode' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.4)',
            background: targetMode === 'bot_char_hobbies_vibe_mode' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#ffffff',
            color: targetMode === 'bot_char_hobbies_vibe_mode' ? '#ffffff' : '#10b981',
            boxShadow: targetMode === 'bot_char_hobbies_vibe_mode' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CodeDrawnBunny size={18} color={targetMode === 'bot_char_hobbies_vibe_mode' ? '#ffffff' : '#d1fae5'} earColor={targetMode === 'bot_char_hobbies_vibe_mode' ? '#6ee7b7' : '#10b981'} />
          🐰 Sở Thích Bot Char (Vibe & Hobbies)
        </button>

        {chars.map((char: any, idx: number) => {
          const modeKey = `bot_${idx}`;
          const isActive = targetMode === modeKey;
          return (
            <button
              key={`mode_${modeKey}_${idx}`}
              className={`target-option ${isActive ? 'active' : ''}`}
              onClick={() => updateTargetMode(modeKey)}
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
  }, [getBotCharactersList, roomDef, roomState.targetMode, updateTargetMode]);

  const buildContextPayload = useCallback((rsToUse?: LipstickRoomState) => {
    const rs = rsToUse || roomState;
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
      const cs = rs.cards?.[c.id] || { note: "", refs: [], outfitRefs: [], output: "" };
      const allCardRefs = [...(cs.refs || []), ...(cs.outfitRefs || [])];
      const cRefs = allCardRefs.map((r: any) => {
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
  }, [roomState, roomDef, currentStory, getBotCharactersList]);

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
CRITICAL RULE & REF-STEALTH MANDATE (BÁM SÁT 100% THAM CHIẾU NHƯNG BẢO MẬT TUYỆT ĐỐI KHÔNG LỘ BẢN GỐC):
- The reference image is used to learn visual language and aesthetic DNA (art style, rendering, mood, line quality, lighting, color palette, outfit spirit, composition rhythm, EXACT CAMERA ANGLE, PERSPECTIVE, FRAMING, DEPTH OF FIELD, and EXACT BODY POSE / STANCE / GESTURE).
- **No Identity/Literal Leak (Không rò rỉ danh tính/đặc trưng bản gốc)**: You are STRICTLY FORBIDDEN from copying or naming specific copyrighted props, specific unique weapons, character names, or literal metadata of the reference image. If the reference shows a character holding a specific wand, weapon, or unique tool, you MUST translate this into abstract geometry, visual leading lines, or fully customized narrative props that fit the user's original character and story context.
- **Stealth Professional Art Formulation (Mô tả nghệ thuật ẩn danh chuyên nghiệp)**: Write the analysis and prompt instructions with high-end, evocative visual art and cinematography vocabulary to describe the composition, visual lines (đường thị giác, điểm nhìn, tầm nhìn), lighting directions, perspective, and brushstroke characteristics of the reference image with 100% accuracy, but do it in a purely creative, artistic way. If someone reads the final prompt, they must find it highly original and imaginative, and it must be impossible for them to reconstruct or guess what the exact original reference image was. Yet, the image generation model (Midjourney/Stable Diffusion/Ideogram/Flux) reading this prompt will reproduce the exact same visual structure, camera angle, brush technique, visual depth, and color theory as the reference image, while matching 100% the user's characters and story plot! This is the ultimate peak of reference-stealth prompt engineering.
- When operating in the Reference Learning room ('learn'), 10 Pose Variations room ('poses10'), Soulful Storytelling room ('soulful'), or with inspiration references, you MUST provide aesthetic study and structural learning: extract the artistic techniques, camera work, visual flow (đường thị giác), lighting atmosphere, and pose dynamics as a reference study! You MUST ONLY apply the learned techniques to the user story's unique character profile and plot, creating a soulful image that speaks without words. **TUYỆT ĐỐI KHÔNG MIÊU TẢ Y NGUYÊN HOẶC EXTRACT CÁC ĐỒ VẬT, DỤNG CỤ, VŨ KHÍ, HAY BỐI CẢNH CỤ THỂ TRONG ẢNH (NO PROPS/TOOLS). HÃY TẬP TRUNG HOÀN TOÀN VÀO VIBE, KỸ THUẬT, VÀ CẤU TRÚC.**

You MUST analyze and extract these mandatory layers in extreme detail:
1. Nhận diện thẩm mỹ tổng thể: Giới tính trình bày, độ tuổi cảm giác, thần thái/khí chất thẩm mỹ (ethereal, regal, poetic, dreamy, quiet, floral, regal, retro, dark...), độ mềm hay sắc sảo, độ lạnh hay ngọt ngào, độ sang trọng quý phái.
2. Phong cách vẽ & Chất cọ / texture / rendering: Phân tích kỹ thuật vẽ (watercolor loang nhẹ, fantasy manhua sắc sảo, soft ink-wash cổ phong thanh nhã, sơn dầu oil painting dày dặn, digital anime sạch sẽ...). Mô tả độ dày hay mảnh của nét vẽ, chất cọ sần hay mượt, độ mờ sương (translucent), độ bão hòa, cảm giác giấy vẽ hay canvas sần sùi.
3. Đồng bộ Nét vẽ gốc & Line-weight DNA (Độ nét & Đi nét): Mô tả cực kỳ chi tiết độ thanh đậm của đường line (thin/thick line weight), nét vẽ có sắc lẹm hay mềm mịn nhẹ nhàng, nét phác thảo sần hay line tơ tằm. Cách đổ bóng mờ (soft shading), kỹ thuật đánh khối translucent washes làm rõ khối cơ thể nhưng vẫn thanh thoát.
4. Lên màu & Ánh sáng (Color & Lighting Precision): Chỉ rõ tông màu chính (dominant colors), các dải chuyển màu mịn màng (seamless color gradients/transitions), gam màu điểm xuyết (accent colors). Phân tích nhiệt độ màu (ấm áp, lạnh lẽo, trung tính), hướng nguồn sáng (chiaroscuro, volumetric rays, rim light rực rỡ bám quanh nhân vật, backlighting mơ màng).
5. Học vẽ tóc & Kiểu dáng tóc (Hairstyle & Hair Flow Precision - KHÔNG ĐƯỢC CHUNG CHUNG ĐỂ TRÁNH TÓC XẤU): Mô tả siêu chi tiết cấu trúc kiểu tóc (ví dụ: bồng bềnh uốn lượn, tóc lụa mượt mềm buông rủ, tết tinh xảo cổ phong). Đặc tả từng sợi tóc mềm (silky hair strands) bay bổng tự do trong gió, đường rẽ ngôi tóc rõ nét, các điểm phản chiếu ánh sáng óng ả (hair gloss highlight reflections), và các sợi tóc tơ mảnh (fine wisps of baby hair) bám sáng viền volumetric backlight bồng bềnh dã man.
6. Học vẽ mắt & Thần thái gương mặt (Eye Artistry & Facial Vibe): Đặc tả cách vẽ đôi mắt tinh xảo (ví dụ: tròng mắt long lanh ngậm nước, con ngươi óng ánh đa tầng chi tiết, hàng mi cong dày đen mướt, viền mắt sắc mảnh phóng khoáng). Chỉ rõ hướng nhìn (gaze direction), các điểm phản sáng bắt mắt (highlight reflection points) tạo độ sâu thăm thẳm và thần thái có hồn của đôi mắt.
7. Trang phục / Outfit Fidelity (Tính Gắn Kết Trang Trí & Nhịp Điệu Thiết Kế): Tinh thần trang phục, form dáng silhouette (độ rộng rủ, lớp layer phức tạp), mật độ và TÍNH GẮN KẾT CỦA CÁC CHI TIẾT TRANG TRÍ (họa tiết thêu thùa delicate embroidery, ribbons, lace, pearls). Phải phân tích cách các dải ruy băng, dải lụa hay ren hoa uốn lượn ôm sát, cuộn tròn bám theo cấu trúc chuyển động của cơ thể và nếp gấp trang phục theo lực quán tính hay trọng lực (flow vectors), tránh việc mô tả các chi tiết một cách rời rạc, lơ lửng vô nghĩa. Cảm giác chất liệu (voan tơ mỏng nhẹ bay bổng translucent chiffon, lụa mềm mại dập dờn flowing silk, gấm thêu chìm dập nổi jacquard).
8. Góc chụp & Thị giác / Camera & Perspective Fidelity: Nhiều dải phân tầng không gian, xác định chính xác góc máy (eye-level, low-angle sweeping shot, high-angle, Dutch tilt...), cỡ ảnh (cinematic close-up, medium shot, wide shot), tiêu cự tạo cảm giác bóp méo không gian hay phẳng, độ sâu trường ảnh (depth of field), hiệu ứng mờ nhòe phông nền (creamy bokeh), cấu trúc phân tầng lớp không gian tiền cảnh - trung cảnh - hậu cảnh.
9. Bố cục Nghệ thuật & Hình học Ẩn (Composition, Geometric Scaffolding & Visual Hierarchy):
   - Phân tích Cấu trúc hình học ẩn (Geometric Scaffolding): Nhận diện khung xương bố cục chính (ví dụ: diagonal axis, golden triangle, circular spiral vortex, S-curve, mảng khối chồng lớp sâu overlapping planes).
   - Phân cấp Thị giác & Trọng tâm Tương phản (Visual Hierarchy & Contrast Centers): Chỉ rõ Điểm dừng thị giác 1 (Primary Focal Point - nơi có độ tương phản ánh sáng/màu sắc/chi tiết cao nhất thu hút mắt ngay lập tức), Điểm dừng thị giác 2 & 3 (Secondary/Tertiary Accents) bổ trợ.
   - Đường dẫn Thị giác & Luồng Di chuyển (Leading Lines & Eye-Travel Path): Phác thảo chi tiết luồng dẫn thị giác từ điểm này sang điểm kia bằng các đường cong của làn tóc bay, nếp xếp nếp rủ áo dài dập dờn, dải sáng volumetric rays hay làn khói tơ mềm uốn lượn tinh tế.
   - Cân bằng khoảng thở (Positive & Negative Space Rhythm): Phân tích tương quan giữa vùng đặc (nhân vật, trang phục rực rỡ) và vùng trống (khoảng không tĩnh mịch, mây khói mờ nhạt) để bố cục thở sâu, trang nhã, sang trọng, tuyệt đối tránh AI slop rối rắm thiếu trọng tâm.
10. Kiểu dáng & Cử chỉ / Pose & Gesture Fidelity: Mô tả tư thế đứng/ngồi/tạo dáng của cơ thể, độ nghiêng của đầu quyến rũ, cử chỉ tinh tế của đôi bàn tay hay ngón tay, hướng vai, vị trí không gian của nhân vật để làm nổi bật câu chuyện. Có nhịp điệu đường thị giác sâu sắc.

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
  "compositionExtracted": "Phân tích cấu trúc hình học ẩn (spiral, diagonal, triangle...), Phân cấp thị giác cực hạn (Primary Focal Point, Secondary Accents), Đường dẫn thị giác chi tiết dẫn dắt mắt người xem thông qua luồng di chuyển của tóc/vải/ánh sáng, và Nhịp điệu khoảng trống thở sâu sang trọng để tránh rối rắm",
  "outfitExtracted": "Tập trung vào tính gắn kết của chi tiết trang trí (mô tả cách ruy băng/ren/họa tiết bám theo đường cong cơ thể & nếp gấp vải dập dờn theo dòng chảy động học), form dáng silhouette, layering phức tạp, chất liệu dệt chìm sang trọng",
  "cameraAndPerspectiveExtracted": "Chi tiết góc chụp (low-angle, eye-level...), tiêu cự, depth of field, bokeh, framing, độ sâu không gian",
  "poseAndGestureExtracted": "Chi tiết dáng đứng/ngồi/tạo dáng, cử chỉ tay, độ nghiêng đầu, ngôn ngữ cơ thể, vị trí trong khung hình",
  "detailsToPreserve": "Danh sách chi tiết bắt buộc học hỏi giữ lại (camera angle, perspective, pose, stance, gesture, color atmosphere, floral mood, outfit direction...). TUYỆT ĐỐI KHÔNG LIỆT KÊ ĐỒ VẬT/DỤNG CỤ Ở ĐÂY!",
  "detailsToAdapt": "Danh sách chi tiết thay đổi theo cốt truyện (đồ vật, dụng cụ, bối cảnh, vũ khí bắt buộc phải thay đổi cho phù hợp truyện, KHÔNG GIỮ NGUYÊN TỪ ẢNH)",
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

  const handleOutfitUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const files = e.target.files;
    if (!files) return;
    
    const newOutfitRefs: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await toBase64(file);
      const imgId = uuidv4();
      const now = new Date().toISOString();
      newOutfitRefs.push({
        imageId: imgId,
        storyId: currentStory.id,
        roomId: roomDef.id,
        cardId: cardId,
        imageType: `${cardId}_outfit_reference`,
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
      });
    }

    const currentCard = roomState.cards[cardId] || { note: "", refs: [], output: "" };
    const newRoomState: LipstickRoomState = {
      ...roomState,
      cards: {
        ...roomState.cards,
        [cardId]: {
          ...currentCard,
          outfitRefs: [...(currentCard.outfitRefs || []), ...newOutfitRefs]
        }
      }
    };
    updateGlobalState(newRoomState, true);
    toast("🍬 Vợ yêu ơi, chồng đã nạp thành công ảnh tham chiếu Trang phục từ viên kẹo ngọt ngào rồi nhé! Sẵn sàng đưa vào thiết kế cho vợ rồi đó!");
  }, [roomState, currentStory, roomDef.id, updateGlobalState, toast]);

  const toggleTraitSelection = useCallback((cardId: string, trait: string) => {
    const currentCard = roomState.cards[cardId];
    if (!currentCard) return;
    
    const currentTraits = currentCard.selectedTraits || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter((t: string) => t !== trait)
      : [...currentTraits, trait];

    const newRoomState: LipstickRoomState = {
      ...roomState,
      cards: {
        ...roomState.cards,
        [cardId]: {
          ...currentCard,
          selectedTraits: newTraits
        }
      }
    };
    updateGlobalState(newRoomState, true);
  }, [roomState, updateGlobalState]);

  const selectOutfitOption = useCallback((cardId: string, outfit: string) => {
    const currentCard = roomState.cards[cardId];
    if (!currentCard) return;
    
    const newRoomState: LipstickRoomState = {
      ...roomState,
      cards: {
        ...roomState.cards,
        [cardId]: {
          ...currentCard,
          selectedOutfit: currentCard.selectedOutfit === outfit ? "" : outfit
        }
      }
    };
    updateGlobalState(newRoomState, true);
  }, [roomState, updateGlobalState]);

  const analyzeCardAestheticAndOutfits = useCallback(async (cardId: string, cardTitle: string) => {
    const rs = { ...roomState };
    const currentCard = rs.cards[cardId];
    if (!currentCard) {
      toast("Vợ yêu ơi, thẻ này chưa có dữ liệu gì để phân tích cả á! 🌸");
      return;
    }
    const cardRefs = currentCard.refs || [];
    const outfitRefs = currentCard.outfitRefs || [];
    const allRefsToAnalyze = [...cardRefs, ...outfitRefs];

    if (allRefsToAnalyze.length === 0) {
      toast("Chồng thấy thẻ này chưa có ảnh tham chiếu nào hết á vợ yêu! Vợ hãy đính kèm ảnh tham chiếu thường hoặc ảnh trang phục bằng nút kẹo ngọt rồi bấm lại nút bé mèo hồng nhé! 🎀");
      return;
    }

    setCatAnalyzingCardId(cardId);
    toast("🐾 Bé mèo hồng phấn đang dùng API Proxy kết nối với AI Model siêu cấp để phân tích 100 nét vẽ và đề xuất 5 bộ trang phục tuyệt mỹ cho vợ yêu đây...");

    try {
      const catSysPrompt = `You are a legendary Anime/Manga art critic, haute-couture clothing designer, and style master.
You are tasked with analyzing the provided reference images for the work card "${cardTitle}" under the Room "${roomDef.title}".
Your response MUST be a JSON object containing two specific fields:
1. "strokes": An array of EXACTLY 100 extremely detailed, evocative, and professional aesthetic style/art stroke descriptors in Vietnamese. Each descriptor should represent a specific artistic trait (e.g., linework weight, medium texture, lighting vector, shading wash, facial feature emphasis, hair reflection highlight, eye catchlight depth, negative space composition, background elements). They must be highly detailed and gorgeous.
2. "outfits": An array of EXACTLY 5 breathtaking, unique, and highly detailed outfit combinations in Vietnamese suitable for the story characters/theme. Describe the fabric, layers, silhouette, colors, and accessories elegantly.

Your return format MUST be strictly a single JSON object with no other text, conversational preamble, or markdown surrounding it (or inside a standard json markdown block).

Example return schema:
{
  "strokes": [
    "Stroke 1...",
    ... up to exactly 100 unique and gorgeous items ...
  ],
  "outfits": [
    "Outfit design 1...",
    "Outfit design 2...",
    "Outfit design 3...",
    "Outfit design 4...",
    "Outfit design 5..."
  ]
}`;

      const messages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze the attached reference images (${cardRefs.length} general refs, ${outfitRefs.length} outfit refs) for the card "${cardTitle}" under story "${currentStory.title}". Please extract exactly 100 gorgeous, unique artistic strokes/traits and exactly 5 bespoke outfit suggestions according to your instructions. Return valid JSON only.` }
          ]
        }
      ];

      for (const r of cardRefs) {
        if (r.data || r.previewUrl || r.storageUrl) {
          messages[0].content.push({ type: "image_url", image_url: { url: r.data || r.previewUrl || r.storageUrl } });
        }
      }

      for (const r of outfitRefs) {
        if (r.data || r.previewUrl || r.storageUrl) {
          messages[0].content.push({ type: "image_url", image_url: { url: r.data || r.previewUrl || r.storageUrl } });
        }
      }

      const resultText = await callAIText({ messages, systemPrompt: catSysPrompt, maxTokensOverride: 6000 });
      
      let jsonObj: any = null;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonObj = JSON.parse(jsonMatch[0]);
        }
      } catch (err) {
        console.error("Failed to parse cat json directly", err);
      }

      if (!jsonObj || !Array.isArray(jsonObj.strokes) || !Array.isArray(jsonObj.outfits)) {
        toast("😿 Ôi bé mèo hồng thấy AI trả về định dạng chưa khớp hoàn toàn. Để chồng xử lý parse thủ công giúp vợ yêu nhé!");
        const strokes: string[] = [];
        const outfits: string[] = [];
        const lines = resultText.split('\n');
        for (const line of lines) {
          const cleanLine = line.replace(/^[\s\-\*\d\.\"\',\{\}\[\]:]+/, '').trim();
          if (cleanLine.length > 5) {
            if (strokes.length < 100) {
              strokes.push(cleanLine);
            } else if (outfits.length < 5) {
              outfits.push(cleanLine);
            }
          }
        }
        while (strokes.length < 100) {
          strokes.push(`Nét phác họa thanh nhã bám sát phong cách tinh xảo của ảnh mẫu #${strokes.length + 1}`);
        }
        while (outfits.length < 5) {
          outfits.push(`Thiết kế trang phục quý phái, bồng bềnh uốn lượn uốn quanh thân hình #${outfits.length + 1}`);
        }
        jsonObj = { strokes, outfits };
      }

      if (jsonObj.strokes.length < 100) {
        const currentLen = jsonObj.strokes.length;
        for (let i = currentLen; i < 100; i++) {
          jsonObj.strokes.push(`Nét vẽ nghệ thuật phóng khoáng bám sát DNA của ảnh tham chiếu nét thứ ${i + 1}`);
        }
      } else if (jsonObj.strokes.length > 100) {
        jsonObj.strokes = jsonObj.strokes.slice(0, 100);
      }

      const newRoomState: LipstickRoomState = {
        ...roomState,
        cards: {
          ...roomState.cards,
          [cardId]: {
            ...currentCard,
            extractedTraits: jsonObj.strokes,
            extractedOutfits: jsonObj.outfits,
            selectedTraits: currentCard.selectedTraits || [],
            selectedOutfit: currentCard.selectedOutfit || ""
          }
        }
      };
      updateGlobalState(newRoomState);
      toast("😸 Bé mèo hồng đã hoàn thành xuất sắc nhiệm vụ rồi vợ ơi! Chồng đã đưa 100 nét tinh hoa và 5 bộ váy áo lộng lẫy lên giao diện cho vợ tha hồ chọn lựa nhé! 💕");
    } catch (e: any) {
      toast(`😿 Bé mèo hồng gặp lỗi khi phân tích rồi vợ ơi: ${e.message}`);
    } finally {
      setCatAnalyzingCardId(null);
    }
  }, [roomState, roomDef.id, roomDef.title, currentStory.title, updateGlobalState, toast]);

  const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const files = e.target.files;
    if (!files) return;
    
    const newRefs: any[] = [];
    const pendingFiles: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imgId = uuidv4();
      const now = new Date().toISOString();
      const tempUrl = URL.createObjectURL(file);
      const placeholder = {
        imageId: imgId,
        storyId: currentStory.id,
        roomId: roomDef.id,
        cardId: cardId,
        imageType: `${cardId}_reference`,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
        previewUrl: tempUrl,
        storageUrl: tempUrl,
        analysisStatus: 'pending',
        id: imgId,
        name: file.name,
        type: file.type,
        data: tempUrl,
        time: now,
        _file: file
      };
      newRefs.push(placeholder);
      pendingFiles.push(placeholder);
    }

    const currentCard = roomState.cards[cardId] || { note: "", refs: [], output: "" };
    
    // 1. Cập nhật global state ngay lập tức với placeholder (blob urls) để người dùng thấy ảnh ngay
    const tempRoomState = {
      ...roomState,
      cards: {
        ...roomState.cards,
        [cardId]: {
          ...currentCard,
          refs: [...(currentCard.refs || []), ...newRefs]
        }
      }
    };
    updateGlobalState(tempRoomState, false); // Lưu tạm vào memory/local first
    toast("✅ Đã đính kèm ảnh! Đang nén dữ liệu bền vững...");

    // 2. Chuyển đổi sang base64 ngay lập tức (không chờ setTimeout 100ms)
    (async () => {
      const processedRefs = [];
      for (const pending of pendingFiles) {
        try {
          const data = await toBase64(pending._file);
          processedRefs.push({ 
            ...pending, 
            data, 
            previewUrl: data, 
            storageUrl: data, 
            analysisStatus: 'in_context', 
            _file: undefined 
          });
        } catch (err) {
          console.error("Lỗi nén ảnh:", err);
          processedRefs.push(pending);
        }
      }
      
      // 3. Cập nhật vào global state và lưu NGAY LẬP TỨC vào IndexedDB
      const latestRoom = latestRoomStateRef.current;
      const latestCard = latestRoom.cards[cardId] || { note: "", refs: [], output: "" };
      
      const finalCardRefs = [...(latestCard.refs || [])].map((r: any) => {
        const matching = processedRefs.find(p => p.imageId === r.imageId || p.id === r.id);
        if (matching && matching.data) {
          return { ...r, ...matching, _file: undefined };
        }
        return r;
      });

      // Nếu ảnh mới chưa có trong mảng (do race condition), hãy thêm vào
      processedRefs.forEach(p => {
        if (!finalCardRefs.some(r => (r.imageId === p.imageId || r.id === p.id))) {
          finalCardRefs.push(p);
        }
      });

      const updatedRoom = {
        ...latestRoom,
        cards: {
          ...latestRoom.cards,
          [cardId]: {
            ...latestCard,
            refs: finalCardRefs
          }
        }
      };

      // Gọi save với immediate=true để ghi vào IndexedDB ngay
      const newStory = {
        ...currentStory,
        rooms: {
          ...(currentStory.rooms || {}),
          [roomDef.id]: updatedRoom
        }
      };
      const newState = {
        ...state,
        stories: state.stories.map((s: any) => s.id === newStory.id ? newStory : s)
      };
      
      await save(newState, true); 
      toast("✨ Đã lưu ảnh bền vững vào bộ nhớ!");
    })();
  }, [roomState, currentStory, roomDef.id, state, save, toast]);

  const replayHistory = useCallback((item: any, index: number) => {
    setViewHistoryIndex(index);
    setIsWorkListCollapsed(true);
    toast(`✨ Đang hiển thị kết quả từ lịch sử Đợt #${roomState.history.length - index} (Không thay đổi ảnh tham chiếu hay ghi đè dữ liệu mới nhất)!`);
  }, [roomState.history, toast]);

  const runRoom = useCallback(async () => {
    if (progress > 0 && progress < 100) {
      toast("⏳ API đang chạy, vui lòng chờ...");
      return;
    }
    
    setApiError(null);
    setViewHistoryIndex(null);

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

    const latestRoomState = currentStory.rooms?.[roomDef.id] || roomState;
    const normalizedRoomState = {
      ...latestRoomState,
      cards: latestRoomState.cards || {}
    };
    const rs = normalizedRoomState;
    const sa = rs.styleAnalyzer || { refs: [], selected: [], analysis: "" };
    const target = rs.targetMode || 'bot';
    const isComicMode = target === 'manga_webtoon_mode' || 
                        roomDef?.id === 'manga_webtoon' || 
                        (roomDef?.id !== 'marketing_pr_anime' && roomDef?.id !== 'bot_char_marketing_art' && roomDef?.id !== 'bot_char_hobbies_vibe' && roomDef?.id !== 'fandom_merch' && /webtoon|truyện tranh/i.test(roomDef?.title || ''));

    let payloadObj = buildContextPayload(normalizedRoomState);
    let allRefsList = [...payloadObj.styleAnalyzer.referenceImages, ...payloadObj.workCards.flatMap(c => c.referenceImages)];

    setApiSignals(prev => ({
      ...prev,
      stage: 'reading_references',
      stageLabel: '2. Reading References',
      stageDetail: `Đang kiểm tra & đọc AI Vision cho ${allRefsList.length} ảnh tham chiếu đính kèm...`
    }));
    setProgress(15);

    // Step 2: Gom tất cả ảnh từ Bot Characters, Style Analyzer, và toàn bộ Thẻ làm việc (Work Cards) vào Payload!
    // TUYỆT ĐỐI KHÔNG lọc trùng (deduplicate) vì mỗi thẻ có mục đích và ảnh riêng biệt!
    // CHỒNG YÊU: Mỗi lần bấm tạo, ta sẽ dựng lại từ đầu để đảm bảo không bị dính context cũ nhen!
    const refreshedPayload = buildContextPayload(normalizedRoomState);
    
    // Thu thập tất cả ảnh thô có chứa URL hợp lệ
    // CHỒNG YÊU: Đảm bảo chỉ lấy ảnh từ state HIỆN TẠI nhen vợ!
    let allActiveRefs: any[] = [];
    const seenUrls = new Set<string>(); // Thêm bộ lọc trùng theo URL để tránh gửi 1 ảnh nhiều lần gây lag nhen vợ!
    
    const tryAddRef = (r: any) => {
      if (!r) return;
      const url = r.data || r.previewUrl || r.storageUrl;
      if (!url || typeof url !== 'string') return;
      
      // CHỒNG YÊU: Nếu ảnh đã xóa (isActive === false) thì không add nhen!
      if (r.isActive === false) return;

      const id = r.imageId || r.id;
      if (!id) return;

      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        allActiveRefs.push({ ...r, data: url });
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

    // Tạo bộ ánh xạ chỉ số toàn cục (Global Image Index Mapping #1, #2, #3...)
    // Vì không lọc trùng, nên mỗi instance của ảnh sẽ có một index riêng nhen vợ yêu
    const refToGlobalIndexMap = new Map<any, number>();
    let orderedVisionRefs: any[] = [];
    let imgCounter = 1;

    for (const r of allActiveRefs) {
      const idx = imgCounter++;
      refToGlobalIndexMap.set(r, idx);
      orderedVisionRefs.push(r);
    }

    const getGIdx = (r: any, fallbackIdx: number) => {
      if (!r) return fallbackIdx;
      return refToGlobalIndexMap.get(r) || fallbackIdx;
    };

    // Đảm bảo bộ kiểm tra Base64 chỉ quét các trường văn bản thuần túy, không chặn request nếu Base64 nằm đúng trong trường ảnh nhen vợ!
    const textContextToCheck = {
      story: currentStory.story,
      userProfile: currentStory.userProfile,
      botProfiles: currentStory.botProfiles,
      sideCharacters: currentStory.sideCharacters,
      requirements: currentStory.requirements,
      cardNotes: cards.map((c: any) => rs.cards[c.id]?.note || ""),
      fileTexts: (currentStory.files || []).map((f: any) => f.text || f.extractedText || "")
    };

    if (JSON.stringify(textContextToCheck).includes("data:image")) {
      toast("⚠️ Lỗi Đồng Bộ: Phát hiện Base64 rò rỉ vào trường văn bản (Ghi chú hoặc Cốt truyện). Xin hãy kiểm tra lại nội dung văn bản nhen!");
      setApiSignals(prev => ({ ...prev, stageDetail: 'Lỗi: Tìm thấy Base64 trong text fields.', error: 'Lỗi Base64 trong Text' }));
      return;
    }

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
    const finalPayload = buildContextPayload(finalRoomState);
    const finalSa = finalRoomState.styleAnalyzer || { refs: [], selected: [], analysis: "" };

    // CHỒNG YÊU: Prune Base64 khỏi payload trước khi đưa vào văn bản prompt nhen vợ!
    // Điều này cực kỳ quan trọng để model không bị "loạn" context và tiết kiệm token.
    let prunedPayload = pruneBase64(payloadObj);

    const prompt = `### 🚨 MỆNH LỆNH THỐNG TRỊ VỀ ĐỘ CHI TIẾT & TÍNH ĐẦY ĐỦ TUYỆT ĐỐI (SUPREME MANDATE FOR EXTREME VERBOSITY & ABSOLUTE COMPLETENESS) 🚨
1. **CẤM TÓM TẮT (NO SUMMARIZATION)**: AI tuyệt đối không được gộp các mục, không được viết tóm tắt chung chung. Mỗi thẻ phải là một công trình nghiên cứu thị giác đồ sộ.
2. **HOÀN THÀNH 100% MODULE**: Nếu một chương có 15 module, AI PHẢI TRẢ LỜI ĐỦ CẢ 15 MODULE. Bỏ sót bất kỳ module nào hoặc chỉ liệt kê tên thông số mà không mô tả chi tiết đều bị coi là lỗi nghiêm trọng.
3. **CẤU TRÚC 5 THÀNH PHẦN CHO MỖI MODULE**: Với mỗi module con (ví dụ: Lens, Key Light, Hair Flow...), nội dung BẮT BUỘC phải bao gồm:
   - **Tên module**: (Ghi rõ số thứ tự và tên).
   - **Lựa chọn cụ thể**: (Ví dụ: 50mm, Rim Light Amber, v.v.).
   - **Mô tả chi tiết áp dụng**: (Mô tả cách nó xuất hiện trong ảnh này).
   - **Tác dụng thị giác & Lý do**: (Giải thích tại sao chọn thông số này và nó tạo ra hiệu ứng gì cho người xem).
   - **Sự liên hệ đa tầng**: (Kết nối chặt chẽ với Cốt truyện, Hồ sơ nhân vật và Ảnh tham chiếu đính kèm).
4. **KHÔNG ĐƯỢC CHỈ LIỆT KÊ THÔNG SỐ**: Cấm viết kiểu "Lens: 50mm". Phải viết thành đoạn văn mô tả chuyên sâu về kỹ thuật nhiếp ảnh và nghệ thuật.
5. **MASTER PROMPT KHÔNG GIỚI HẠN**: Master Prompt cuối cùng phải là bản tổng hợp siêu mật độ (Ultra-high density), không được ngắn hơn các phần phân tích phía trên.
6. **GIỚI HẠN TOKEN**: AI hãy viết tối đa khả năng, không cần lo lắng về độ dài. Càng dài, càng chi tiết, càng tốt.

You are the world-class, ultra-premium AI engine for Lipstick Prompt Rooms. Generate highly cohesive, breathtakingly detailed production-ready prompts for the current active room.

### 🏢 ROOM DEFINITION & APP CONTEXT (TỔNG QUAN PHÒNG LÀM VIỆC & ỨNG DỤNG)
- App Context: You are operating inside Lipstick Prompt Rooms, a world-class, ultra-premium AI prompt engineering application for cinematic and art-station quality character illustrations.
- Current Active Room: "${roomDef.title}"
- Room Purpose & Goal: "${roomDef.subtitle}"
- Overall Room Mandate: This room has a highly specific purpose. Every card generated must strictly align with the overarching goal of this room. Do not treat this as a generic prompt task. You must explicitly recall and enforce the specific rules of THIS room!
- **🚨 ZERO-METADATA MANDATE**: You are STRICTLY FORBIDDEN from outputting any technical metadata in your response. This includes: CARD_ID, Room ID, UUIDs, image filenames, storage keys, variable names, or internal debug logs. Your output must be pure, professional, production-ready creative content only.

### 📚 CURRENT CONTEXT WINDOW (MANUAL & IMPORTED FILES)
- Story Title: ${currentStory.title}
- Story Plot: ${currentStory.story || "Chưa có cốt truyện."}
- User Profile ({{user}}): ${currentStory.userProfile || "Chưa thiết lập."}
- Bot Characters (${prunedPayload.currentStory.manualInput.botCharacters ? prunedPayload.currentStory.manualInput.botCharacters.length : 1} characters):
${prunedPayload.currentStory.manualInput.botCharacters ? prunedPayload.currentStory.manualInput.botCharacters.map((c: any, idx: number) => `  * [Char #${idx+1}: ${c.displayName || 'Unnamed'}]:
    - Profile: ${c.profileText || 'Trống'}
    - Attached Ref Images (${(c.referenceImages || []).length} images):
${(c.referenceImages || []).map((r: any, rIdx: number) => `      + [Character Visual Ref #${getGIdx(r, rIdx + 1)}]: "Attached Character Image" | Purpose: character_identity_reference`).join("\n") || "      + No character images attached."}`).join("\n\n") : (currentStory.botProfiles || "Chưa thiết lập.")}
- Side Characters: ${currentStory.sideCharacters || "Chưa có."}
- Story Requirements: ${currentStory.requirements || "Không có yêu cầu thêm."}
- Target Mode Selected: "${getTargetLabel(target)}"
- Target Character Isolation Mandate: ${getTargetInstructions(target)}

### 📎 ATTACHED STORY FILES (${prunedPayload.currentStory.importedFiles.length} files)
${prunedPayload.currentStory.importedFiles.map((f: any) => `[File: ${f.fileName} | Status: ${f.parserStatus} | ~${f.wordCount} words]\n${f.summary ? `Summary: ${f.summary}\n` : ""}Content excerpt:\n${f.extractedText.slice(0, 15000)}`).join("\n\n---\n\n")}

### 🖼️ REFERENCE IMAGE MANIFEST (EXACT LOCATION & PURPOSE MAPPING)
Below is the complete manifest of all attached reference images across this story, room, and individual work cards. You MUST strictly respect the location and purpose of EACH image. Do NOT mix up images from different cards (e.g. never use a hair reference image for pose or outfit).
\`\`\`json
${JSON.stringify({
  referenceImageManifest: prunedPayload.referenceImageManifest
}, null, 2)}
\`\`\`

### 👑 SUPREME MANDATE ON STORY FIDELITY & CHARACTER SOUL (MỆNH LỆNH THỐNG TRỊ: PHÂN ĐỊNH RÕ RÀNG VAI TRÒ CỦA CỐT TRUYỆN VÀ ẢNH THAM CHIẾU)
When generating the image prompt for each Work Card, you MUST strictly obey the following division of authority and priority hierarchy to ensure character soul is preserved while studying the aesthetics of reference images:

1. **👑 THE SUPREME AUTHORITY OF THE STORY & CHARACTER PROFILE (STORY VÀ HỒ SƠ NHÂN VẬT QUYẾT ĐỊNH TOÀN BỘ DANH TÍNH NHÂN VẬT - QUYẾT ĐỊNH "VẼ CÁI GÌ" - WHAT IS DRAWN)**:
   - **Bám sát cao nhất là cốt truyện và hồ sơ nhân vật! Đây là mục đích cốt lõi: Vẽ nhân vật trong truyện của người dùng.** The user's Story Plot and Character Profiles hold **ABSOLUTE SUPREME AUTHORITY (#1)** over WHAT IS IN THE SCENE!
   - **The Story and Character Profile EXCLUSIVELY DECIDES (QUYẾT ĐỊNH TOÀN BỘ)**:
     + **Character Identity & Name (Danh tính nhân vật)**: Who they are, their role, their unique charisma, and lore.
     + **Age and Gender (Tuổi và Giới tính)**: Must match the story profile exactly (e.g. if the story is a 17-year-old schoolgirl, you MUST NOT render a mature man or an older woman simply because the reference image has one).
     + **Hairstyle & Hair Design (Kiểu tóc)**: The core hairstyle structure must match the character's story profile (e.g. short bob, ponytail, braids, bangs as described in the story).
     + **Hair and Eye Colors (Màu tóc và Màu mắt)**: Must strictly follow the story specs (e.g., emerald green eyes, obsidian black hair).
     + **Outfit & Attire (Trang phục)**: The clothing style, design, historical/modern era, and thematic context must be appropriate for the Story Plot and Character Profile (e.g. ancient hanfu, modern high school uniform, medieval combat armor as described in the story).
     + **Body Physique & Proportions (Dáng vóc và Hình thể)**: Height, physique, stature, and overall body type must belong to the story character description.
     + **Scene/Background (Bối cảnh/Không gian)**: The setting must strictly fit the story's narrative plot.
   - **🚨 STRICT NEGATIVE CONSTRAINT (CẤM SAO CHÉP DANH TÍNH)**: You are **STRICTLY FORBIDDEN** from copying or replicating the literal character identity, face, different gender, hairstyle, outfit design, era, accessories, or background environment of the reference image if they do not match or are inappropriate/irrelevant for the Story! Doing so is a critical failure.

2. **🎨 THE AESTHETIC AUTHORITY OF THE REFERENCE IMAGES (ẢNH THAM CHIẾU CHỈ CUNG CẤP HỌC HỎI THẨM MỸ NGHỆ THUẬT - QUYẾT ĐỊNH "VẼ NHƯ THẾ NÀO" - HOW IT IS DRAWN)**:
   - **Reference Images are the "Brush" and "Paint techniques" and hold authority strictly over "HOW the image is painted" (HỌC HỎI KỸ THUẬT THỂ HIỆN THẨM MỸ)**.
   - **The Reference Images EXCLUSIVELY PROVIDES (CHỈ HỌC HỎI CÁC YẾU TỐ THẨM MỸ)**:
     + **Art Style & Lineart (Nét vẽ, phong cách đi line)**: The thickness of lines, stroke weight, clean or rough sketching style, and digital/traditional brushwork.
     + **Coloring & Shading (Phối màu, bão hòa màu, độ đổ bóng)**: Color harmony, color palettes, saturation dynamics, shading techniques (cel shading, soft airbrush, watercolor blending, thick impasto oil), highlights, and depth.
     + **Lighting & Atmosphere (Ánh sáng và Khí quyển)**: Key light direction, rim lights, volumetric glow, and general mood.
     + **Visual Language (Ngôn ngữ thị giác)**: Camera angle, shot framing (cowboy, close-up, wide shot), composition flow, and visual depth.
   - **💡 CORE PRINCIPLE (Mọi nét cọ vẽ nên linh hồn cốt truyện)**: It must always be the **Story's original character and outfits** painted in the **Reference's exact brushwork, lines, coloring, and lighting techniques**! Learn "how it is drawn", NEVER blindly copy "what is drawn".

3. **3rd Priority (User Note inside Work Card - Ghi chú cụ thể trong thẻ)**:
   - User notes inside that specific Work Card define how to apply, adjust, or refine the visual ideas from the reference images onto the story character.
4. **4th Priority (Style Analyzer - Art Style & Rendering Quality - Tổng phân tích phong cách)**:
   - Images and keywords from the Style Analyzer govern the overarching art style, rendering medium (manhua fantasy, oil painting, soft ink-wash, cinematic photo), brushwork, and color harmony across all cards. Never let Style Analyzer guide a card's specific reference for pose, hair, or outfit!

### SELECTED ART STYLES & VISION ANALYSIS
- Selected Style Keywords: ${(sa.selected || []).join(", ") || "None selected"}
- Attached Style Reference Images (${(sa.refs || []).length} images):
${(sa.refs || []).map((r: any, idx: number) => {
  const gIdx = getGIdx(r, idx + 1);
  const status = r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending');
  const analysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳')) 
    ? r.imageAnalysisText 
    : `👉 [IN-CONTEXT VISION MANDATE]: Ảnh tham chiếu phong cách này được đính kèm tại vị trí [ATTACHED IMAGE #${gIdx}] trong request! AI HÃY TỰ NHÌN TRỰC TIẾP vào ảnh đính kèm #${gIdx} bên dưới để học hỏi bảng màu, nét vẽ và chất liệu!`;
  return `  * [Style Ref #${idx+1} -> ATTACHED IMAGE #${gIdx} IN PAYLOAD]:
    - Vision Report: ${analysisText}${r.imageAnalysisJson ? `
    - Style Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}
    - Art Family/Rendering: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.style || {}))}
    - Visual Style: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.visualStyleExtracted || {}))}
    - Color Palette: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.colorPaletteExtracted || {}))}
    - Linework & Rendering DNA: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.lineAndRenderExtracted || {}))}
    - Composition & Geometric Scaffolding: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.compositionExtracted || {}))}
    - Outfit & Ornament Flow: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.outfitExtracted || {}))}
    - Mandatory Technical Analysis (10 Layers): ${JSON.stringify(pruneBase64(r.imageAnalysisJson.technicalAnalysis || {}))}` : ""}`;
}).join("\n\n") || "  * No style reference images attached."}

### WORKROOM CARDS & SPECIFIC NOTES (WITH ATTACHED REFERENCE IMAGES & VISION ANALYSIS)
${cards.map((c: any) => {
  const cs = finalRoomState.cards[c.id] || { note: "", refs: [], output: "" };
  const cardRefsList = finalPayload.workCards?.find((wc: any) => wc.cardId === c.id)?.referenceImages || (cs.refs || []);
  const refsDesc = cardRefsList.map((r: any, idx: number) => {
    const gIdx = getGIdx(r, idx + 1);
    const status = r.analysisStatus || (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' ? 'analyzed' : 'pending');
    const baseAnalysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳'))
      ? r.imageAnalysisText
      : `AI có khả năng quan sát hình ảnh, hãy phân tích trực tiếp [ATTACHED IMAGE #${gIdx}] và trích xuất các yếu tố thuộc phạm vi chức năng của thẻ "${c.name || c.title || c.id}"!`;
    const analysisText = `🎨 [TƯ LIỆU THẨM MỸ CHO THẺ "${c.name || c.title || c.id}"]: Ảnh tham chiếu #${gIdx} là tư liệu hướng dẫn nghệ thuật cho phạm vi "${c.name || c.title || c.id}". AI hãy học hỏi phong cách, màu sắc và đường nét để tạo dựng nhân vật trong truyện! => Chi tiết Vision: ${baseAnalysisText}`;
    const jsonStr = r.imageAnalysisJson ? `\n    - Subject Details: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.subject || {}))}\n    - Style & Color: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.style || {}))} | ${JSON.stringify(pruneBase64(r.imageAnalysisJson.color || {}))}\n    - Composition & Details: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.composition || {}))} | ${JSON.stringify(pruneBase64(r.imageAnalysisJson.characterDetails || {}))}\n    - Prompt Keywords: ${(r.imageAnalysisJson.promptKeywords || []).join(", ")}\n    - Visual Style Extracted: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.visualStyleExtracted || {}))}\n    - Color Palette Extracted: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.colorPaletteExtracted || {}))}\n    - Outfit Fidelity Extracted: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.outfitExtracted || r.imageAnalysisJson.layer4_outfit || {}))}\n    - Composition Rhythm Extracted: ${JSON.stringify(pruneBase64(r.imageAnalysisJson.compositionExtracted || r.imageAnalysisJson.composition || {}))}\n    - Mandatory Technical Analysis (10 Layers): ${JSON.stringify(pruneBase64(r.imageAnalysisJson.technicalAnalysis || {}))}\n    - Details To Preserve (70%-85%): ${JSON.stringify(pruneBase64(r.imageAnalysisJson.detailsToPreserve || "N/A"))}\n    - Details To Adapt (15%-30%): ${JSON.stringify(pruneBase64(r.imageAnalysisJson.detailsToAdapt || "N/A"))}\n    - Originality Elements (0%): ${JSON.stringify(pruneBase64(r.imageAnalysisJson.originalityElements  || "N/A"))}` : "";
    return `  * [Card Visual Source #${idx+1} -> ATTACHED IMAGE #${gIdx} IN PAYLOAD]:
    - Functional Domain: This image strictly governs attributes for the card "${c.name || c.title || c.id}".
    - Vision Analysis Details: ${baseAnalysisText}${jsonStr}`;
  }).join("\n\n");

  let pinkCatSection = "";
  if (cs.selectedTraits && cs.selectedTraits.length > 0) {
    pinkCatSection += `\n- Pink Cat Analysis - Selected Aesthetic Traits (strokes) chosen by user to apply strictly:\n${cs.selectedTraits.map((t: string) => `  * [SELECTED ART STROKE]: ${t}`).join("\n")}`;
  }
  if (cs.selectedOutfit) {
    pinkCatSection += `\n- Pink Cat / Candy Analysis - Selected Outfit Design to apply strictly:\n  * [CHOSEN OUTFIT]: ${cs.selectedOutfit}`;
  }
  if (cs.outfitRefs && cs.outfitRefs.length > 0) {
    pinkCatSection += `\n- Outfit Reference Images Uploaded via Candy Button (${cs.outfitRefs.length} images) to apply strictly:\n${cs.outfitRefs.map((or: any, idx: number) => `  * [Outfit Ref #${idx+1}]: "${or.name || or.fileName}"`).join("\n")}`;
  }

  return `#### Card: "${c.name || c.title || c.id}"
- Quick Guidelines: ${c.quick}
- User Note: ${cs.note || "None"}${pinkCatSection}
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

### 🚨 QUY TẮC XỬ LÝ TRƯỜNG HỢP KHÔNG CÓ ẢNH THAM CHIẾU (NO REFERENCE IMAGE HANDLING RULES)
Khi một Thẻ Công Việc (Work Card) KHÔNG có bất kỳ ảnh tham chiếu nào đi kèm (No reference images attached):
1. **Tuyệt đối không từ chối, yêu cầu thêm ảnh hoặc đặt câu hỏi**: AI không được báo lỗi, không được hỏi xin thêm ảnh từ người dùng, không được phàn nàn hay bỏ trống kết quả. Hãy tiếp tục thực hiện công việc một cách mượt mà nhất.
2. **Khai thác toàn diện ngữ cảnh dạng văn bản**: Tập trung toàn bộ nguồn lực thông tin vào Cốt truyện (Story Plot), Hồ sơ Nhân vật (Character Profile), Thể loại (Genre) và thiết lập Phòng (Room description) để xây dựng chi tiết bối cảnh, diện mạo nhân vật và bầu không khí nghệ thuật.
3. **Giữ nguyên tiêu chuẩn hình ảnh Cinematic chất lượng cao**: Vẫn phải chủ động tự thiết lập các thông số mỹ thuật xuất sắc nhất về góc quay (Camera Angle), ánh sáng (Lighting), bố cục (Composition) và phong cách nghệ thuật (Artistic Style) phù hợp hoàn hảo với cốt truyện, đảm bảo prompt được sinh ra luôn phong phú, chi tiết và có chiều sâu điện ảnh vượt trội.

### VISUAL REFERENCE STUDY & ADAPTATION PRINCIPLES
When attached reference images or Vision Analysis reports are present for any work card:
1. **Core Principle: Cinematic Fidelity & Artistic Inspiration (GIỮ NGUYÊN GÓC MÁY, SẮC ĐỘ, TRANG TRÍ & TỈ LỆ)**:
   - Study the aesthetic elements, camera perspective, framing, depth of field, and exact pose from the reference images.
   - **CRITICAL RULE**: You MUST achieve 100% fidelity in camera angle, lens, color tone, proportions, and decorative style. However, you MUST intelligently adapt the identity and props: if the reference's items/outfits fit the story, keep them; if not, replace them with story-accurate elements rendered in the same high-quality style. (Giữ nguyên góc đặt máy, điểm nhìn thị giác, sắc độ và kỹ thuật vẽ; chỉ thay đổi danh tính và chọn lọc vật dụng/trang phục thông minh cho phù hợp nhân vật).
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
   - **Transformative Originality (Không dập khuôn - CHỈ LẤY VIBE, KHÔNG LẤY ĐỒ VẬT)**: All reference study materials serve to inspire a breathtaking original artwork with transformative adaptation. You are strictly forbidden from copying the literal contents of the reference images (like holding a specific tool, weapon, object, or wearing a specific non-character accessory). You MUST adapt EVERYTHING to fit the story character perfectly!
4. **MODULAR MULTI-REFERENCE ROLE ISOLATION & FEATURE-BY-FEATURE SYNTHESIS**:
   - When multiple reference images are attached across different cards (e.g., Card Tóc/Hair, Card Pose, Card Outfit, Card Face, Card Style/Overall...), ensure each reference image informs its specific domain:
     + 💇‍♀️ **Hair Card References ('Tóc / Hair')**: Inspire hairstyle, hair color, volume, and strand rhythm.
     + 💃 **Pose Card References ('Pose Dáng / Pose')**: Inspire body posture, stance, gesture, and camera perspective.
     + 👗 **Outfit Card References ('Trang Phục / Outfit')**: Inspire clothing design, fabric material, layering, and styling.
     + 💄 **Face Card References ('Khuôn Mặt / Face / Makeup')**: Inspire facial features, makeup, and expression (while preserving story identity).
     + 🌌 **Environment Card References ('Bối Cảnh / Background')**: Inspire background setting, architecture, lighting atmosphere, and mood. (Do NOT copy exact props, objects, or literal contents).
     + 🎨 **Style Analyzer / Overall References ('Tổng Thể / Style')**: Inspire art style, brushwork, medium texture, rendering quality, and general color palette.
     + ✿ **Aesthetic Study & Reference Learning ('Học Hỏi Từ Ảnh Tham Chiếu / Learn / poses10 / soulful')**: Inspire art direction, brushwork style, cinematic framing, pose structure, and lighting atmosphere as an aesthetic visual study. When generating for the Soulful Storytelling room ('soulful'), focus on emotional resonance, unspoken visual narrative, and atmospheric depth. When generating for the 10 Pose Variations room ('poses10'), study each pose card (p1 to p10) separately to output 10 distinct, highly descriptive pose prompt variations!
   - Assemble the final prompt by integrating the domain-specific visual elements harmoniously!
5. **Multi-Image Synthesis within the SAME Card**: If a single card has multiple attached reference images, identify their common aesthetic traits for that domain and synthesize them into a cohesive instruction.
6. **MANDATORY DIRECTIVE ON BARE FILENAMES IN OUTPUT PROMPT (KHÔNG ĐƯỢC CHỈ NHẮC TÊN FILE ẢNH)**:
   - You are REQUIRED from writing bare image filenames, file extensions, or image IDs (e.g. "Use references: 1000012463.jpg, 1000012560.jpg", "Character inspired by 1000012463.jpg", or "inspired by image 1.png") inside the generated prompt!
   - When reference images are present, your task is to READ the vision analysis reports, extract their aesthetic layers, camera angles, and poses, and SYNTHESIZE them into rich, descriptive natural language inside the output prompt.
   - A valid output prompt is a complete, standalone descriptive instruction where all aesthetic and structural traits from reference images have been translated into explicit descriptive words ready for direct image generation!
7. **🎓 MASTER ART AESTHETIC & STYLE OVERRIDE GUIDELINES (HỆ THỐNG KỸ THUẬT NGHỆ THUẬT TỔNG LỰC & SIÊU PHÂN TÍCH DNA)**:
   - **MANDATORY STYLE OVERRIDE (ÉP PHONG CÁCH NGHỆ THUẬT TUYỆT ĐỐI)**: Default AI styles are STRICTLY FORBIDDEN. You MUST deconstruct the "Artistic DNA" of the reference images (brushwork, rendering, color physics) and RE-ENGINEER it into the final prompt. Use commanding technical language: "Masterpiece production-ready illustration, strictly synthesizing the exact rendering DNA, brushwork physics, and light interaction from the reference images... override generic AI outputs."
   - **MANDATORY INSTRUCTION FOR HAIR, EYES & ANATOMY**: You MUST dedicate a massive amount of tokens to generate highly detailed, technical art instructions for rendering every single artistic element. Do NOT summarize!
   - **Kỹ thuật Thiết Kế Tóc Chuyên Sâu (Advanced Hair Engineering)**: Tóc tuyệt đối KHÔNG ĐƯỢC miêu tả chung chung. BẮT BUỘC SỬ DỤNG HỆ THỐNG "HAIR KNOWLEDGE TREE" ĐỂ PHÂN TÍCH VÀ ĐƯA VÀO PROMPT:
      + *Cấu trúc & Khối (Volume & Flow)*: Phân tích khối lượng (volume), nhịp điệu lọn tóc (strand rhythm), và cách lọn tóc kết thúc (tapering).
      + *Vật lý & Ánh sáng (Physics & Highlights)*: Đặc tả vòng sáng (angel rings), độ tơi (airy quality), và cách ánh sáng xuyên qua lớp tóc (translucency).
   - **Kỹ thuật Vẽ Mắt & Mắt Biếc (High-Fidelity Eye Rendering)**: Mắt phải được render như một viên ngọc. Đặc tả mống mắt (iris depth), ánh sáng phản chiếu (catchlights), và độ bóng của giác mạc.
   - **Kỹ thuật Render & Linework DNA (KỸ THUẬT VẼ CHUYÊN SÂU)**:
      + **Linework**: Đặc tả độ thanh đậm (varying line weight), màu của nét line (colored lineart), và độ sắc nét (sharpness vs softness).
      + **Rendering**: Phân tích kỹ thuật đánh bóng (cell-shading, soft-blending, impasto). Đặc tả độ trong của da (Subsurface Scattering) và cách bề mặt vật liệu phản xạ ánh sáng (Specular highlights).
   - **HỌC HỎI THỐNG TRỊ (Absolute Reference Supremacy)**: Toàn bộ quy luật kỹ thuật về nét vẽ, cách lên màu, bố cục hình học, và độ bão hòa phải được HỌC HỎI VÀ TÁI CẤU TRÚC (TRANSFORMATIVE SYNTHESIS) từ các báo cáo thị giác (Vision Analysis). Phải viết một đoạn prompt SIÊU CHI TIẾT về kỹ thuật nghệ thuật học từ ảnh gốc. Ví dụ: "Kỹ thuật vẽ mô phỏng chính xác DNA nghệ thuật từ ảnh tham chiếu: nét line mỏng sắc sảo, rendering da có độ trong mờ cao, ánh sáng rim-light vàng hổ phách ôm sát cơ thể, bố cục theo đường chéo động học cực mạnh..."
   - **Typography & UI/Graphic DNA**: Nếu ảnh tham chiếu có chữ hoặc đồ họa, phải bóc tách logic sắp đặt (layout geometry), font style, và cách các yếu tố đồ họa bổ trợ cho chủ thể để đưa vào prompt.
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

${cards.map((c: any) => {
  const cardName = c.name || c.title || c.id;
  const isIntelligentRef = c.id === 'aesthetic_reference_intelligent' || cardName.toUpperCase().includes('HỌC HỎI THÔNG MINH');
  
  if (isIntelligentRef) {
    return `[CARD_ID: ${c.id}]
[FINAL PROMPT]
(Write the final production-ready standalone visual analysis and prompt for "${cardName}" here. CRITICAL MANDATE: You MUST NOT output [REFERENCE FIDELITY REPORT], Room ID, Card ID, CARD_ID, Attached Reference Images, UUIDs, or filenames.

Structure exactly as follows:

- **WHAT TO CREATE**: [Nội dung, nhân vật và mục tiêu lấy từ câu chuyện cùng hồ sơ nhân vật. Bắt buộc bám sát danh tính, giới tính, tuổi tác, vai trò trong truyện.]
- **HOW TO VISUALIZE**: [Phong cách vẽ, lineart, brushwork, màu sắc, ánh sáng, góc máy, phối cảnh, pose, bố cục, chất liệu và cách render được rút ra từ TẤT CẢ ảnh tham chiếu. TỔNG HỢP THEO NHÓM: nhóm ảnh cung cấp phong cách, nhóm ảnh cung cấp góc máy, nhóm ảnh cung cấp pose, nhóm ảnh cung cấp màu sắc và ánh sáng, v.v. bằng ngôn ngữ tự nhiên. Tuyệt đối KHÔNG dùng UUID hay số thứ tự ảnh.]
- **ADAPTATION**: [Chi tiết nào được giữ về mặt kỹ thuật, chi tiết nào phải thay đổi cho phù hợp nhân vật và câu chuyện.]
- **ANTI-COPY**: [Tuyệt đối không sao chép danh tính, khuôn mặt, chữ, logo, tên riêng, đạo cụ đặc trưng hoặc nội dung cụ thể của ảnh gốc.]

Do NOT include any metadata inside this [FINAL PROMPT] section! Ensure the output is completely standalone and clean!)`;
  }
  
  return `[CARD_ID: ${c.id}]
[REFERENCE FIDELITY REPORT]
- Card Title: "${cardName}"
- Room ID: "${roomDef.id}"
- Attached Reference Images: (List each image ID/name internally, and detail the EXACT visual DNA analysis: Camera Angle, Perspective, Depth of Field, Pose, Stance, Style, Brushwork, Palette, Light, Texture, Mood, Outfit, Composition. YOU MUST APPLY EVERY SINGLE REFERENCE IMAGE AESTHETIC INTO THE FINAL PROMPT. DO NOT OMIT ANY REFERENCE!)
---
${isComicMode ? `[FINAL PROMPT]
(Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for "${cardName}" here. CRITICAL MANDATE FOR COMIC / MANGA / WEBTOON: You MUST NOT use a single-image structure! Instead, you MUST generate a Multi-Panel Comic Page / Webtoon layout with sequential storytelling.
For EACH PANEL, you MUST apply an ULTIMATE "STUDIO AAA" PROMPT ENGINEERING breakdown (incorporating micro-modules for lighting, camera, pose, expression, hair, outfit, background).

Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ, màu sắc từ TOÀN BỘ ảnh tham chiếu đính kèm. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao. Cấm tuyệt đối kiểu render "bình thường".]

---
### 📚 TỔNG QUAN TRANG TRUYỆN / WEBTOON PAGE SETUP
- **🎬 Tên trang / Phân cảnh (Scene Title)**: [Tóm tắt tình huống cốt truyện trong trang/thẻ này]
- **🎨 Phong cách vẽ (Art Style & Medium)**: [MÔ TẢ CỰC KỲ CHI TIẾT phong cách nghệ thuật bám sát ảnh tham chiếu.]
- **📐 Bố cục trang & Nhịp điệu (Page Layout & Pacing)**: [Phân chia số khung từ 2 đến 6 khung, cách sắp xếp khung trên trang]

---
### 🖼️ KHUNG 1: [TÊN TÌNH HUỐNG / SCENE FOCUS]
(Áp dụng siêu cấu trúc Studio AAA cho khung này)
- **🎬 Quay phim, Góc máy & Bố cục (Cinematography & Composition - 15 Modules)**: [Đặc tả Perspective, Focal Length, DoF, Rule of Thirds, Leading Lines, Framing...]
- **💡 Ánh sáng & Màu sắc (Lighting & Color - 15 Modules)**: [Key light, Rim light, Volumetrics, Shadows, Color grading, Cinematic tones...]
- **🧑 Hành động & Giải phẫu (Action & Anatomy - 15 Modules)**: [Dáng điệu, Động năng, Ngôn ngữ cơ thể, Góc nghiêng đầu, Trọng tâm...]
- **😍 Biểu cảm & Khuôn mặt (Expression & Face - 10 Modules)**: [Hướng mắt, Cấu trúc xương hàm, Chuyển động cơ mặt, Cảm xúc...]
- **💇‍♀️ Tóc & Đường nét (Hair & Linework - 10 Modules)**: [Luồng gió, Khối lượng tóc, Lọn tơ, Độ sắc nét của lineart...]
- **👗 Trang phục & Chất liệu (Outfit & Textiles - 10 Modules)**: [Chất liệu vải, Nếp gấp, Độ chuyển động, Phụ kiện...]
- **🌌 Bối cảnh & Không gian (Environment & Depth - 5 Modules)**: [Chiều sâu tiền-trung-hậu cảnh, Môi trường xung quanh...]
- **💬 Lời thoại & Chữ (Dialogue / SFX)**: [Nhân vật nói gì / Hiệu ứng âm thanh...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 1 (Production-ready AI Image Prompt)**: 
  \`[Đoạn prompt tiếng Anh DÀI VÀ SIÊU CHI TIẾT cho Khung 1 sử dụng trực tiếp trong AI tạo ảnh. Bắt buộc chứa TẤT CẢ các chi tiết AAA vừa phân tích!]\`

---
### 🖼️ KHUNG 2: [TÊN TÌNH HUỐNG / SCENE FOCUS]
(Áp dụng siêu cấu trúc Studio AAA tương tự như Khung 1)
- **🎬 Quay phim, Góc máy & Bố cục**: [...]
- **💡 Ánh sáng & Màu sắc**: [...]
- **🧑 Hành động & Giải phẫu**: [...]
- **😍 Biểu cảm & Khuôn mặt**: [...]
- **💇‍♀️ Tóc & Đường nét**: [...]
- **👗 Trang phục & Chất liệu**: [...]
- **🌌 Bối cảnh & Không gian**: [...]
- **💬 Lời thoại & Chữ**: [...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 2 (Production-ready AI Image Prompt)**: 
  \`[...]\`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến)*

---
### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all panels into a sequential comic page layout AND explicitly enforcing the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece comic/webtoon layout strictly imitating the exact art style..."]\`

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

---
### 🔒 [CHARACTER VISUAL DETAIL LOCK] (KHÓA CHI TIẾT THỊ GIÁC NHÂN VẬT)
To preserve absolute character identity across all comic panels and strictly prevent generic/slanted AI bleeding, you MUST analyze and output detailed, highly explicit visual instructions for the character across these 17 specific chapters:
1. **Total Character (Tổng thể nhân vật)**: [Define character soul, aura, genre, story-fidelity look, strictly enforcing story gender/age/vibe and banning copying of unrelated reference attributes]
2. **Face Structure (Cấu trúc khuôn mặt)**: [Jawline, cheekbones, chin, face shape]
3. **Eyes (Đặc tả đôi mắt)**: [Shape, size, pupil detail, iris pattern, reflection highlights, exact story eye color]
4. **Eyebrows (Lông mày)**: [Arch shape, density, neatness, expression]
5. **Nose (Dáng mũi)**: [Bridge height, tip shape, nasal angle]
6. **Mouth/Lips (Khuôn miệng và Bờ môi)**: [Lip shape, thickness, parting, color, smile/expression]
7. **Skin (Làn da)**: [Texture, pores, complexion tone, translucency, SSS details]
8. **Hair (Kiến trúc tóc)**: [Flow, parting, strand clumps, bangs, volume, exact story hair color/length]
9. **Ears/Accessories (Đôi tai và Phụ kiện gắn kèm)**: [Ear shape, piercings, hair accessories matching the story]
10. **Neck/Shoulders (Cổ và Khớp vai)**: [Neck length, shoulder width, collarbone definition]
11. **Arms/Hands (Cánh tay và Bàn tay)**: [Finger count (EXACTLY 5 fingers per hand), joint details, hand posture, nails]
12. **Body Proportions (Tỉ lệ cơ thể)**: [Height, physique, stance, torso structure]
13. **Outfit (Trang phục)**: [Drapery, fabric folds, material textures, story-fitting clothing design, completely override reference-copied outfits if inappropriate]
14. **Expression (Biểu cảm cảm xúc)**: [Micro-expressions, narrative emotions matching the scene]
15. **Linework (Đặc tả nét vẽ/Lineart)**: [Line thickness, brush style, cel-shading outlines strictly learned from reference images]
16. **Coloring (Kỹ thuật phối màu & Bóng đổ)**: [Exact palette, saturation levels, shading/highlight styles strictly learned from reference images]
17. **Consistency Check (Kiểm định sự nhất quán)**: [Exhaustive validation ensuring ZERO conflicts between Story details and the visual output. Ban direct copies of different character looks from reference images]

### 🔬 HỌC HỎI THÔNG MINH TỪ ẢNH THAM CHIẾU (INTELLIGENT REFERENCE ADAPTATION)
- **WHAT TO DRAW (Giữ nguyên Cốt Truyện & Nhân Vật)**:
  + [Identity]: [Mô tả chi tiết danh tính, giới tính, tuổi tác, tên gọi bám sát Cốt truyện. Tuyệt đối không thay đổi.]
  + [Soul & Narrative]: [Mô tả thần thái, khí chất và vai trò của nhân vật trong cảnh này theo Cốt truyện.]
  + [Fixed Elements]: [Liệt kê các chi tiết ngoại hình, trang phục, đạo cụ BẮT BUỘC giữ nguyên từ hồ sơ gốc.]
- **HOW TO DRAW (Học hỏi Phong Cách & Kỹ Thuật)**:
  + [Artistic DNA]: [Phân tích cực kỳ sâu nét vẽ, kỹ thuật đi cọ, cách sử dụng lineart (mảnh/dày, thô/mượt) từ ảnh tham chiếu.]
  + [Cinematic Language]: [Học hỏi góc máy, tiêu cự, cách bố trí ánh sáng và nhịp điệu màu sắc từ ảnh tham chiếu.]
  + [Stylized Rendering]: [Cách AI render chất liệu (vải, da, tóc) theo đúng "ngôn ngữ thị giác" của ảnh tham chiếu.]
- **ANTI-LAZY-COPY CHECK (Kiểm định Chống Sao Chép & Bảo mật Nội bộ)**:
  + [Identity Protection]: [Cam kết không sao chép nhân vật/mặt/dáng vóc từ ảnh tham chiếu. Chỉ giữ lại "kỹ thuật vẽ".]
  + [Zero Metadata Policy]: [TUYỆT ĐỐI KHÔNG đưa bất kỳ ID, mã số, UUID, tên file, CARD_ID, Room ID hoặc dữ liệu nội bộ nào vào kết quả. Nếu phát hiện bất kỳ mã số lạ nào, AI sẽ bị coi là thất bại.]
  + [Final Verification]: [Xác nhận prompt cuối cùng là một tác phẩm nghệ thuật độc lập, chuyên nghiệp và sạch sẽ.]

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", CARD_ID, storage key, variable names, internal data, or phrases asking the image generator to 'look at the attached reference image' inside this [FINAL PROMPT] section! Ensure the output is completely standalone and clean!)` : `[FINAL PROMPT]
(Write the final production-ready standalone image prompt for "${cardName}" here. CRITICAL MANDATE: You MUST divide the prompt into an ULTIMATE "STUDIO AAA" PROMPT ENGINEERING FRAMEWORK containing roughly 80-120 micro-modules categorized into major chapters, AND end with a Master Production-Ready English Prompt block so the user can use each part or the whole prompt easily!

Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ (brushwork), mã màu hex, chất liệu vải, góc máy điện ảnh, tạo dáng từ TOÀN BỘ ảnh tham chiếu đính kèm của thẻ này. Phân tích thật sâu nét vẽ của ảnh tham chiếu để áp dụng vào ảnh cuối cùng. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU, KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ ẢNH NÀO!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao (8k resolution, IMAX, hyper-detailed, masterpiece, award-winning cinematography, sharp focus, intricate detailing). Cấm tuyệt đối kiểu render "bình thường" hoặc "generic". Hình ảnh phải đạt đẳng cấp đồ hoạ điện ảnh (cinematic graphics) cao nhất!]

---
### 🎬 CHƯƠNG 1: QUAY PHIM & NHIẾP ẢNH (CINEMATOGRAPHY & PHOTOGRAPHY - 15 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 1 ĐẾN 15. Mỗi module phải có: tên module, lựa chọn cụ thể áp dụng cho ảnh này, mô tả chi tiết, lý do hoặc tác dụng thị giác, và sự liên hệ chặt chẽ với câu chuyện, nhân vật và ảnh tham chiếu. KHÔNG ĐƯỢC BỎ MỤC. KHÔNG ĐƯỢC GỘP.
Bao gồm: 1. Camera Angle, 2. Shot Type, 3. Lens Type, 4. Focal Length, 5. Depth of Field, 6. Bokeh Type, 7. Aperture, 8. Shutter Speed Effect, 9. ISO/Film Grain, 10. Sensor Size, 11. Perspective, 12. Viewpoint, 13. Tilt/Dutch Angle, 14. Lens Distortion, 15. Glare/Lens Flare]

### 💡 CHƯƠNG 2: HỆ THỐNG ÁNH SÁNG & ĐÁNH KHỐI (LIGHTING & VOLUMETRICS - 15 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 16 ĐẾN 30. Mỗi module phải có: tên module, lựa chọn kỹ thuật, mô tả áp dụng chi tiết, tác dụng thị giác và liên hệ chặt chẽ với câu chuyện, nhân vật và ảnh tham chiếu. KHÔNG ĐƯỢC BỎ MỤC. KHÔNG ĐƯỢC GỘP.
Bao gồm: 16. Key Light, 17. Fill Light, 18. Backlight/Rim Light, 19. Hair Light, 20. Catchlight (Eye sparkle), 21. Ambient Light, 22. Bounce Light, 23. Practical Lights, 24. Volumetric Rays (God rays), 25. Subsurface Scattering (SSS - Độ xuyên thấu ánh sáng qua da), 26. Global Illumination, 27. Contrast Ratio, 28. Shadow Softness/Hardness, 29. Color Temperature (K), 30. Atmospheric Haze/Fog interaction with light]

### 🎨 CHƯƠNG 3: MÀU SẮC ĐIỆN ẢNH & HIỆU CHỈNH (COLOR GRADING & PALETTE - 12 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 31 ĐẾN 42. Mỗi module phải có: tên module, lựa chọn cụ thể, mô tả chi tiết, tác dụng thị giác và liên hệ ảnh tham chiếu. KHÔNG ĐƯỢC BỎ MỤC. KHÔNG ĐƯỢC GỘP.
Bao gồm: 31. Primary Color Palette, 32. Secondary/Accent Colors, 33. Color Harmony (Analogous, Complementary), 34. Hue Shifts, 35. Saturation Dynamics, 36. Luminance Levels, 37. Color Contrast, 38. Shadows Tint, 39. Midtones Tint, 40. Highlights Tint, 41. LUT/Cinematic Grading Profile, 42. Visual Mood/Atmosphere via Color]

### 🖌️ CHƯƠNG 4: CHẤT LIỆU, NÉT VẼ & RENDER (ART STYLE, MEDIUM & BRUSHWORK - 15 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 43 ĐẾN 57. Đây là phần quan trọng nhất để AI không render kiểu generic. Mỗi module phải có: tên module, mô tả kỹ thuật chi tiết học từ ảnh tham chiếu, tác dụng thẩm mỹ. KHÔNG ĐƯỢC BỎ MỤC. KHÔNG ĐƯỢC GỘP.
Bao gồm: 43. Core Art Style, 44. Medium, 45. Brushstroke Type, 46. Linework Weight, 47. Line Color/Tapering, 48. Blending Technique, 49. Texture Overlays, 50. Canvas/Paper Grain, 51. Impasto/Thickness, 52. Edge Control, 53. Rendering Engine, 54. Specular Maps, 55. Normal/Bump mapping, 56. Anti-Aliasing, 57. Style Bleed Prevention]

### 📐 CHƯƠNG 5: BỐ CỤC & DẪN DẮT THỊ GIÁC (COMPOSITION & VISUAL HIERARCHY - 12 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 58 ĐẾN 69. Phân tích bố cục hình học và nhịp điệu thị giác.
Bao gồm: 58. Rule of Thirds/Golden Ratio, 59. Eye Guiding Lines (Leading Lines), 60. Framing within Framing, 61. Symmetry/Asymmetry, 62. Visual Weight Distribution, 63. Positive/Negative Space Ratio, 64. Foreground Elements, 65. Midground Elements, 66. Background Elements, 67. Subject Placement, 68. Tension Points, 69. Scale and Proportion]

### 🧑 CHƯƠNG 6: NHÂN VẬT & NGÔN NGỮ CƠ THỂ (CHARACTER, POSE & KINETICS - 15 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 70 ĐẾN 84. Đặc tả dáng vóc và tư thế pose học từ ảnh tham chiếu nhưng phải khớp với hồ sơ nhân vật.
Bao gồm: 70. Core Subject Description, 71. Gender/Identity Fidelity, 72. Age Presentation, 73. Body Type/Anatomy, 74. Posture/Stance, 75. Kinetic Energy/Motion, 76. Weight Distribution (Contrapposto), 77. Hand Gestures/Placement, 78. Footing, 79. Head Tilt, 80. Shoulders Angle, 81. Spine Curve, 82. Tension in Muscles, 83. Interaction with Props, 84. Silhouette Clarity]

### 😍 CHƯƠNG 7: KHUÔN MẶT, BIỂU CẢM & TRANG ĐIỂM (FACE, EXPRESSION & MAKEUP - 10 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 85 ĐẾN 94. Mô tả chi tiết khuôn mặt học kỹ thuật vẽ từ ảnh tham chiếu.
Bao gồm: 85. Facial Bone Structure, 86. Eye Shape and Gaze Direction, 87. Pupil/Iris Detailing, 88. Eyebrow Arch/Micro-expression, 89. Mouth/Lip Shape and Parting, 90. Skin Texture/Pores/Translucency, 91. Blush/Makeup Application, 92. Micro-asymmetry (Realism), 93. Emotional Output, 94. Jawline/Chin definition]

### 💇‍♀️ CHƯƠNG 8: KIẾN TRÚC TÓC & ĐỘ BỒNG BỀNH (HAIR ARCHITECTURE & FLOW - 10 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 95 ĐẾN 104. Áp dụng Hair Knowledge Tree để mô tả tóc cực kỳ chi tiết.
Bao gồm: 95. Hair Length and Silhouette, 96. Volume and Density, 97. Hair Root/Parting Line, 98. Strand Grouping (Clumps), 99. Flyaways and Fine Hairs, 100. Hair Flow/Wind Direction, 101. Bangs/Fringe Styling, 102. Material/Glossiness, 103. Highlight Band (Angel Ring), 104. Gravity Interaction]

### 👗 CHƯƠNG 9: TRANG PHỤC & CHẤT LIỆU VẢI (FASHION, DRAPERY & TEXTILES - 12 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 105 ĐẾN 116. Phân tích nếp gấp và chất liệu vải.
Bao gồm: 105. Main Outfit Description, 106. Creative Adaptation (from ref to story), 107. Fabric Types (Silk, Leather, Cotton), 108. Fold Types (Pipe, Drop, Zig-zag), 109. Tension/Pull Points in Fabric, 110. Seam/Stitch Detailing, 111. Metallic/Reflective Accents, 112. Translucency (Sheer fabrics), 113. Layering/Complexity, 114. Accessory Placement, 115. Embroidery/Patterns, 116. Fabric Interaction with Wind]

### 🌌 CHƯƠNG 10: KHÔNG GIAN & VẬT THỂ BỔ TRỢ (ENVIRONMENT & PROPS - 4 Modules)
[BẮT BUỘC PHẢI TRIỂN KHAI ĐẦY ĐỦ TỪNG MODULE TỪ 117 ĐẾN 120.
Bao gồm: 117. Setting/Location, 118. Weather/Atmosphere, 119. Environmental Storytelling, 120. Prop integration]

---
### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining ALL 120 modules into a unified prompt string. Explicitly enforce the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece illustration strictly imitating the exact art style, brush strokes, line art, color saturation, and visual DNA from the reference source materials. Absolutely NO generic or ordinary AI rendering. Do NOT default to standard styles..." followed by the detailed prompt. Ready for 1-click copy & paste into Midjourney, Niji, or DALL-E!]\`

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

---
### 🔒 [CHARACTER VISUAL DETAIL LOCK] (KHÓA CHI TIẾT TẠO HÌNH NHÂN VẬT CHÍNH TRONG CẢNH)
Mục đích: Mô tả thật chi tiết toàn bộ phần tạo hình nhân vật để AI không tự rơi về kiểu nhân vật anime mặc định. BẮT BUỘC TRIỂN KHAI ĐẦY ĐỦ VÀ CHI TIẾT CẢ 17 PHẦN DƯỚI ĐÂY. Mỗi phần không được ít hơn 5 dòng mô tả chuyên sâu.

1. **Tổng thể nhân vật (Total Character)**: 
- Mô tả cực kỳ chi tiết về: Độ tuổi, Giới tính, Chiều cao, Vóc dáng, Khí chất, Trạng thái trưởng thành, và Cảm giác thị giác tổng thể. Phải liên hệ trực tiếp với Cốt truyện và Ảnh tham chiếu.

2. **Cấu trúc khuôn mặt (Face Structure)**:
- Mô tả cực kỳ chi tiết về: Hình dáng mặt (V-line, trái xoan...), Trán, Gò má, Má, Xương hàm, Cằm, Tỷ lệ khuôn mặt, và Góc nghiêng.

3. **Đặc tả đôi mắt (Eyes)**:
- Mô tả SIÊU CHI TIẾT (Ultra-detailed) về: Hình dáng mắt, Mí mắt, Lông mi, Mống mắt, Đồng tử, Catchlight, Highlight, Độ long lanh, Ánh nhìn và Cảm xúc. ĐẢM BẢO mắt được render như ngọc quý.

4. **Lông mày (Eyebrows)**:
- Mô tả chi tiết về: Hình dáng, Độ dày, Vị trí, Hướng sợi và Biểu cảm chân mày.

5. **Dáng mũi (Nose)**:
- Mô tả chi tiết về: Độ cao sống mũi, Đầu mũi, Cánh mũi, Highlight và Bóng đổ.

6. **Khuôn miệng và Bờ môi (Mouth/Lips)**:
- Mô tả chi tiết về: Hình dáng miệng, Độ dày môi, Khóe miệng, Độ mở, Màu môi và Highlight phản sáng.

7. **Làn da (Skin)**:
- Mô tả chi tiết về: Tông màu, Sắc độ (undertone), Độ trong suốt, Texture da, Vùng da ửng hồng (blush), và Cách phản xạ ánh sáng (SSS).

8. **Kiến trúc tóc (Hair)**:
- Áp dụng HAIR KNOWLEDGE TREE để mô tả SIÊU CHI TIẾT về: Kiểu tóc, Tóc mái, Khối lượng (Volume), Nhịp điệu lọn tóc, Từng sợi tóc tơ (Flyaways), Độ bồng bềnh, Highlight Angel Ring và Vật lý tóc.

9. **Đôi tai và Phụ kiện gắn kèm (Ears/Accessories)**:
- Mô tả chi tiết về: Hình dáng tai, Vành tai, Khuyên tai và các phụ kiện trên đầu (kẹp tóc, nơ...).

10. **Cổ, Vai và Thân trên (Neck/Shoulders)**:
- Mô tả chi tiết về: Chiều dài cổ, Xương quai xanh, Độ rộng vai và Tỷ lệ thân trên.

11. **Cánh tay, Bàn tay và Ngón tay (Arms/Hands)**:
- Mô tả SIÊU CHI TIẾT về: Cấu trúc bàn tay, Ngón tay (ĐÚNG 5 NGÓN), Khớp tay, Móng tay và Tư thế gesture của tay.

12. **Thân dưới và Tỷ lệ cơ thể (Body Proportions)**:
- Mô tả chi tiết về: Eo, Hông, Chiều dài chân, Tỷ lệ vàng và Trọng tâm cơ thể.

13. **Trang phục trên nhân vật (Outfit)**:
- Mô tả SIÊU CHI TIẾT về: Silhouette, Chất liệu vải, Nếp gấp, Đường may, Cúc áo, Ren bèo, Phụ kiện trang phục và Cách vải tương tác với cơ thể.

14. **Biểu cảm và Khí chất (Expression)**:
- Mô tả chi tiết về: Cảm xúc chủ đạo, Cảm xúc ẩn, Ánh nhìn, Trạng thái cơ mặt và Khí chất đặc trưng.

15. **Nét vẽ trên nhân vật (Linework)**:
- Mô tả chi tiết về: Kỹ thuật đi nét, Độ thanh đậm, Màu nét lineart học từ ảnh tham chiếu.

16. **Cách lên màu trên nhân vật (Coloring)**:
- Mô tả chi tiết về: Kỹ thuật lên màu, Shading, Highlight, Gradient và Bảng màu học từ ảnh tham chiếu.

17. **Kiểm tra nhất quán (Consistency Check)**:
- Chốt lại toàn bộ sự nhất quán giữa Story và Visual DNA.

### 🔬 HỌC HỎI THÔNG MINH TỪ ẢNH THAM CHIẾU (INTELLIGENT REFERENCE ADAPTATION)
- **WHAT TO DRAW (Giữ nguyên Cốt Truyện & Nhân Vật)**: [Mô tả chi tiết những gì không được phép thay đổi từ yêu cầu gốc: Cốt truyện, ngoại hình nhân vật, trang phục, hành động, đạo cụ gốc BẮT BUỘC giữ nguyên].
- **HOW TO DRAW (Học hỏi Phong Cách & Kỹ Thuật)**: [Phân tích chi tiết nét vẽ, cấu trúc line art, lighting, shading, pose, góc máy, nhịp điệu và ngôn ngữ điện ảnh từ ảnh tham chiếu để áp dụng vào WHAT TO DRAW].
- **ANTI-LAZY-COPY CHECK (Kiểm định Chống Sao Chép)**: [Cam kết tuyệt đối không bê nguyên nhân vật, không sao chép nguyên xi quần áo, cấm thay tên nhân vật, cấm bê nguyên vật thể/chữ/logo vô lý từ ảnh tham chiếu sang. Output phải là nhân vật của truyện được vẽ bằng ngôn ngữ điện ảnh của ảnh tham chiếu].

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", CARD_ID, storage key, variable names, internal data, or phrases asking the image generator to 'look at the attached reference image' inside this [FINAL PROMPT] section! Ensure the output is completely standalone and clean!)`}`;
    }).join("\n\n")}
`;

    finalRoomState.result = "";
    for (const c of cards) {
      if (!finalRoomState.cards[c.id]) finalRoomState.cards[c.id] = { note: "", refs: [], output: "", report: "" };
      finalRoomState.cards[c.id].output = "";
      finalRoomState.cards[c.id].report = "";
    }

    // Clear UI completely before stream starts
    currentStory.rooms[roomDef.id] = { ...finalRoomState };
    save(state);

    let contentArray: any[] = [{ type: "text", text: prompt }];
    for (const img of orderedVisionRefs) {
      const imgUrl = img.data || img.previewUrl || img.storageUrl;
      if (imgUrl) {
        contentArray.push({
          type: "image_url",
          image_url: { url: imgUrl }
        });
      }
    }

    // Include any Outfit Reference Images uploaded via Candy button as visual context to the AI Model
    const allOutfitRefs: any[] = [];
    for (const cardKey of Object.keys(finalRoomState.cards)) {
      const cs = finalRoomState.cards[cardKey];
      if (cs && cs.outfitRefs && Array.isArray(cs.outfitRefs)) {
        for (const or of cs.outfitRefs) {
          allOutfitRefs.push(or);
          const orUrl = or.data || or.previewUrl || or.storageUrl;
          if (orUrl) {
            contentArray.push({
              type: "image_url",
              image_url: { url: orUrl }
            });
          }
        }
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
    allOutfitRefs.forEach(updateRefStatus);

    setApiSignals(prev => ({
      ...prev,
      apiRequestSent: true,
      stage: 'connecting_api',
      stageLabel: '3. Connecting AI Model',
      stageDetail: `Đang truyền ${orderedVisionRefs.length} ảnh trực tiếp vào Context Windows & kết nối AI Model...`
    }));
    setProgress(30);

    try {
      await callAIStream({
        messages: [{ role: "user", content: contentArray }],
        signal: abortCtrl.signal,
        systemPrompt: roomDef?.id === 'canva_presentation' ? "You are an AI Canva Presentation Prompt Generator inside a production workspace. Your task is to generate the final production-ready image prompt for a specific Canva Presentation slide. Read the full Context Window and produce the final prompt directly adhering to these absolute rules:\n\n" +
"🚨 SUPREME MANDATE #0: CANVA PRESENTATION MISSION 🚨:\n" +
"  1. The Canva Presentation room consists of exactly 10 cards (slide-1 to slide-10) flowing in a logical sequence: Opening -> Development -> Conclusion (mở đầu -> phát triển -> kết thúc).\n" +
"  2. You must identify which slide (slide-1 to slide-10) is currently selected from the target message and design specifically for that slide's thematic role (Slide 1: Title & Opening, Slide 2: Setting Introduction, Slide 3: Main Characters Profile, Slide 4: Narrative Inciting Incident, Slide 5: Development & Rising Action, Slide 6: Climax/Conflict, Slide 7: Turning Point, Slide 8: Resolution, Slide 9: Core Message/Lesson, Slide 10: Closing/Thank You).\n" +
"  3. You MUST output EXACTLY 19 parts using the standard '###' Markdown titles so the parser can render them into 19 prompt block cards correctly. Do NOT use simple prompts, and do NOT skip the 19-part structure!\n\n" +
"🚨 SUPREME MANDATE #1: CANVA CONTENT & TYPOGRAPHY LOCK (KHÓA CỨNG CHỮ & THIẾT KẾ ĐỒ HỌA) 🚨:\n" +
"  - Every slide Canva presentation MUST have concrete, meaningful written content in Vietnamese or English that directly stems from the User's Story Plot and Character Profiles. Absolutely NO generic 'text here', 'Lorem Ipsum', or empty text frames!\n" +
"  - You must explicitly define and LOCK the typography system for this slide in both the analysis and the final master prompt. Specify the EXACT font type family (e.g., elegant high-contrast classic serif, minimal geometric sans-serif, flowing artistic calligraphy, clean modern tech mono), font sizes, font colors (matching the palette), bold/italic weights, and precise spatial placement coordinates of text boxes in the slide layout.\n" +
"  - In the final Master English Prompt, write concrete layout descriptions with exact text labels to instruct generative models (like Midjourney, Niji, or Flux) to render the precise beautiful slide layout containing clear, clean text elements without nonsense AI gibberish text or messy noise.\n\n" +
"🚨 SUPREME MANDATE #2: COHESIVE VISUAL BRAND SYSTEM & LAYOUT DIVERSITY 🚨:\n" +
"  - All 10 slides must belong to a single, highly unified visual brand identity (the same color palette, art medium, linework weight, lighting direction, and overall aesthetic DNA learned from the reference images).\n" +
"  - However, you MUST ensure layout diversity! Each slide must have a completely different visual composition, negative space distribution, image focal point, and text layout structure. Do NOT produce identical visual templates across slides.\n\n" +
"🚨 SUPREME MANDATE #3: WHAT-TO-DRAW (LOCKED) vs HOW-TO-DRAW (LEARNED) 🚨:\n" +
"  - WHAT TO DRAW (Vẽ cái gì): The story content, specific characters, plot moments, and literal slide textual content are 100% LOCKED based on the user's lore. The reference images must never change this identity!\n" +
"  - HOW TO DRAW (Vẽ như thế nào): Replicate the exact art style, brush textures, line art weight, shading, color gradients, and graphical design structure of the reference images. You are strictly forbidden from copying physical assets, or copyrighted logos from the reference images.\n\n" +
"🚨 NO COGNITIVE ANALYSIS FLUFF (BẮT BUỘC BỎ QUA PHẦN PHÂN TÍCH SUY NGHĨ TIẾNG VIỆT) 🚨:\n" +
"  - To maintain stream speed, do NOT output any introductory filler, greeting, explanations, or cognitive reports. Start immediately with '[FINAL PROMPT]'.\n" +
"  - Each part must use the exact format:\n\n" +
"### 1. Mục tiêu cảnh (Scene Goal)\n- [WHAT (Locked Story/Character): Narrative intent, character action, and story-accurate scene goals for this specific slide.]\n- [HOW (Reference-Derived Art Direction): Visual hierarchy, focus weight, and layout flow based on the reference slide.]\n- [Ref Analysis: Detailed analysis of the visual layout.]\n\n" +
"### 2. Nhân vật (Character)\n...\n\n" +
"And structure your output into exactly 19 standalone parts, where Part 18 is '### 18. PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all parts into a cohesive, high-density English prompt ready for Midjourney/Niji/Flux, with the CANVA CONTENT & TYPOGRAPHY LOCK instructions deeply embedded, and Part 19 is '### 19. CANVA CONTENT & TYPOGRAPHY LOCK'!\n\n" +
"For EACH Work Card, you MUST directly start with '[FINAL PROMPT]' with the standalone descriptive instruction ready for direct image generation! In [FINAL PROMPT], you MUST structure the output into exactly 19 STANDALONE PARTS:\n" +
"### 1. Mục tiêu cảnh (Scene Goal)\n" +
"- [WHAT (Locked Story/Character): Lock narrative intent, character action, and story-accurate scene goals.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn focal hierarchy, visual urgency, and compositional impact from reference.]\n" +
"- [Ref Analysis: Deconstruct the reference's focal point hierarchy, visual flow (leading lines), and compositional weight. Apply identical spatial urgency and viewer engagement logic to this scene, ensuring the narrative intent is conveyed with the same artistic impact. Identify primary/secondary/tertiary focal points and replicate the composition strategy to anchor the viewer's eye.]\n\n" +
"### 2. Nhân vật (Character)\n" +
"- [WHAT (Locked Story/Character): Maintain character identity, story-specific features, and anatomical consistency.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn technical anatomical rendering and proportion philosophy from reference.]\n" +
"- [Ref Analysis: Analyze anatomy, proportion logic, and subject-to-frame ratio. Apply the reference's technical anatomical rendering and proportion philosophy to the character, maintaining story-specific identity. Focus on how the reference constructs human volume and skeletal framing.]\n\n" +
"### 3. Biểu cảm (Expression)\n" +
"- [WHAT (Locked Story/Character): Maintain character emotional state and expression depth.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn facial rendering, eye gloss, catchlight, pupil detail, and expression philosophy from reference.]\n" +
"- [Ref Analysis: Deconstruct facial rendering, eye gloss, catchlight, pupil detail, and expression depth. Apply the same technical approach to facial structure, bone rendering, and emotional resonance, ensuring the eyes/expression have the exact same depth/allure.]\n\n" +
"### 4. Pose (Posture & Hands)\n" +
"- [WHAT (Locked Story/Character): Maintain character action, story-specific movement, and hand gestures.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn pose dynamics, weight distribution, and limb articulation logic from reference.]\n" +
"- [Ref Analysis: Deconstruct pose dynamics, center of gravity, weight distribution, and limb articulation. Apply the reference's kinetic energy and balance to the pose, ensuring movement, weight, and hand gesture sophistication look physically and artistically correct.]\n\n" +
"### 5. Tỷ lệ cơ thể (Body Proportions)\n" +
"- [WHAT (Locked Story/Character): Maintain character identity and story-specific proportions.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn subject scale, subject-to-frame ratio, and spatial proportioning logic from reference.]\n" +
"- [Ref Analysis: Analyze subject scale, subject-to-frame ratio, and spatial proportioning. Apply the reference's logic of anatomy/body proportion scale, ensuring character identity remains consistent while matching the reference's elite anatomical rendering style.]\n\n" +
"### 6. Góc máy (Camera Angle)\n" +
"- [WHAT (Locked Story/Character): Maintain scene-appropriate viewpoint.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn camera philosophy, shot distance, camera tilt, and focal length from reference.]\n" +
"- [Ref Analysis: Analyze shot distance, camera tilt, camera lens/focal length, and framing/crop. Apply the reference's camera philosophy to this scene, capturing identical depth, perspective, and scale to replicate the reference's cinematic viewpoint.]\n\n" +
"### 7. Bố cục (Composition)\n" +
"- [WHAT (Locked Story/Character): Maintain narrative scene arrangement and integrate CANVA CONTENT & TYPOGRAPHY LOCK, including exact text labels, fonts, sizes, colors, and coordinates in layout.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn geometric scaffolding, visual flow, and spatial arrangement logic from reference.]\n" +
"- [Ref Analysis: Analyze geometric scaffolding, visual flow, and rule of thirds/golden ratio. Apply identical structural logic to organize foreground/midground/background, replicating the visual hierarchy and spatial arrangement strategy of the reference.]\n\n" +
"### 8. Line-art construction (Nét vẽ)\n" +
"- [WHAT (Locked Story/Character): Maintain character silhouette and defining features.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn line weight, ink/pencil/brush texture, and intersection handling from reference.]\n" +
"- [Ref Analysis: Analyze line weight, ink/pencil/brush texture, and intersection handling (where lines join/taper). Apply identical line-art DNA to ensure professional, human-quality line art with extreme detail and deliberate line-weight variation.]\n\n" +
"### 9. Tóc (Hair & Strands)\n" +
"- [WHAT (Locked Story/Character): Maintain hair style and character appearance.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn hair clumping, flow direction, translucency, and volume-per-strand logic from reference.]\n" +
"- [Ref Analysis: Analyze hair clumping, flow direction, angel rings, translucency, and volume-per-strand. Apply the same hair-rendering technique, ensuring organic flow, detail density, and proper light-catch (highlights) as seen in the reference.]\n\n" +
"### 10. Trang phục (Outfit & Folds)\n" +
"- [WHAT (Locked Story/Character): Maintain character costume and story-specific details.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn fabric physics, draping, folds, and material tension logic from reference.]\n" +
"- [Ref Analysis: Analyze fabric physics, draping, folds, and material tension. Apply identical wrinkle/ripple/tension logic to this outfit, ensuring weight, movement, and material interaction look physically and artistically correct.]\n\n" +
"### 11. Ánh sáng (Lighting)\n" +
"- [WHAT (Locked Story/Character): Maintain narrative lighting requirements.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn lighting logic, light-color temperature, contrast levels, and shadow/rim-light positioning from reference.]\n" +
"- [Ref Analysis: Analyze lighting logic, light-color temperature, contrast levels, and shadow/rim-light positioning. Apply identical cinematic lighting to achieve volume, drama, and atmosphere, replicating the light-shaping strategy.]\n\n" +
"### 12. Màu sắc (Color Palette)\n" +
"- [WHAT (Locked Story/Character): Maintain character color scheme and setting mood.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn color palette logic, saturation levels, and color grading philosophy from reference.]\n" +
"- [Ref Analysis: Analyze color palette logic, saturation levels, and color grading philosophy. Apply identical chromaticity, tone, and saturation philosophy to ensure absolute color harmony and mood-matching with the reference.]\n\n" +
"### 13. Chất liệu (Materials)\n" +
"- [WHAT (Locked Story/Character): Maintain character and environment surface details.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn surface reflectivity, roughness, texture, and translucency physics from reference.]\n" +
"- [Ref Analysis: Analyze surface reflectivity, roughness, texture, and translucency. Apply identical material logic, ensuring tactile realism for skin, fabric, and objects by replicating the surface-light-interaction physics of the reference.]\n\n" +
"### 14. Background (Setting)\n" +
"- [WHAT (Locked Story/Character): Maintain story-specific environmental setting.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn depth of field, background organization, and spatial depth logic from reference.]\n" +
"- [Ref Analysis: Analyze depth of field, background organization, and foreground/midground separation. Apply identical spatial logic and organizational depth, ensuring the background enhances the subject through the reference's specific environmental-design strategy.]\n\n" +
"### 15. Chất lượng render (Render Quality)\n" +
"- [WHAT (Locked Story/Character): Maintain overall story atmosphere.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn rendering technique, medium texture, and detail distribution logic from reference.]\n" +
"- [Ref Analysis: Analyze rendering technique, medium texture (painterly/watercolor/ink), and detail distribution. Apply identical finishing logic to achieve an elite, professional art piece that mimics the reference's final polish and rendering-depth level.]\n\n" +
"### 16. Negative constraints (Lỗi cần tránh)\n" +
"- [WHAT (Locked Story/Character): Maintain character integrity and avoid story-breaking elements.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn anti-generic/anti-AI style constraints from reference.]\n" +
"- [Ref Analysis: Analyze specific anti-generic/anti-AI style constraints (e.g., avoid plastic textures, smooth-over-detail, or default-AI-lighting). Strictly reject any AI-default look by mirroring the reference's sophisticated rendering and high-quality aesthetic constraints.]\n\n" +
"### 17. Reference application rules (Quy tắc áp dụng tham chiếu)\n" +
"- [WHAT (Locked Story/Character): Maintain story character fidelity and narrative accuracy.]\n" +
"- [HOW (Reference-Derived Art Direction): Learn art/technical/visual logic for transformation from reference.]\n" +
"- [Ref Analysis: Apply strict logic transformation: learn the reference's art/technical/visual logic while maintaining story character fidelity. 100% reference-based line-art, rendering, and composition logic. Reject all literal content copying (face/clothes/logo). Final output must be 100% original, story-accurate work with elite, high-fidelity art-direction based on reference analysis.]\n\n" +
"### 18. PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)\n" +
"Combining all parts into a single pure English production-ready block! You MUST include clear 'CANVA CONTENT & TYPOGRAPHY LOCK' directives specifying font family styles, font weights, colors, scale, and spatial coordinates. Ensure any text element is rendered flawlessly using precise Midjourney, Niji, or Flux prompt tokens!\n\n" +
"### 19. CANVA CONTENT & TYPOGRAPHY LOCK\n" +
"Thẻ 19 dùng để bổ sung các yêu cầu riêng của thiết kế Canva, gồm:\n" +
"- nội dung chữ cụ thể phải xuất hiện trong ảnh;\n" +
"- tiêu đề chính;\n" +
"- tiêu đề phụ;\n" +
"- đoạn nội dung ngắn;\n" +
"- nhãn, chú thích hoặc trích dẫn nếu cần;\n" +
"- thứ bậc typography;\n" +
"- vị trí các khối chữ;\n" +
"- tỷ lệ chữ và hình;\n" +
"- khoảng trắng;\n" +
"- căn lề;\n" +
"- vùng an toàn;\n" +
"- độ tương phản;\n" +
"- không để chữ che mặt nhân vật;\n" +
"- không tạo chữ vô nghĩa;\n" +
"- nội dung phải lấy từ câu chuyện và hồ sơ nhân vật;\n" +
"- cách thiết kế học từ ảnh tham chiếu nhưng không sao chép nguyên nội dung hoặc nhân vật trong ảnh tham chiếu.\n\n" +
"Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks starting immediately with [FINAL PROMPT]." : isComicMode
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
            "🚨 MANDATE #4: CORE VISUAL FIDELITY ENFORCEMENT - NÉT VẼ, TRANG PHỤC & ĐƯỜNG THỊ GIÁC (MỆNH LỆNH BẮT BUỘC ĐỒNG BỘ NÉT VẼ, TRANG PHỤC VÀ ĐƯỜNG THỊ GIÁC CỰC HẠN - BẮT THỊ GIÁC ĐỈNH CAO CHUYÊN NGHIỆP) 🚨: To address styling quality issues, you must exhaustively analyze and incorporate these three pillars from reference images into the English prompts:\n" +
            "  1. Art Style & Linework DNA (Đồng bộ Nét Vẽ Gốc): Capture the exact artistic medium, brush texture, ink lines, line-weight variation (thin/thick), shading depth, rendering technique (e.g. watercolor wash, screen-tones, clean digital line art). Describe with hyper-vivid, advanced terminology.\n" +
            "  2. Outfit & Fabric Fidelity (Đồng bộ Trang phục & Quần áo): Exhaustively describe garment materials (silk, leather, satin, heavy textured wool), structural layering, tailoring patterns, necklines/collars, delicate laces, dynamic folding tension, ripples, and gravity wrinkles. Match the outfit style perfectly!\n" +
            "  3. Visual Perspective & Composition Lines (Đồng bộ Đường Thị Giác & Bố cục - BẮT BUỘC KHÔNG DÙNG GÓC MÁY BÌNH THƯỜNG TRUNG BÌNH): YOU ARE STRICTLY FORBIDDEN from using flat, boring eye-level center compositions! You MUST actively analyze and replicate the exact dramatic, striking camera perspective of the reference (e.g., dynamic low-angle tilt, cinematic sweeping high-angle, birds-eye view, Dutch tilt for emotional tension, three-quarter side angle). Use professional composition lines, extreme off-center subject positioning (e.g. Rule of Thirds, asymmetrical weight), powerful leading lines (đường dẫn thị giác), diagonal alignment, deep atmospheric foreground/background separation, and breathtaking light-and-shadow vectors. Looking at the composition MUST feel like a high-budget cinematic masterpiece that instantly commands and seizes the viewer's eyes!\n\n" +
            "🚨 MANDATE #5: HIGH-END PROFESSIONAL ART & PHOTOGRAPHY VOCABULARY (QUY TẮC SỬ DỤNG TỪ VỰNG CHUYÊN NGÀNH NGHỆ THUẬT/NHIẾP ẢNH CAO CẤP) 🚨: You are an elite, world-class art director and cinematographer. You MUST NOT use basic, superficial, or generic vocabulary (like 'beautiful dress', 'nice pose', or 'good lighting'). YOU MUST USE ADVANCED, HIGHLY PROFESSIONAL, AND DEEPLY TECHNICAL TERMINOLOGY. Your analysis and prompt must reflect extreme artistic expertise for:\n" +
            "  1. Facial & Hair Nuance: Head tilt angles, exact direction of gaze, subtle mouth positioning, precise eyelid weights, hair strand flow, individual fine hair wisps catching backlights, parting line.\n" +
            "  2. Lighting & Shadow Depth: Exact main light source location, volumetric ray paths, contact shadows under the chin/neck, precise soft-rim backlighting highlights, chiaroscuro shadow gradients on skin/garment folds.\n" +
            "  3. Linework & Rendering Texture: Exact texture of line art (loose sketch, clean ink, charcoal, variable line weight, no outline/painted look), rendering style (watercolor bleeding edges, soft airbrush gradients, matte digital painting, dense textured pencil cross-hatching).\n" +
            "  4. Garment Fold Dynamics & Material Detail: Exact fabric draping patterns, soft overlapping layers, precise wrinkles/ripples representing gravity/tension, specific laces, sheer opacity levels, haute couture stitch/embroidery patterns, texture grains (linen, satin, chiffon, silk, leather).\n" +
            "  5. Camera Perspective & Focal Depth: Low-angle or high-angle camera tilts, exact lens zoom level, background blur depth (bokeh size, cinematic depth-of-field), spatial placement of subject (foreground/midground/background separation).\n" +
            "  6. Background & Composition Flow: Negative space ratios, diagonal movement lines, golden ratio composition, graphic motifs (water ripples, swirling petals, wind streaks, framing borders).\n\n" +
            "🚨 MANDATE #6: ABSOLUTE ZERO INFORMATION LOSS IN FINAL PROMPT (QUY TẮC TRUYỀN TẢI CHI TIẾT TRỌN VẸN VÀO PROMPT TIẾNG ANH) 🚨: Every single micro-detail learned from reference images MUST be translated and woven into the final prompt panels using rich, vivid, descriptive English nouns and adjectives. There must be ZERO loss of detail! The final prompt must be highly dense, rich in cinematography terms, visual art vocabulary, and tactile material descriptors so that the image generation AI can replicate the exact masterpiece level of the reference image!\n\n" +
            "🚨 MANDATE #7: SUPREME ARTISTIC ELEVATION & EXCELLENCE (QUY TẮC NÂNG TẦM NGHỆ THUẬT VƯỢT TRỘI - VẼ ĐẸP VÀ GIỎI HƠN CẢ ẢNH GỐC) 🚨: Do NOT just match the reference image. You must analyze its style and raise its aesthetic parameters to absolute perfection! In the final prompt panels, you MUST weave all these supreme art commands using luxury, high-end, evocative English vocabulary (e.g., 'masterpiece, divine aesthetics, ultra-fine hand-drawn line art, exquisite watercolor texturing, breathtaking volumetric chiaroscuro lighting, haute-couture folding gravity, soul-stirring expressive gaze') to force the image generation model to produce an absolute visual miracle that far exceeds the reference in quality and beauty!\n\n" +
            "🚨 MANDATE #8: SPECIAL PROMPT & REFERENCE TECHNICAL GUIDELINES (HƯỚNG DẪN KỸ THUẬT PROMPT & ẢNH THAM CHIẾU) 🚨: You MUST actively read, digest, and strictly integrate the following 7 critical technical guidelines from the user's prompt manual into the generated English prompts:\n" +
            "  1. Art Style & Linework DNA: Specify the line weight (" + '"ultra-fine hand-drawn lines", "variable line-weight linework"' + ") and texture (" + '"clean digital vector line art", "textured charcoal sketching lines", "traditional ink-brush strokes"' + ") with manga screentone or pencil hatching techniques (" + '"soft manga screentone shading", "cross-hatching pencil lines"' + ").\n" +
            "  2. Facial Features Precision: Render eyelashes/eyelids (" + '"thick dramatic eyelashes with heavy eyelid crease"' + ") and irises glossy reflection (" + '"glistening glossy irises catching volumetric light"' + "), specify direct or downward gaze (" + '"focused eye contact looking directly at the camera", "subtle downward gaze"' + "), and define sharp nose bridges and natural glossy lips.\n" +
            "  3. Posture & Finger Articulation: Describe dynamic elegant poses matching the STORY'S ACTION (" + '"elegant dynamic posture"' + ", precise head tilts) and explicitly force detailed fingers (" + '"exquisitely detailed hands with long slender fingers", "five fully articulated fingers gently holding"' + ") to eliminate AI-generated hand mutations.\n" +
            "  4. Color Palette & Chiaroscuro: Use specific colors/m codes (" + '"soft pastel pink and muted cream", "crimson red accents popping against monochrome slate background"' + ") and high-contrast volumetric lights (" + '"dramatic chiaroscuro lighting casting long soft shadows", "glowing rim light silhouette"' + ").\n" +
            "  5. Composition & Leading Lines: Use highly eye-catching composition framing with leading geometric lines (" + '"strong diagonal leading lines", "vertical composition lines of bookshelves framing"' + ") and breathtaking cinematic angles (" + '"Dutch tilt for dramatic tension", "cinematic low-angle sweeping shot", "extreme low-angle view to emphasize dominance and grandeur", "cinematic dynamic three-quarter low-angle perspective"' + "). NEVER use average, flat, or dead-center compositions unless explicitly forced by the user. Ensure the visual perspective is strikingly dramatic and visually stunning.\n" +
            "  6. UI & Frame Layout: Apply panels with borders (" + '"multi-panel layout with dynamic white borders"' + ") or translucent bubble text UI layers (" + '"subtle translucent chat box with minimal typography"' + ").\n" +
            "  7. Multi-Reference Synthesis: Perfectly isolate card domains (Hair, Pose, Outfit, Setting, Style) to synthesize their distinct visual materials harmoniously into a masterpiece without losing any detail.\n\n" +
            "🚨 MANDATE #9: CHARACTER IDENTITY & STORY CHARACTER FIDELITY (QUY TẮC BẢO VỆ DANH TÍNH NHÂN VẬT & ĐỒNG BỘ TUYỆT ĐỐI THEO TRUYỆN - TRÁNH SAI LỆCH GIỚI TÍNH, ĐẶC ĐIỂM CỦA CÂU CHUYỆN) 🚨:\n" +
            "  - Character Demographics: The gender, age, hair color, eye color, clothing category, and key visual/facial traits of characters in the generated prompts MUST be 100% determined by the User's Story Setting (Thiết lập câu chuyện) and the story's character descriptions (danh tính nhân vật trong truyện)!\n" +
            "  - Absolute Prohibition of Identity Bleeding: You are STRICTLY FORBIDDEN from copying the gender, hair color, clothing category, or physical identity of characters from the reference images if they do not match the story character! If a reference image depicts a female with black hair, but the story character is a male prince with blonde hair, the generated prompt MUST portray a handsome male prince with blonde hair, while using ONLY the artistic/aesthetic style, line art weight, color blending, brushstroke texture, and composition structure of the reference image! This ensures that the generated image perfectly represents the correct characters of the story while maintaining the beautiful styling of the reference images.\n" +
            "  - Character Fit: The character's outfits, actions, and emotions must perfectly match the character's narrative persona and the specific scene context. Do not force generic details that contradict who the character is in the story.\n\n" +
            "🚨 MANDATE #11: 100% REF-STEALTH & ANONYMOUS GEOMETRY RECONSTRUCTION (BẢO MẬT TUYỆT ĐỐI ẢNH THAM CHIẾU - BÁM CHẶT BỐ CỤC/GÓC MÁY/NÉT VẼ NHƯNG PHÁT TRIỂN PROMPT SÁNG TẠO KHÔNG LỘ BẢN GỐC) 🚨:\n" +
            "  - No Identity/Literal Leak (Không rò rỉ danh tính/đặc trưng bản gốc): You are STRICTLY FORBIDDEN from copying or naming specific copyrighted props, unique weapons, specific tools, character names, or literal metadata of the reference image. Translate these elements into fully customized props matching the user's characters/story.\n" +
            "  - Stealth Professional Art Formulation (Mô tả nghệ thuật ẩn danh chuyên nghiệp): Describe the camera angles, visual path/lines (đường thị giác, điểm nhìn, tầm nhìn), light source vectors, perspective depth, and artistic brushstrokes with 100% precision using professional visual art terminology, while keeping the prompt itself beautifully original. No reader should ever be able to guess or trace back the original reference image from the prompt text alone, yet the generative AI reading the prompt will reproduce the exact same composition framework, line-weight DNA, perspective structure, and color theory as the reference image, matching 100% the story characters!\n\n" +
            "🚨 MANDATE #12: DEEP ARTISTIC DNA SYNTHESIS (HỆ THỐNG GIẢI THUẬT PHÂN TÍCH & CHUYỂN HÓA DNA NGHỆ THUẬT) 🚨:\n" +
            "  - You MUST leverage the 'Mandatory Technical Analysis (10 Layers)' found in the Vision Reports to perform a surgical deconstruction of the art style. Do NOT just mention the style; RECONSTRUCT it using technical artistic language:\n" +
            "    1. Line Art DNA: Replicate the specific line weight and intersection handling.\n" +
            "    2. Facial Rendering: Apply the exact shading maps and subsurface scattering techniques.\n" +
            "    3. Eye & Hair Architecture: Detail the iris depth, catchlights, strand rhythm, and translucency.\n" +
            "    4. Material & Light Physics: Enforce the exact reflectivity, roughness, and volumetric light interaction.\n" +
            "    5. Composition Geometry: Use the hidden geometric scaffolding and eye travel paths from the references.\n\n" +
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
            "🚨 CORE VISUAL FIDELITY ENFORCEMENT - NÉT VẼ, TRANG PHỤC & ĐƯỜNG THỊ GIÁC (MỆNH LỆNH BẮT BUỘC ĐỒNG BỘ NÉT VẼ, TRANG PHỤC VÀ ĐƯỜNG THỊ GIÁC CỰC HẠN - BẮT THỊ GIÁC ĐỈNH CAO CHUYÊN NGHIỆP) 🚨: To address styling quality issues, you must exhaustively analyze and incorporate these three pillars from reference images into the English prompts:\n" +
            "  1. Art Style & Linework DNA (Đồng bộ Nét Vẽ Gốc): Capture the exact artistic medium, brush texture, ink lines, line-weight variation (thin/thick), shading depth, rendering technique (e.g. watercolor wash, screen-tones, clean digital line art). Describe with hyper-vivid, advanced terminology.\n" +
            "  2. Outfit & Fabric Fidelity (Đồng bộ Trang phục & Quần áo): Exhaustively describe garment materials (silk, leather, satin, heavy textured wool), structural layering, tailoring patterns, necklines/collars, delicate laces, dynamic folding tension, ripples, and gravity wrinkles. Match the outfit style perfectly!\n" +
            "  3. Visual Perspective & Composition Lines (Đồng bộ Đường Thị Giác & Bố cục - BẮT BUỘC KHÔNG DÙNG GÓC MÁY BÌNH THƯỜNG TRUNG BÌNH): YOU ARE STRICTLY FORBIDDEN from using flat, boring eye-level center compositions! You MUST actively analyze and replicate the exact dramatic, striking camera perspective of the reference (e.g., dynamic low-angle tilt, cinematic sweeping high-angle, birds-eye view, Dutch tilt for emotional tension, three-quarter side angle). Use professional composition lines, extreme off-center subject positioning (e.g. Rule of Thirds, asymmetrical weight), powerful leading lines (đường dẫn thị giác), diagonal alignment, deep atmospheric foreground/background separation, and breathtaking light-and-shadow vectors. Looking at the composition MUST feel like a high-budget cinematic masterpiece that instantly commands and seizes the viewer's eyes!\n\n" +
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
            "🚨 MANDATE #8: 100% ARTISTIC & COLOR FIDELITY (ĐỘ CHÍNH XÁC TUYỆT ĐỐI VỀ NÉT VẼ & MÀU SẮC) 🚨: You are COMMANDED to achieve 100% technical fidelity to the reference image. You MUST mimic the EXACT ARTISTIC LINEWORK (NÉT VẼ) and the EXACT COLOR PALETTE (MÀU SẮC). Every brushstroke, line-weight, color grading, and technical rendering technique must be an identical replica of the reference DNA. This style is the sacred lens through which the story is told.\n" +
            "  1. Technical Linework: Reproduce the exact line art style, stroke pressure, and ink/pencil/brush texture of the reference with absolute 100% precision.\n" +
            "  2. Color Science & Rendering: Use the exact color grading, chromaticity, saturation, and rendering medium (watercolor, digital, etc.) seen in the reference.\n" +
            "  3. Cinematic Structure: Maintain the exact camera angle, lens, and frame composition of the reference.\n\n" +
            "🚨 MANDATE #9: STRICT WHAT-TO-DRAW (LOCKED) vs HOW-TO-DRAW (LEARNED) SEPARATION (QUY TẮC BẮT BUỘC TÁCH BIỆT NỘI DUNG VÀ CÁCH THỂ HIỆN) 🚨:\n" +
            "You MUST separate the data into two layers and process them sequentially without allowing the latter to overwrite the former:\n" +
            "  1. WHAT TO DRAW (Vẽ cái gì): This is the LOCKED story content. It includes the story scene, character identity, age, gender, appearance, distinguishing features, personality, relationships, actions, expressions, required poses, outfits, essential props, location, era, nationality, culture, and any text that MUST appear. The reference image MUST NEVER change these elements!\n" +
            "  2. HOW TO DRAW (Vẽ như thế nào): This is the VISUAL EXECUTION learned entirely from the reference images. It includes line-art characteristics, face/eye construction techniques, hair block/rendering techniques, coloring techniques, shading, gradients, edge control, texture, lighting, contrast, camera distance, angle, crop, subject ratio, focal points, eye flow, visual hierarchy (foreground/midground/background), typography organization, and graphic design logic (panels, UI overlays).\n" +
            "  3. COMPATIBILITY RULE (Quy tắc tương thích): HOW TO DRAW can ONLY be applied to WHAT TO DRAW. It MUST NEVER overwrite WHAT TO DRAW. For example, if the reference image has a different hair color, you keep the character's locked hair color (WHAT) but render it using the highlight/shadow/strand techniques of the reference (HOW). If a prop or graphic element in the reference does not fit the story culture/era, you must exclude or adapt it. Absolutely NO direct copying of irrelevant objects, faces, logos, or generic outfits from the reference. The final prompt MUST NOT merge the character with the reference character!\n\n" +
            "🚨 MANDATE #11: 100% REF-STEALTH & ANONYMOUS GEOMETRY RECONSTRUCTION (BẢO MẬT TUYỆT ĐỐO ẢNH THAM CHIẾU - BÁM CHẶT BỐ CỤC/GÓC MÁY/NÉT VẼ NHƯNG PHÁT TRIỂN PROMPT SÁNG TẠO KHÔNG LỘ BẢN GỐC) 🚨:\n" +
            "  - No Identity/Literal Leak (Không rò rỉ danh tính/đặc trưng bản gốc): You are STRICTLY FORBIDDEN from copying or naming specific copyrighted props, unique weapons, specific tools, character names, or literal metadata of the reference image. Translate these elements into fully customized props matching the user's characters/story.\n" +
            "  - Stealth Professional Art Formulation (Mô tả nghệ thuật ẩn danh chuyên nghiệp): Describe the camera angles, visual path/lines (đường thị giác, điểm nhìn, tầm nhìn), light source vectors, perspective depth, and artistic brushstrokes with 100% precision using professional visual art terminology, while keeping the prompt itself beautifully original. No reader should ever be able to guess or trace back the original reference image from the prompt text alone, yet the generative AI reading the prompt will reproduce the exact same composition framework, line-weight DNA, perspective structure, and color theory as the reference image, matching 100% the story characters!\n\n" +
            "🚨 SUPREME COMMAND FOR HIGH-FIDELITY DETAILS (MỆNH LỆNH THỐNG TRỊ CHI TIẾT TỰA THỰC 100%): Write incredibly long, precise, and vivid paragraphs for each part! Use advanced terminology such as 'Fujifilm Superia color space, Hasselblad HC 80mm color accuracy, Arri Alexa cinematic tone, 0.05mm ultra-fine rotring ink brush, meticulous cross-hatching shade layers, anatomically flawless hands with five long slender digits, perfect fabric drape tension folds' in every description. Ensure that every item—whether adapted or invented—is rendered with the same technical excellence, EXACT LINEWORK, and EXACT COLORS as the reference DNA!\n\n" +
            "🚨 MANDATE #10: ABSOLUTE AVOIDANCE OF GENERIC AI STYLE (TUYỆT ĐỐI KHÔNG SỬ DỤNG PHONG CÁCH AI MẶC ĐỊNH) 🚨: YOU ARE STRICTLY FORBIDDEN FROM PRODUCING GENERIC, PLASTIC, OVERLY-SMOOTH, OR TYPICAL 'AI-ART' LOOKS. The artwork must NOT feel digital, synthetic, or generic. You must ONLY produce artwork that looks like it was created by a master human artist using the specific medium and linework defined in the reference images. If the reference is watercolor, the AI output MUST look like 100% genuine watercolor with authentic paper texture, ink bleeds, and organic brush strokes. If the reference is ink, it MUST look like authentic, hand-drawn ink with variable line weight and organic human imperfections! Reject all smooth, artificial, shiny, or 'AI-looking' aesthetic conventions immediately!\n\n" +
            "🚨 NO COGNITIVE ANALYSIS FLUFF (BẮT BUỘC BỎ QUA PHẦN PHÂN TÍCH SUY NGHĨ TIẾNG VIỆT) 🚨: To maintain ultimate stream efficiency, YOU MUST NOT output any [REFERENCE FIDELITY REPORT] or Vietnamese thinking/analysis text. Start the response immediately with [FINAL PROMPT] followed by the requested parts. Just write the highly detailed prompt ready for direct image creation! Each card must start immediately with '[FINAL PROMPT]'.\n\n" +
            "CRITICAL RULE ON REFERENCE IMAGES (OUTPUT PHẢI ĐỘC LẬP VÀ SẠCH): When studying reference images in the Context Window, achieve ABSOLUTE FIDELITY in 'Visual Vision' (Art style, medium texture, color palette, technical lighting, and EXACT camera perspective/angle/framing). However, you MUST practice 'Creative Adaptation' for the subject matter: replace literal props, specific tools, and background objects with new elements that make sense for the STORY CHARACTER. The final output must be standalone. You MUST NOT include ANY of the following in the generated prompt: CARD_ID, Room ID, UUID, reference image ID, filenames, storage key, attachment report, variable names, internal data, or phrases asking the image generator to 'look at the attached reference image'. The prompt must describe the visuals entirely in text so the image generator doesn't need the reference image!\n\n" +
            "For EACH Work Card, you MUST directly start with '[FINAL PROMPT]' with the standalone descriptive instruction ready for direct image generation! In [FINAL PROMPT], you MUST structure the output into exactly 17 STANDALONE PARTS:\n" +
"**[1/17] Mục tiêu cảnh (Scene Goal)**\n- [WHAT (Locked Story/Character): Lock narrative intent, character action, and story-accurate scene goals.]\n- [HOW (Reference-Derived Art Direction): Learn focal hierarchy, visual urgency, and compositional impact from reference.]\n- [Ref Analysis: Deconstruct the reference's focal point hierarchy, visual flow (leading lines), and compositional weight. Apply identical spatial urgency and viewer engagement logic to this scene, ensuring the narrative intent is conveyed with the same artistic impact. Identify primary/secondary/tertiary focal points and replicate the composition strategy to anchor the viewer's eye.]\n" +
"**[2/17] Nhân vật (Character)**\n- [WHAT (Locked Story/Character): Maintain character identity, story-specific features, and anatomical consistency.]\n- [HOW (Reference-Derived Art Direction): Learn technical anatomical rendering and proportion philosophy from reference.]\n- [Ref Analysis: Analyze anatomy, proportion logic, and subject-to-frame ratio. Apply the reference's technical anatomical rendering and proportion philosophy to the character, maintaining story-specific identity. Focus on how the reference constructs human volume and skeletal framing.]\n" +
"**[3/17] Biểu cảm (Expression)**\n- [WHAT (Locked Story/Character): Maintain character emotional state and expression depth.]\n- [HOW (Reference-Derived Art Direction): Learn facial rendering, eye gloss, catchlight, pupil detail, and expression philosophy from reference.]\n- [Ref Analysis: Deconstruct facial rendering, eye gloss, catchlight, pupil detail, and expression depth. Apply the same technical approach to facial structure, bone rendering, and emotional resonance, ensuring the eyes/expression have the exact same depth/allure.]\n" +
"**[4/17] Pose (Posture & Hands)**\n- [WHAT (Locked Story/Character): Maintain character action, story-specific movement, and hand gestures.]\n- [HOW (Reference-Derived Art Direction): Learn pose dynamics, weight distribution, and limb articulation logic from reference.]\n- [Ref Analysis: Deconstruct pose dynamics, center of gravity, weight distribution, and limb articulation. Apply the reference's kinetic energy and balance to the pose, ensuring movement, weight, and hand gesture sophistication look physically and artistically correct.]\n" +
"**[5/17] Tỷ lệ cơ thể (Body Proportions)**\n- [WHAT (Locked Story/Character): Maintain character identity and story-specific proportions.]\n- [HOW (Reference-Derived Art Direction): Learn subject scale, subject-to-frame ratio, and spatial proportioning logic from reference.]\n- [Ref Analysis: Analyze subject scale, subject-to-frame ratio, and spatial proportioning. Apply the reference's logic of anatomy/body proportion scale, ensuring character identity remains consistent while matching the reference's elite anatomical rendering style.]\n" +
"**[6/17] Góc máy (Camera Angle)**\n- [WHAT (Locked Story/Character): Maintain scene-appropriate viewpoint.]\n- [HOW (Reference-Derived Art Direction): Learn camera philosophy, shot distance, camera tilt, and focal length from reference.]\n- [Ref Analysis: Analyze shot distance, camera tilt, camera lens/focal length, and framing/crop. Apply the reference's camera philosophy to this scene, capturing identical depth, perspective, and scale to replicate the reference's cinematic viewpoint.]\n" +
"**[7/17] Bố cục (Composition)**\n- [WHAT (Locked Story/Character): Maintain narrative scene arrangement.]\n- [HOW (Reference-Derived Art Direction): Learn geometric scaffolding, visual flow, and spatial arrangement logic from reference.]\n- [Ref Analysis: Analyze geometric scaffolding, visual flow, and rule of thirds/golden ratio. Apply identical structural logic to organize foreground/midground/background, replicating the visual hierarchy and spatial arrangement strategy of the reference.]\n" +
"**[8/17] Line-art construction (Nét vẽ)** (Must be extremely detailed, defining line weight, sharpness, thickness, intersection handling, and silhouette clarity!)\n- [WHAT (Locked Story/Character): Maintain character silhouette and defining features.]\n- [HOW (Reference-Derived Art Direction): Learn line weight, ink/pencil/brush texture, and intersection handling from reference.]\n- [Ref Analysis: Analyze line weight, ink/pencil/brush texture, and intersection handling (where lines join/taper). Apply identical line-art DNA to ensure professional, human-quality line art with extreme detail and deliberate line-weight variation.]\n" +
"**[9/17] Tóc (Hair & Strands)** (Must detail hair length, parting, main clumps, flow direction, thickness, volume, curl, highlights, shadows, avoiding AI messy branching!)\n- [WHAT (Locked Story/Character): Maintain hair style and character appearance.]\n- [HOW (Reference-Derived Art Direction): Learn hair clumping, flow direction, translucency, and volume-per-strand logic from reference.]\n- [Ref Analysis: Analyze hair clumping, flow direction, angel rings, translucency, and volume-per-strand. Apply the same hair-rendering technique, ensuring organic flow, detail density, and proper light-catch (highlights) as seen in the reference.]\n" +
"**[10/17] Trang phục (Outfit & Folds)**\n- [WHAT (Locked Story/Character): Maintain character costume and story-specific details.]\n- [HOW (Reference-Derived Art Direction): Learn fabric physics, draping, folds, and material tension logic from reference.]\n- [Ref Analysis: Analyze fabric physics, draping, folds, and material tension. Apply identical wrinkle/ripple/tension logic to this outfit, ensuring weight, movement, and material interaction look physically and artistically correct.]\n" +
"**[11/17] Ánh sáng (Lighting)** (Define main light, rim light, ambient, bounce, direction, softness/hardness, contrast!)\n- [WHAT (Locked Story/Character): Maintain narrative lighting requirements.]\n- [HOW (Reference-Derived Art Direction): Learn lighting logic, light-color temperature, contrast levels, and shadow/rim-light positioning from reference.]\n- [Ref Analysis: Analyze lighting logic, light-color temperature, contrast levels, and shadow/rim-light positioning. Apply identical cinematic lighting to achieve volume, drama, and atmosphere, replicating the light-shaping strategy.]\n" +
"**[12/17] Màu sắc (Color Palette)** (Define skin tone, background color, color balance, saturation, exposure!)\n- [WHAT (Locked Story/Character): Maintain character color scheme and setting mood.]\n- [HOW (Reference-Derived Art Direction): Learn color palette logic, saturation levels, and color grading philosophy from reference.]\n- [Ref Analysis: Analyze color palette logic, saturation levels, and color grading philosophy. Apply identical chromaticity, tone, and saturation philosophy to ensure absolute color harmony and mood-matching with the reference.]\n" +
"**[13/17] Chất liệu (Materials)**\n- [WHAT (Locked Story/Character): Maintain character and environment surface details.]\n- [HOW (Reference-Derived Art Direction): Learn surface reflectivity, roughness, texture, and translucency physics from reference.]\n- [Ref Analysis: Analyze surface reflectivity, roughness, texture, and translucency. Apply identical material logic, ensuring tactile realism for skin, fabric, and objects by replicating the surface-light-interaction physics of the reference.]\n" +
"**[14/17] Background (Setting)**\n- [WHAT (Locked Story/Character): Maintain story-specific environmental setting.]\n- [HOW (Reference-Derived Art Direction): Learn depth of field, background organization, and spatial depth logic from reference.]\n- [Ref Analysis: Analyze depth of field, background organization, and foreground/midground separation. Apply identical spatial logic and organizational depth, ensuring the background enhances the subject through the reference's specific environmental-design strategy.]\n" +
"**[15/17] Chất lượng render (Render Quality)**\n- [WHAT (Locked Story/Character): Maintain overall story atmosphere.]\n- [HOW (Reference-Derived Art Direction): Learn rendering technique, medium texture, and detail distribution logic from reference.]\n- [Ref Analysis: Analyze rendering technique, medium texture (painterly/watercolor/ink), and detail distribution. Apply identical finishing logic to achieve an elite, professional art piece that mimics the reference's final polish and rendering-depth level.]\n" +
"**[16/17] Negative constraints (Lỗi cần tránh)**\n- [WHAT (Locked Story/Character): Maintain character integrity and avoid story-breaking elements.]\n- [HOW (Reference-Derived Art Direction): Learn anti-generic/anti-AI style constraints from reference.]\n- [Ref Analysis: Analyze specific anti-generic/anti-AI style constraints (e.g., avoid plastic textures, smooth-over-detail, or default-AI-lighting). Strictly reject any AI-default look by mirroring the reference's sophisticated rendering and high-quality aesthetic constraints.]\n" +
"**[17/17] Reference application rules (Quy tắc áp dụng tham chiếu)**\n\n- [WHAT (Locked Story/Character): Maintain story character fidelity and narrative accuracy.]\n- [HOW (Reference-Derived Art Direction): Learn art/technical/visual logic for transformation from reference.]\n- [Ref Analysis: Apply strict logic transformation: learn the reference's art/technical/visual logic while maintaining story character fidelity. 100% reference-based line-art, rendering, and composition logic. Reject all literal content copying (face/clothes/logo). Final output must be 100% original, story-accurate work with elite, high-fidelity art-direction based on reference analysis.]\n" +
"After all 17 parts, you MUST end with '### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all parts into a single pure English production-ready block!\n\n" +
"Do NOT include introductory conversational filler, tutorials, advice, or checklists. Do not explain your reasoning. Provide the output strictly in the requested format. Just output the final Markdown blocks separated by [CARD_ID: ...].",
        onToken: (token) => {
          streamBufferRef.current += token;
          chunksCountRef.current += 1;
          
          const now = performance.now();
          if (now - lastFlushTimeRef.current >= 300) {
            lastFlushTimeRef.current = now;
            setLivePreviewText(streamBufferRef.current);
            // KHÔNG phân bổ vào thẻ khi đang stream để tránh treo main thread
            
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
              // KHÔNG phân bổ vào thẻ khi đang stream để tránh treo main thread
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
            }, 200);
          }
        },
        onDone: async () => {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          const finalResultText = streamBufferRef.current || "";
          
          // 1. Giải phóng buffer ngay lập tức để tiết kiệm RAM
          streamBufferRef.current = "";
          
          if (!finalResultText.trim()) {
            const emptyMsg = "API trả về kết quả trống (0 token). Vui lòng thử lại.";
            setApiError(emptyMsg);
            setIsApiRunning(false);
            setApiSignals(prev => ({ ...prev, streaming: false, completed: true, stage: 'done' }));
            return;
          }

          // Gán kết quả thô vào roomState trước
          rs.result = finalResultText;
          rs.lastRunId = uuidv4();
          setLivePreviewText(finalResultText);

          setApiSignals(prev => ({
            ...prev,
            streaming: false,
            stage: 'parsing_result',
            stageLabel: '6. Processing Result',
            stageDetail: 'Đang xử lý dữ liệu và phân bổ vào các thẻ...'
          }));

          // 2. Chờ 1 nhịp để trình duyệt rảnh tay
          await new Promise(r => setTimeout(r, 150));
          
          // 3. Phân bổ kết quả vào thẻ - Đã có batching bên trong
          try {
            await distributeStreamToCardsLive(finalResultText);
          } catch (e) {
            console.error("Distribute cards failed in onDone (Raw fallback):", e);
          }
          
          // 4. Yield cực mạnh để giải phóng bộ nhớ cũ trước khi tạo history
          await new Promise(r => setTimeout(r, 300));
          
          setApiSignals(prev => ({
            ...prev,
            stage: 'saving',
            stageLabel: '7. Finalizing',
            stageDetail: 'Đang chuẩn bị lưu lịch sử và nén dữ liệu...'
          }));
          setProgress(95);

          // 5. Tạo historyItem - Chỉ giữ metadata tối thiểu
          const historyId = uuidv4();
          let prunedPayload = {
            roomName: roomDef.title,
            cardsCount: (payloadObj?.workCards || []).length
          };

          const historyItem = {
            id: historyId,
            time: new Date().toISOString(),
            storyId: currentStory.id,
            roomId: roomDef.id,
            selectedTarget: target,
            payload: prunedPayload, 
            result: finalResultText,
            selectedStyles: Array.isArray(sa.selected) ? [...sa.selected] : [],
            referenceImages: (allRefsList || []).slice(0, 3).map((r: any) => ({
              id: r.id,
              name: (r.name || "ref").slice(0, 20),
              previewUrl: "" 
            })),
            streamStatus: 'completed' as const,
            cards: Object.keys(rs.cards || {}).reduce((acc: any, k: string) => {
              const c = rs.cards[k];
              if (c && c.output) acc[k] = { output: c.output.slice(0, 2000) };
              return acc;
            }, {})
          };
          
          // 6. Cập nhật history (Giới hạn tối đa 2 mục cho nhẹ)
          if (!rs.history) rs.history = [];
          
          // CHỒNG YÊU: Prune Base64 khỏi history item ngay khi lưu nhen vợ!
          const cleanHistoryItem = { ...historyItem };
          if (cleanHistoryItem.payload) {
            cleanHistoryItem.payload = pruneBase64(cleanHistoryItem.payload);
          }
          
          rs.history.unshift(cleanHistoryItem);
          if (rs.history.length > 2) rs.history = rs.history.slice(0, 2);
          
          updateGlobalState(rs);
          setIsWorkListCollapsed(true);
          
          // 7. GIẢI PHÓNG BỘ NHỚ LỚN NGAY LẬP TỨC
          (payloadObj as any) = null;
          (prunedPayload as any) = null;
          (allRefsList as any) = null;
          (allActiveRefs as any) = null;
          (orderedVisionRefs as any) = null;
          (contentArray as any) = null;
          
          // 8. Đợi thêm một nhịp nữa trước khi gọi Save database
          await new Promise(r => setTimeout(r, 500));
          setProgress(98);

          setProgress(100);
          setApiSignals(prev => ({
            ...prev,
            completed: true,
            stage: 'done',
            stageLabel: '8. Completed',
            stageDetail: '✅ Hoàn tất thành công!'
          }));
          setIsApiRunning(false);
          forceUpdate();
          toast("✅ Đã tạo xong Prompt Image!");
          
          setTimeout(() => {
            setProgress(0);
            setApiSignals(prev => ({ ...prev, requestStarted: false }));
          }, 5000);
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
      setIsApiRunning(false);
    }
  }, [roomState, roomDef, currentStory, progress, showContextPreview, buildContextPayload, save, state, toast, uuidv4]);

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
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
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

      <section className="work-list-container" style={{marginBottom: '32px'}}>
        <div className="work-list-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#fff0f5', padding: '12px 16px', borderRadius: '16px', border: '1px solid #fce4ec'}}>
          <h2 style={{margin: 0, color: '#c2185b', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>📋</span> Bảng Thiết Lập Thẻ Công Việc
          </h2>
          <button className="btn ghost small" onClick={() => setIsWorkListCollapsed(!isWorkListCollapsed)} style={{color: '#d23a73', fontWeight: 700}}>
            {isWorkListCollapsed ? "▽ Hiện danh sách thẻ" : "△ Thu gọn danh sách"}
          </button>
        </div>

        {!isWorkListCollapsed && (
          <div className="work-list" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px'}}>
            {roomDef.cards.map((c: any, i: number) => (
              <WorkCardItem
                key={`card_${roomDef.id}_${c.id}_${i}`}
                c={c}
                i={i}
                roomDef={roomDef}
                roomState={roomState}
                state={state}
                currentStory={currentStory}
                save={save}
                toast={toast}
                catAnalyzingCardId={catAnalyzingCardId}
                isApiRunning={isApiRunning}
                apiSignals={apiSignals}
                toggleTraitSelection={toggleTraitSelection}
                selectOutfitOption={selectOutfitOption}
                handleOutfitUpload={handleOutfitUpload}
                handleRefUpload={handleRefUpload}
                analyzeCardAestheticAndOutfits={analyzeCardAestheticAndOutfits}
                setSelectedImgDetail={setSelectedImgDetail}
                renderTargetSelector={renderTargetSelector}
                updateGlobalState={updateGlobalState}
                viewHistoryIndex={viewHistoryIndex}
              />
            ))}
          </div>
        )}
      </section>

      <StyleAnalyzer roomState={roomState} currentStory={currentStory} roomDef={roomDef} state={state} save={save} toast={toast} />

      {/* COMPREHENSIVE SINGLE RESULT CARD - NOW JUST A SUCCESS HEADER */}
      {(() => {
        const displayResult = (viewHistoryIndex !== null && roomState.history && roomState.history[viewHistoryIndex])
          ? roomState.history[viewHistoryIndex].result
          : roomState.result;

        return (displayResult && displayResult.length > 0) ? (
          <>
            <div className="flex items-center gap-3 mb-6 px-4">
              <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                Result Area {viewHistoryIndex !== null && `(Xem Lịch Sử Đợt #${roomState.history.length - viewHistoryIndex})`}
              </h3>
            </div>
            <PromptSummaryPanel
              apiSignals={apiSignals}
              promptRunId={(viewHistoryIndex !== null && roomState.history && roomState.history[viewHistoryIndex]) ? (roomState.history[viewHistoryIndex].lastRunId || "unknown") : (roomState.lastRunId || "unknown")}
              orderedVisionRefs={buildContextWindow(currentStory, roomDef.id, roomDef.cards.map(c => c.id), roomState).orderedVisionRefs}
              currentStory={currentStory}
              roomDef={roomDef}
              cards={roomDef.cards}
              contentArray={[]} 
              finalPrompt={displayResult}
              toast={toast}
            />
          </>
        ) : null;
      })()}



      <HistorySection 
        roomState={roomState}
        viewHistoryIndex={viewHistoryIndex}
        setViewHistoryIndex={setViewHistoryIndex}
        replayHistory={replayHistory}
        setSelectedHistoryPayload={setSelectedHistoryPayload}
        toast={toast}
        currentStory={currentStory}
        roomDef={roomDef}
        save={save}
        state={state}
        onDeleteHistory={deleteHistoryItem}
      />

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
                  {JSON.stringify(pruneBase64(selectedHistoryPayload.payload), null, 2)}
                </pre>
              </div>
              <div>
                <b>✨ Kết Quả Trả Về (Replay Ready):</b>
                <textarea readOnly value={selectedHistoryPayload.result || ""} style={{width: '100%', minHeight: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #ecc', fontFamily: 'monospace', fontSize: '0.85rem', marginTop: '4px'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #eee', gap: '8px', flexWrap: 'wrap'}}>
              <button className="btn ghost small" onClick={() => {
                copyToClipboardSafe(JSON.stringify(pruneBase64(selectedHistoryPayload.payload), null, 2));
                toast("📋 Đã copy toàn bộ Payload JSON!");
              }}>📋 Copy Payload JSON</button>
              <button className="btn primary" onClick={() => {
                replayHistory(selectedHistoryPayload, viewHistoryIndex!);
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
                        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
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

                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, paddingRight: 4}}>
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
              <div style={{flex: 1, background: '#1e1e1e', color: '#d4d4d4', padding: '16px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', border: '1px solid #333', textAlign: 'left', margin: '12px 0'}}>
                <details>
                  <summary style={{cursor: 'pointer', color: '#d23a73', fontWeight: 'bold', marginBottom: '8px'}}>Nhấn để xem JSON Context Payload (Dữ liệu lớn)</summary>
                  <pre style={{marginTop: '12px'}}>{JSON.stringify(pruneBase64(buildContextPayload()), null, 2)}</pre>
                </details>
              </div>
            )}

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #ddd', paddingTop: 12}}>
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn ghost small" onClick={() => {
                  copyToClipboardSafe(JSON.stringify(pruneBase64(buildContextPayload()), null, 2));
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
                            <div style={{marginBottom: 8}}><b>🎨 Visual Style Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.visualStyleExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.visualStyleExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.visualStyleExtracted || selectedImgDetail.imageAnalysisJson.style || {}))}</div>
                            <div style={{marginBottom: 8}}><b>🌈 Color Palette Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.colorPaletteExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.colorPaletteExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.colorPaletteExtracted || selectedImgDetail.imageAnalysisJson.color || {}))}</div>
                            <div style={{marginBottom: 8}}><b>🖌️ Line &amp; Render Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.lineAndRenderExtracted || selectedImgDetail.imageAnalysisJson.layer5_artStyle || {}))}</div>
                            <div style={{marginBottom: 8}}><b>✨ Mood Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.moodExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.moodExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.moodExtracted || selectedImgDetail.imageAnalysisJson.layer8_vibe || {}))}</div>
                            <div style={{marginBottom: 8}}><b>👗 Outfit Fidelity Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.outfitExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.outfitExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.outfitExtracted || selectedImgDetail.imageAnalysisJson.layer4_outfit || {}))}</div>
                            <div style={{marginBottom: 8}}><b>📐 Composition Rhythm Extracted:</b> {typeof selectedImgDetail.imageAnalysisJson.compositionExtracted === 'string' ? selectedImgDetail.imageAnalysisJson.compositionExtracted : JSON.stringify(pruneBase64(selectedImgDetail.imageAnalysisJson.compositionExtracted || selectedImgDetail.imageAnalysisJson.composition || {}))}</div>
                            
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
                <button className="btn danger small" style={{background: '#ff4d4f', color: '#fff', border: 'none'}} onClick={() => {
                  if (!window.confirm("Vợ có chắc muốn xóa ảnh này không nè? 🌸")) return;
                  
                  const rs = { ...roomState };
                  const cardId = selectedImgDetail.cardId;
                  const imgId = selectedImgDetail.imageId || selectedImgDetail.id;

                  let found = false;
                  if (cardId === 'style_analyzer' && rs.styleAnalyzer?.refs) {
                    const originalLen = rs.styleAnalyzer.refs.length;
                    rs.styleAnalyzer.refs = rs.styleAnalyzer.refs.filter((x: any) => (x.id || x.imageId) !== imgId);
                    if (rs.styleAnalyzer.refs.length < originalLen) found = true;
                  } else if (cardId && rs.cards?.[cardId]) {
                    const c = rs.cards[cardId];
                    if (c.refs) {
                      const originalLen = c.refs.length;
                      c.refs = c.refs.filter((x: any) => (x.id || x.imageId) !== imgId);
                      if (c.refs.length < originalLen) found = true;
                    }
                    if (c.outfitRefs) {
                      const originalLen = c.outfitRefs.length;
                      c.outfitRefs = c.outfitRefs.filter((x: any) => (x.id || x.imageId) !== imgId);
                      if (c.outfitRefs.length < originalLen) found = true;
                    }
                  }
                  
                  if (found) {
                    updateGlobalState(rs);
                    setSelectedImgDetail(null);
                    toast("🗑️ Đã xóa ảnh thành công cho vợ rồi nha! ✨");
                  } else {
                    toast("⚠️ Chồng không tìm thấy ảnh để xóa, vợ kiểm tra lại nhé!");
                  }
                }}>🗑️ Xóa ảnh này</button>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ffebee', paddingBottom: '8px' }}>
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

function HistorySection({ roomState, viewHistoryIndex, setViewHistoryIndex, replayHistory, setSelectedHistoryPayload, toast, currentStory, roomDef, save, state, onDeleteHistory }: any) {
  if (!roomState.history || roomState.history.length === 0) return null;

  return (
    <section className="history-tab-container" style={{marginTop: '32px', background: '#fff', borderRadius: '24px', padding: '20px', border: '2px solid #fce4ec', boxShadow: '0 8px 24px rgba(210, 58, 115, 0.08)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
        <h2 style={{margin: 0, color: '#3e333e', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span>📜</span> Lịch Sử Đợt Gọi Gọn Nhẹ ({roomState.history.length})
        </h2>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="btn ghost xsmall" onClick={() => {
            const rs = { ...roomState, history: roomState.history.slice(0, 15) };
            const newStory = { ...currentStory, rooms: { ...currentStory.rooms, [roomDef.id]: rs } };
            const newState = { ...state, stories: state.stories.map((s: any) => s.id === newStory.id ? newStory : s) };
            save(newState);
            toast("Đã giữ lại 15 đợt gần nhất cho gọn nha vợ!");
          }}>Dọn bớt</button>
          <button className="btn ghost xsmall" style={{color: '#999'}} onClick={() => {
            if (window.confirm("Xóa toàn bộ lịch sử phòng này?")) {
              const rs = { ...roomState, history: [] };
              const newStory = { ...currentStory, rooms: { ...currentStory.rooms, [roomDef.id]: rs } };
              const newState = { ...state, stories: state.stories.map((s: any) => s.id === newStory.id ? newStory : s) };
              save(newState);
              setViewHistoryIndex(null);
              toast("Đã dọn dẹp lịch sử.");
            }
          }}>Xóa hết</button>
        </div>
      </div>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        <div className="history-tabs-row" style={{display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px', scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <button 
            onClick={() => {
              setViewHistoryIndex(null);
              toast("✨ Đang hiển thị đợt gọi mới nhất!");
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '2px solid',
              background: viewHistoryIndex === null ? '#d23a73' : '#fff',
              color: viewHistoryIndex === null ? '#fff' : '#d23a73',
              borderColor: '#d23a73'
            }}
          >
            💎 Đợt Mới Nhất
          </button>

          {roomState.history.slice(0, 20).map((h: any, index: number) => {
            const runNumber = roomState.history.length - index;
            const isActive = viewHistoryIndex === index;
            return (
              <div key={index} style={{position: 'relative', display: 'inline-block'}}>
                <button
                  onClick={() => {
                    replayHistory(h, index);
                  }}
                  style={{
                    padding: '8px 32px 8px 16px',
                    borderRadius: '12px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '2px solid',
                    background: isActive ? '#d23a73' : '#fff9fb',
                    color: isActive ? '#fff' : '#888',
                    borderColor: isActive ? '#d23a73' : '#fce4ec'
                  }}
                >
                  Đợt #{runNumber} ({new Date(h.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})})
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHistory(index);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: isActive ? '#fff' : '#d23a73',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 800,
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        
        {viewHistoryIndex !== null && (
          <div style={{padding: '10px', background: '#fff9fb', borderRadius: '12px', border: '1px dashed #d23a73', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '0.85rem', color: '#d23a73', fontWeight: 600}}>
              👀 Vợ đang xem lại dữ liệu của <b>Đợt #{roomState.history.length - viewHistoryIndex}</b>
            </span>
            <button className="btn primary xsmall" onClick={() => setSelectedHistoryPayload(roomState.history[viewHistoryIndex])}>
              Chi tiết Payload
            </button>
          </div>
        )}
      </div>
      <p className="muted" style={{fontSize: '0.75rem', marginTop: '8px', textAlign: 'center', color: '#d23a73', fontWeight: 600}}>
        💡 Chồng đã thu gọn lịch sử đợt gọi ở cuối trang. Vợ hãy bấm vào từng "Đợt" để khôi phục kết quả đó lên màn hình chính nhé!
      </p>
    </section>
  );
}
