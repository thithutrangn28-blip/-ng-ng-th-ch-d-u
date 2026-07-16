import React, { useState, useMemo } from "react";
import { copyToClipboardSafe } from "../../lib/clipboard";

type Props = {
  text: string;
  title?: string;
  onToast?: (msg: string) => void;
};

export function Prompt10CardSplitter({ text, title = "Prompt lớn", onToast }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Thuật toán chia văn bản lớn thành đúng 10 đoạn khoa học
  const chunks = useMemo(() => {
    if (!text || !text.trim()) {
      return Array(10).fill("(Chưa có nội dung prompt để tách)");
    }

    const cleanText = text.trim();

    // 1. Nếu văn bản có các khối ---TASK--- (Ví dụ tạo 10 task ở phòng)
    const taskMatches = cleanText.split(/---TASK---/).map(s => s.trim()).filter(Boolean);
    if (taskMatches.length >= 10) {
      // Nếu có từ 10 task trở lên, ta gộp hoặc chia thành 10 thẻ
      const result: string[] = [];
      const perCard = Math.ceil(taskMatches.length / 10);
      for (let i = 0; i < 10; i++) {
        const slice = taskMatches.slice(i * perCard, (i + 1) * perCard);
        if (slice.length > 0) {
          result.push(slice.map(s => `---TASK---\n${s}\n---TASK---`).join("\n\n"));
        } else {
          result.push("(Đoạn trống)");
        }
      }
      return result;
    }

    // 2. Tách theo độ dài văn bản thành 10 đoạn đều nhau có tính toán ngữ pháp/cú pháp
    const totalLen = cleanText.length;
    const targetLen = Math.ceil(totalLen / 10);
    const result: string[] = [];
    let currentIdx = 0;

    for (let i = 0; i < 10; i++) {
      if (currentIdx >= totalLen) {
        result.push("(Đoạn kết thúc - Không còn nội dung)");
        continue;
      }

      if (i === 9) {
        // Đoạn cuối cùng lấy toàn bộ phần còn lại
        result.push(cleanText.slice(currentIdx).trim());
        break;
      }

      let endIdx = currentIdx + targetLen;
      if (endIdx >= totalLen) {
        result.push(cleanText.slice(currentIdx).trim());
        currentIdx = totalLen;
        continue;
      }

      // Tìm điểm cắt đẹp xung quanh endIdx (xuống dòng kép -> xuống dòng đơn -> dấu câu -> khoảng trắng)
      const searchWindow = Math.min(300, Math.floor(targetLen * 0.3));
      const sub = cleanText.slice(Math.max(currentIdx, endIdx - searchWindow), Math.min(totalLen, endIdx + searchWindow));
      
      let bestBreak = -1;
      const doubleNewline = sub.lastIndexOf("\n\n");
      if (doubleNewline !== -1) {
        bestBreak = Math.max(currentIdx, endIdx - searchWindow) + doubleNewline + 2;
      } else {
        const singleNewline = sub.lastIndexOf("\n");
        if (singleNewline !== -1) {
          bestBreak = Math.max(currentIdx, endIdx - searchWindow) + singleNewline + 1;
        } else {
          const dotBreak = sub.lastIndexOf(". ");
          if (dotBreak !== -1) {
            bestBreak = Math.max(currentIdx, endIdx - searchWindow) + dotBreak + 2;
          } else {
            const spaceBreak = sub.lastIndexOf(" ");
            if (spaceBreak !== -1) {
              bestBreak = Math.max(currentIdx, endIdx - searchWindow) + spaceBreak + 1;
            }
          }
        }
      }

      if (bestBreak !== -1 && bestBreak > currentIdx && bestBreak < totalLen) {
        endIdx = bestBreak;
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
      onToast(`💖 Đã sao chép Đoạn ${idx + 1} / 10 cho Vợ yêu!`);
    }
    setTimeout(() => {
      setCopiedIndex(prev => (prev === idx ? null : prev));
    }, 2500);
  };

  const handleCopyAll = () => {
    copyToClipboardSafe(text);
    setCopiedAll(true);
    if (onToast) {
      onToast("💖 Đã sao chép toàn bộ Prompt cho Vợ yêu!");
    }
    setTimeout(() => setCopiedAll(false), 2500);
  };

  if (!text || !text.trim() || text === "Kết quả phòng hiện tại sẽ nằm trong kho của truyện đang chọn." || text === "Kết quả API Proxy của truyện đang chọn sẽ stream về đây.") {
    return null;
  }

  return (
    <div style={{
      marginTop: '20px',
      marginBottom: '20px',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '2px solid #F5C6D6',
      boxShadow: '0 8px 25px rgba(245, 198, 214, 0.35)',
      background: `url('https://i.postimg.cc/6qxGPmRJ/ba890d7840a661df758dc65d909719cc-(1).jpg') center/cover no-repeat`,
      position: 'relative'
    }}>
      {/* Lớp overlay màu trắng hồng mờ ấm áp để dễ đọc chữ trên hình nền */}
      <div style={{
        background: 'rgba(255, 248, 250, 0.92)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header Bộ Tách Thẻ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '2px dashed #F2B8CC',
          paddingBottom: '14px'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              color: '#D8628B',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🌸 Tách Prompt Lớn Thành 10 Thẻ (10 Đoạn Để Vợ Yêu Dễ Sao Chép)
            </h3>
            <span style={{ fontSize: '13px', color: '#666', marginTop: '4px', display: 'block' }}>
              Chồng đã chia đều nội dung của <b>{title}</b> thành đúng 10 thẻ bên dưới để Vợ Đường Đường sao chép từng lần vào AI Model không bị quá tải! 💖
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn pink"
              style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, background: copiedAll ? '#4CAF50' : '#EFA9C2', color: '#fff' }}
              onClick={handleCopyAll}
            >
              {copiedAll ? "✅ Đã copy toàn bộ!" : "📋 Copy toàn bộ Prompt"}
            </button>
            <button
              className="btn soft"
              style={{ padding: '6px 12px', fontSize: '13px', background: '#F9F1F1', color: '#D8628B', border: '1px solid #F2B8CC' }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "▲ Thu gọn 10 Thẻ" : "▼ Hiện 10 Thẻ"}
            </button>
          </div>
        </div>

        {/* Lưới 10 Thẻ Prompt */}
        {isExpanded && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            marginTop: '8px'
          }}>
            {chunks.map((chunk, idx) => {
              const isCopied = copiedIndex === idx;
              const charCount = chunk.length;
              const isBlank = chunk === "(Đoạn trống)" || chunk === "(Chưa có nội dung prompt để tách)" || chunk === "(Đoạn kết thúc - Không còn nội dung)";

              return (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: isCopied ? '2px solid #4CAF50' : '1.5px solid #F5C6D6',
                    boxShadow: isCopied ? '0 4px 15px rgba(76, 175, 80, 0.25)' : '0 4px 12px rgba(245, 198, 214, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {/* Header của từng thẻ */}
                  <div style={{
                    background: isCopied ? '#E8F5E9' : '#F8EDED',
                    padding: '10px 14px',
                    borderBottom: '1px solid #F3DADA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <b style={{ color: isCopied ? '#2E7D32' : '#C74B74', fontSize: '14px' }}>
                      🎀 Thẻ {idx + 1} / 10
                    </b>
                    <span style={{ fontSize: '11px', background: '#fff', padding: '2px 8px', borderRadius: '10px', color: '#777', border: '1px solid #eee' }}>
                      ~{charCount.toLocaleString()} ký tự
                    </span>
                  </div>

                  {/* Nội dung đoạn prompt trong thẻ */}
                  <div style={{
                    padding: '12px',
                    flex: 1,
                    background: isBlank ? '#FAFAFA' : '#FFFDFD'
                  }}>
                    <textarea
                      readOnly
                      value={chunk}
                      style={{
                        width: '100%',
                        height: '160px',
                        border: '1px solid #F3DADA',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        lineHeight: '1.5',
                        color: isBlank ? '#AAA' : '#333',
                        background: '#FAFAFA',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.select()}
                    />
                  </div>

                  {/* Footer Nút Copy của thẻ */}
                  <div style={{
                    padding: '10px 12px',
                    background: '#FAFAFA',
                    borderTop: '1px solid #F3DADA',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      disabled={isBlank}
                      onClick={() => handleCopyChunk(idx, chunk)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isCopied ? '#4CAF50' : isBlank ? '#E0E0E0' : '#EFA9C2',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isBlank ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.2s'
                      }}
                    >
                      {isCopied ? "💖 Đã sao chép Đoạn " + (idx + 1) + " cho Vợ yêu!" : "📋 Sao chép Đoạn " + (idx + 1)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
