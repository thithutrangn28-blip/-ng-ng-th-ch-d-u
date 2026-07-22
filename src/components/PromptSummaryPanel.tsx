import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { copyToClipboardSafe } from '../lib/clipboard';

interface PromptSummaryPanelProps {
  apiSignals: any;
  promptRunId: string;
  orderedVisionRefs: any[];
  currentStory: any;
  roomDef: any;
  cards: any[];
  contentArray: any[];
  finalPrompt: string; // The full raw prompt text
  toast: (msg: string) => void;
}

// ... keep existing imports ...

// ... BunnyCopyButton ...

// Improved BunnyCopyButton that handles N parts sequentially
const BunnyCopyButton = ({ totalPrompt, promptRunId, toast }: { totalPrompt: string, promptRunId: string, toast: (msg: string) => void }) => {
  const [cycle, setCycle] = useState(0); 

  // Split prompt into parts.
  const parts = useMemo(() => {
    if (!totalPrompt) return [];
    
    // Split by Card Markers or Section Markers
    const sections = totalPrompt.split(/(?=\[CARD_ID:.*?\]|\[CARD:.*?\]|\[THẺ:.*?\]|###\s+|(?:\n|^)\*\*(?:\[\d+\/\d+\]|Part \d+:|Mục \d+:|Phần \d+:?))/i).filter(s => s.trim().length > 0);
    
    if (sections.length > 1) return sections;

    // Fallback: split by paragraph
    const paragraphs = totalPrompt.split('\n\n');
    return paragraphs.filter(p => p.trim().length > 0);
  }, [totalPrompt]);

  const n = parts.length;

  const handleCopy = () => {
    const nextCycle = cycle % n;
    const part = parts[nextCycle];
    
    copyToClipboardSafe(part.trim());
    
    toast(`Đã chép PHẦN ${nextCycle + 1}/${n} 🐰`);
    
    setCycle((prev) => (prev + 1) % n);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label="Sao chép tuần tự"
      style={{
        width: 100,
        height: 52,
        borderRadius: 26,
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
        border: '2px solid #fff',
        boxShadow: '0 4px 12px rgba(210, 58, 115, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'transform 0.1s ease',
        fontWeight: 700,
        color: '#d23a73'
      }}
    >
      <span>🐰</span>
      <span>{n > 0 ? `PHẦN ${(cycle % n) + 1}/${n}` : 'COPY'}</span>
    </button>
  );
};
// ... rest of the file

const PromptSectionCard = ({ index, title, content, toast }: { index: number, title: string, content: string, toast: (msg: string) => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboardSafe(content);
    setCopied(true);
    toast(`Đã chép phần ${index + 1}: ${title}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prompt-copy-card" style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: '#d23a73', fontSize: 16, fontWeight: 700 }}>
          <span style={{ 
            display: 'inline-block', 
            background: '#d23a73', 
            color: '#fff', 
            borderRadius: '50%', 
            width: 24, 
            height: 24, 
            textAlign: 'center', 
            lineHeight: '24px',
            marginRight: 8,
            fontSize: 12
          }}>{index + 1}</span>
          {title}
        </h4>
        <button 
          onClick={handleCopy}
          style={{
            background: copied ? '#4caf50' : '#fff',
            color: copied ? '#fff' : '#d23a73',
            border: `1px solid ${copied ? '#4caf50' : '#ffd1e3'}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {copied ? 'Đã chép ✓' : 'Sao chép'}
        </button>
      </div>
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        color: '#333',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace'
      }}>
        {content}
      </div>
    </div>
  );
};

export const PromptSummaryPanel = ({ apiSignals, promptRunId, orderedVisionRefs, currentStory, roomDef, cards, finalPrompt, toast }: PromptSummaryPanelProps) => {
  
  const sections = useMemo(() => {
    if (!finalPrompt) return [];
    
    // Attempt to parse sections from the final prompt.
    // Assuming sections start with **[number/total] Title** or **Part X: Title**
    const lines = finalPrompt.split('\n');
    let parsedSections: {title: string, content: string}[] = [];
    let currentTitle = '';
    let currentContent: string[] = [];

    lines.forEach(line => {
      const cardMatch = line.match(/^\[(?:CARD_ID|CARD|THẺ):\s*(.*?)\]/i);
      const isHeader = line.match(/^\*\*(?:\[\d+\/\d+\]|Part \d+:|Mục \d+:|Phần \d+:?)(.*)\*\*/i) || 
                       line.match(/^###\s*(?:\d+\.)?(.*)/);
      if (cardMatch || isHeader) {
        if (currentTitle || currentContent.length > 0) {
          parsedSections.push({ title: currentTitle || 'Phần không tên', content: currentContent.join('\n').trim() });
        }
        if (cardMatch) {
          currentTitle = `Thẻ: ${cardMatch[1]?.trim() || 'Work Card'}`;
        } else {
          currentTitle = isHeader![1]?.trim() || line.replace(/\*/g, '').trim();
        }
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    });

    if (currentTitle || currentContent.length > 0) {
      parsedSections.push({ title: currentTitle || 'Phần không tên', content: currentContent.join('\n').trim() });
    }

    // If parsing fails to find sections, just return one big section
    if (parsedSections.length === 0) {
      parsedSections.push({ title: 'Toàn bộ Prompt', content: finalPrompt.trim() });
    }

    return parsedSections;
  }, [finalPrompt]);

  return (
    <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 24, border: '1px solid #ffd1e3', boxShadow: '0 8px 32px rgba(210, 58, 115, 0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#d23a73', fontSize: 20 }}>Bảng tổng hợp toàn bộ Prompt của lượt này</h2>
        <BunnyCopyButton totalPrompt={finalPrompt} promptRunId={promptRunId} toast={toast} />
      </div>

      <div style={{ background: '#fdf2f8', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 13, color: '#555', border: '1px solid #fbcfe8' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><b>Thời gian chạy:</b> {apiSignals.elapsedSeconds}s</div>
          <div><b>Model:</b> Đã sử dụng (Gemini)</div>
          <div><b>Ảnh tham chiếu:</b> {orderedVisionRefs.length} ảnh</div>
          <div><b>Story:</b> {currentStory.title}</div>
          <div><b>Room:</b> {roomDef.title}</div>
          <div><b>Cards:</b> {cards.map(c => c.title).join(', ')}</div>
          <div><b>Token (In/Out/Total):</b> {apiSignals.inputTokens || 'Không có dữ liệu'} / {apiSignals.outputTokens || 'Không có dữ liệu'} / {apiSignals.totalTokens || 'Không có dữ liệu'}</div>
          <div><b>Request ID:</b> <span style={{ fontFamily: 'monospace' }}>{promptRunId.slice(0, 8)}</span></div>
        </div>
      </div>

      <div className="prompt-sections-container">
        {sections.map((sec, idx) => (
          <PromptSectionCard 
            key={idx} 
            index={idx} 
            title={sec.title} 
            content={sec.content} 
            toast={toast} 
          />
        ))}
      </div>
    </div>
  );
};
