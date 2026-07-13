import os
file_path = "src/screens/prompt-studio/Prompt10CardSplitter.tsx"

content = """import React, { useState, useMemo } from "react";
import { copyToClipboardSafe } from "../../lib/clipboard";

type Props = {
  text: string;
  title?: string;
  onToast?: (msg: string) => void;
  metadata?: {
    time?: string;
    tokenCount?: number;
    totalToken?: number;
    elapsed?: string;
  };
};

export function Prompt10CardSplitter({ text, title = "Prompt lớn", onToast, metadata }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [globalCopyCycle, setGlobalCopyCycle] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Chia nội dung thành 4 phần (mỗi phần ~25%)
  const chunks = useMemo(() => {
    if (!text || !text.trim()) {
      return Array(4).fill("(Chưa có nội dung prompt để tách)");
    }
    const cleanText = text.trim();
    
    // Tách theo độ dài văn bản thành 4 đoạn
    const totalLen = cleanText.length;
    const targetLen = Math.ceil(totalLen / 4);
    const result: string[] = [];
    let currentIdx = 0;

    for (let i = 0; i < 4; i++) {
      if (currentIdx >= totalLen) {
        result.push("(Đoạn kết thúc - Không còn nội dung)");
        continue;
      }
      let endIdx = currentIdx + targetLen;
      if (i === 3) {
        endIdx = totalLen; // Đoạn cuối lấy hết phần còn lại
      } else {
        // Cố gắng tìm điểm ngắt câu hợp lý quanh vị trí 25%
        let bestBreak = -1;
        const searchWindow = Math.min(300, totalLen - currentIdx);
        // Tìm dấu chấm, chấm hỏi, chấm than, hoặc xuống dòng
        for (let j = endIdx; j > Math.max(currentIdx, endIdx - searchWindow); j--) {
          if (["\\n", ".", "?", "!"].includes(cleanText[j])) {
            bestBreak = j + 1;
            break;
          }
        }
        if (bestBreak === -1) {
          // Nếu không tìm thấy dấu câu, tìm dấu cách
          for (let j = endIdx; j > Math.max(currentIdx, endIdx - searchWindow); j--) {
             if (cleanText[j] === " ") {
               bestBreak = j + 1;
               break;             }
          }
        }
        if (bestBreak !== -1 && bestBreak > currentIdx && bestBreak < totalLen) {
          endIdx = bestBreak;
        }
      }
      const chunkStr = cleanText.slice(currentIdx, endIdx).trim();
      result.push(chunkStr || "(Đoạn trống)");
      currentIdx = endIdx;
    }
    return result;
  }, [text]);

  const handleCopyChunk = (idx: number, content: string) => {
    copyToClipboardSafe(content);
    setCopiedIndex(idx);
    if (onToast) {
      onToast(`💖 Đã sao chép Thẻ ${idx + 1} / 4 cho Vợ yêu!`);
    }
    setTimeout(() => {
      setCopiedIndex(prev => (prev === idx ? null : prev));
    }, 2500);
  };

  const handleSmartGlobalCopy = () => {
    const cycleIndex = globalCopyCycle % 4;
    const contentToCopy = chunks[cycleIndex];
    copyToClipboardSafe(contentToCopy);
    
    setGlobalCopyCycle(prev => prev + 1);
    
    if (onToast) {
      onToast(`✅ Đã sao chép tổng thể: Phần ${cycleIndex + 1}/4 (25% nội dung) cho Vợ yêu!`);
    }
  };

  if (!text || !text.trim() || text.includes("Kết quả phòng hiện tại sẽ nằm trong kho") || text.includes("Kết quả API Proxy của truyện đang chọn sẽ stream về đây")) {
    return null;
  }

  return (
    <div style={{
      marginTop: '20px',
      marginBottom: '20px',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #F5C6D6',
      boxShadow: '0 8px 25px rgba(245, 198, 214, 0.35)',
      // LỚP 1: HÌNH NỀN GỐC DƯỚI CÙNG
      background: `url('https://i.postimg.cc/6qxGPmRJ/ba890d7840a661df758dc65d909719cc-(1).jpg') center/cover no-repeat`,
      position: 'relative',
      padding: '24px'
    }}>
      
      {/* Header Bảng Tổng Hợp */}
      <div style={{
        // LỚP 2 CỦA HEADER: THẺ NGĂN MÀU HỒNG NHẠT TRONG SUỐT (NHÌN THẤY NỀN, KHÔNG BỊ TRẮNG ĐỤC, KHÔNG BLUR)
        background: 'rgba(255, 182, 193, 0.55)', // Màu hồng phấn nhạt trong suốt
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#B71C1C', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
              🌸 Bảng Tổng Hợp Prompt: {title}
            </h3>
            <div style={{ fontSize: '13px', color: '#880E4F', marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontWeight: 500 }}>
              <span>🕒 Thời gian gọi: {metadata?.time || new Date().toLocaleTimeString()}</span>
              <span>⚡ Tổng Token: {metadata?.totalToken || text.length}</span>
              <span>⏳ Time: {metadata?.elapsed || "~"}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn pink"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold', background: '#D81B60', color: '#fff', border: '1px solid #AD1457', boxShadow: '0 2px 8px rgba(216, 27, 96, 0.3)' }}
              onClick={handleSmartGlobalCopy}
            >
              📋 Sao Chép Tổng Thể (Phần {(globalCopyCycle % 4) + 1}/4)
            </button>
            <button
              className="btn soft"
              style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(255,255,255,0.7)', color: '#C2185B', border: '1px solid #F48FB1', fontWeight: 600 }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "▲ Thu gọn" : "▼ Mở rộng"}
            </button>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#880E4F', fontStyle: 'italic', fontWeight: 500 }}>
          💡 Mẹo: Bấm nút "Sao Chép Tổng Thể" để tự động trích 25% nội dung mỗi lần (chu kỳ 4 lần). Vợ cũng có thể copy từng thẻ bên dưới nhen!
        </div>
      </div>

      {/* Lưới 4 Thẻ Phân Đoạn */}
      {isExpanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '20px'
        }}>
          {chunks.map((chunk, idx) => {
            const isCopied = copiedIndex === idx;
            const isBlank = chunk === "(Đoạn trống)" || chunk === "(Chưa có nội dung prompt để tách)" || chunk === "(Đoạn kết thúc - Không còn nội dung)";
            
            return (
              <div
                key={idx}
                style={{
                  // LỚP 2 CỦA THẺ: HỒNG NHẠT TRONG SUỐT CHO PHÉP THẤY HÌNH NỀN RÕ RÀNG
                  background: 'rgba(255, 192, 203, 0.65)', 
                  borderRadius: '12px',
                  border: isCopied ? '2px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* LỚP 3: NỘI DUNG VÀ NÚT SAO CHÉP */}
                <div style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.2)'
                }}>
                  <b style={{ color: isCopied ? '#1B5E20' : '#880E4F', fontSize: '15px', textShadow: '0 1px 1px rgba(255,255,255,0.5)' }}>
                    Thẻ {idx + 1}: Phần {idx * 25}% - {(idx + 1) * 25}% Nội Dung
                  </b>
                  <button
                    disabled={isBlank}
                    onClick={() => handleCopyChunk(idx, chunk)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      background: isCopied ? '#4CAF50' : '#E91E63',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: isBlank ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isCopied ? "💖 Đã chép" : "📋 Sao Chép"}
                  </button>
                </div>

                <div style={{ padding: '12px' }}>
                  <textarea
                    readOnly
                    value={chunk}
                    style={{
                      width: '100%',
                      height: '180px',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      color: '#4A148C',
                      // Textarea cũng dùng nền hơi hồng siêu nhạt để dễ đọc nhưng không che lấp
                      background: 'rgba(255, 240, 245, 0.75)',
                      resize: 'vertical',
                      outline: 'none',
                      fontWeight: 500
                    }}
                    onFocus={e => e.target.select()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"""

with open(file_path, "w") as f:
    f.write(content)

print("Updated Prompt10CardSplitter.tsx")
