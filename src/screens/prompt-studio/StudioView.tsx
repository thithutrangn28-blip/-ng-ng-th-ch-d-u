import React, { useState, useEffect } from "react";
import { Story } from "../../lib/prompt-context-db";
import { Run } from "../../lib/prompt-run-db";
import { rooms } from "../../lib/prompt-rooms";
import { ApiProfile } from "../../lib/api-client";
import { reparseFileItem } from "../../lib/file-importer";
import { Prompt10CardSplitter } from "./Prompt10CardSplitter";
import { copyToClipboardSafe } from "../../lib/clipboard";

type Props = {
  story: Story;
  time: string;
  battery: number;
  apiProfile: ApiProfile | null;
  runs: Run[];
  homeOutput: string;
  setHomeOutput: (s: string) => void;
  onCheckApi: () => void;
  onTestApi: () => void;
  onBack: () => void;
  onOpenRoom: (i: number) => void;
  onUpdateStory: (s: Story) => void;
  onMerge: () => void;
  onCallAll: () => void;
  onFiles: (files: FileList | null) => void;
  onClearFiles: () => void;
  onCreateBlankRun: () => void;
  onClearRuns: () => void;
  timeLabel: (ts: number) => string;
  contextMode: "full" | "compress" | "queue" | "preview" | "chunk";
  onContextModeChange: (mode: "full" | "compress" | "queue" | "preview" | "chunk") => void;
  outputMode?: "final" | "audit" | "debug";
  onOutputModeChange?: (mode: "final" | "audit" | "debug") => void;
  promptLanguage?: "vi" | "en" | "zh";
  onPromptLanguageChange?: (lang: "vi" | "en" | "zh") => void;
  showToast: (msg: string) => void;
};

export default function StudioView({
  story, time, battery, apiProfile, runs, homeOutput, setHomeOutput,
  onCheckApi, onTestApi, onBack, onOpenRoom, onUpdateStory, onMerge, onCallAll,
  onFiles, onClearFiles, onCreateBlankRun, onClearRuns, timeLabel,
  contextMode, onContextModeChange, outputMode = "final", onOutputModeChange,
  promptLanguage = "vi", onPromptLanguageChange, showToast
}: Props) {
  const [localStoryText, setLocalStoryText] = useState(story.context.story || "");
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);


  useEffect(() => {
    setLocalStoryText(story.context.story || "");
  }, [story.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localStoryText !== story.context.story) {
        onUpdateStory({ ...story, context: { ...story.context, story: localStoryText } });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [localStoryText, story]);

  const handleTextChange = (val: string) => {
    setLocalStoryText(val);
  };

  const handleTextBlur = () => {
    if (localStoryText !== story.context.story) {
      onUpdateStory({ ...story, context: { ...story.context, story: localStoryText } });
    }
  };

  const handleContextChange = (field: keyof Story["context"], val: string) => {
    onUpdateStory({ ...story, context: { ...story.context, [field]: val } });
  };

  const handleCopyOut = () => {
    copyToClipboardSafe(homeOutput);
  };

  const handleCopyCtx = () => {
    copyToClipboardSafe(story.context.mergedContext);
  };

  const handleShowDirectoryPicker = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        const readDir = async (handle: any, path: string) => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const f = await entry.getFile();
              Object.defineProperty(f, 'webkitRelativePath', { value: path ? `${path}/${f.name}` : f.name });
              files.push(f);
            } else if (entry.kind === 'directory') {
              await readDir(entry, path ? `${path}/${entry.name}` : entry.name);
            }
          }
        };
        await readDir(dirHandle, dirHandle.name);
        onFiles(files as any);
      } else {
        showToast("⚠️ Trình duyệt không hỗ trợ chọn thư mục, vui lòng dùng nút 'Chọn file từ máy' hoặc kéo thả nha.");
      }
    } catch (e) {
      console.log("User cancelled directory picker or error:", e);
    }
  };

  const handleViewParsedContent = (idx: number) => {
    if (!story.context.files) return;
    const f = story.context.files[idx];
    const text = f.parsedText || f.content;
    if (!text || !text.trim()) {
      showToast("📝 File này mới được chọn nhưng chưa được parse nội dung.");
      return;
    }
    setModalTitle(`📖 Nội dung đã đọc: ${f.fileName || f.name}`);
    setModalContent(text);
  };

  const handleViewSummary = (idx: number) => {
    if (!story.context.files) return;
    const f = story.context.files[idx];
    const summary = f.extractedSummary || f.summary;
    if (!summary || !summary.trim()) {
      showToast("📝 File này chưa có bản tóm tắt nội dung.");
      return;
    }
    setModalTitle(`📑 Tóm tắt file: ${f.fileName || f.name}`);
    setModalContent(summary);
  };

  const handleReParseLocalFile = (idx: number) => {
    if (!story.context.files) return;
    const updatedFiles = story.context.files.map((f, i) => {
      if (i === idx) {
        return reparseFileItem(f);
      }
      return f;
    });
    onUpdateStory({
      ...story,
      context: { ...story.context, files: updatedFiles }
    });
    showToast("🌸 Đã đọc lại và phân tích dữ kiện cho file!");
  };

  const handleExtractFacts = (idx: number) => {
    if (!story.context.files) return;
    const updatedFiles = story.context.files.map((f, i) => {
      if (i === idx) {
        return reparseFileItem(f);
      }
      return f;
    });
    onUpdateStory({
      ...story,
      context: { ...story.context, files: updatedFiles }
    });
    const f = updatedFiles[idx];
    const facts = f.importantFacts || {};
    const formatted = [
      `logline: ${(facts.logline || []).join(" | ") || "không có"}`,
      `characters: ${(facts.characters || []).join(" | ") || "không có"}`,
      `relationships: ${(facts.relationships || []).join(" | ") || "không có"}`,
      `setting: ${(facts.setting || []).join(" | ") || "không có"}`,
      `timeline: ${(facts.timeline || []).join(" | ") || "không có"}`,
      `canon: ${(facts.canon || facts.canonFacts || []).join(" | ") || "không có"}`,
      `memory: ${(facts.memory || []).join(" | ") || "không có"}`,
      `worldbuilding: ${(facts.worldbuilding || []).join(" | ") || "không có"}`,
      `writing rules: ${(facts.writingRules || facts.specialRules || []).join(" | ") || "không có"}`,
      `prompt requirements: ${(facts.promptRequirements || facts.promptInstructions || []).join(" | ") || "không có"}`
    ].map(line => `• ${line}`).join("\n\n");
    setModalTitle(`🔍 Dữ kiện truyện tách từ file: ${f.fileName || f.name}`);
    setModalContent(formatted);
  };

  const handleInsertToWorkspace = (idx: number) => {
    if (!story.context.files) return;
    const f = story.context.files[idx];
    const text = f.parsedText || f.content || "";
    const summary = f.extractedSummary || f.summary || "";
    if (!text.trim() && !summary.trim()) {
      showToast("📝 File này mới được chọn nhưng chưa được parse nội dung.");
      return;
    }
    const appendText = `\n\n--- [NẠP TỪ FILE: ${f.fileName || f.name}] ---\n${text || summary}\n`;
    const newStoryText = (story.context.story || "") + appendText;
    setLocalStoryText(newStoryText);
    onUpdateStory({
      ...story,
      context: { ...story.context, story: newStoryText }
    });
    showToast("🌸 Đã đưa nội dung file vào Story Workspace chính!");
  };

  const handleRemoveLocalFile = (idx: number) => {
    if (!story.context.files) return;
    const updatedFiles = story.context.files.filter((_, i) => i !== idx);
    onUpdateStory({
      ...story,
      context: { ...story.context, files: updatedFiles }
    });
  };

  return (
    <section className="screen active" id="studioScreen">
      <div className="grid">
        <aside className="card side">
          <div className="status"><span>{time}</span><span className="battery"><i style={{width: `${battery}%`}}></i></span></div>
          <div className="brand">
            <span className="eyebrow">Prompt Markdown Feature</span>
            <h1>Smart Context Studio</h1>
            <p>Đang làm việc trong truyện: {story.title || "Chưa đặt tên"}. Mọi dữ liệu thuộc riêng truyện này.</p>
          </div>
          <div className="apiBox">
            <div className="apiTop">
              <span className={`dot ${apiProfile ? "ok" : ""}`}></span>
              <div>
                <b>{apiProfile ? apiProfile.name || "API chính đã lưu" : "Chưa tìm thấy API chính"}</b>
                <p>{apiProfile ? `${apiProfile.model || "model"} · ${apiProfile.endpoint || "endpoint"} · ${apiProfile.timeoutSeconds || 900}s` : "Đọc API từ Cài Đặt API Proxy, không nhập lại API ở đây."}</p>
              </div>
            </div>
            <button className="btn soft" onClick={onCheckApi} style={{ width: "100%", marginTop: "10px" }}>Kiểm tra API chính</button>
            <button className="btn warn" onClick={onTestApi} style={{ width: "100%", marginTop: "10px" }}>Test API nhanh</button>
          </div>
          <div className="sideBtns">
            <button className="btn soft" onClick={onBack}>Đổi câu chuyện</button>
            <label className="btn pink"><input type="file" onChange={e => onFiles(e.target.files)} multiple style={{ display: 'none' }} />Nhập / import file</label>
          </div>
          <div className="roomList">
            {rooms.map((r, i) => (
              <button key={i} className="roomCard" onClick={() => onOpenRoom(i)}>
                <span className="roomNum">{String(i + 1).padStart(2, "0")}</span>
                <span><b>{r[0]}</b><span>{r[1]}</span></span>
                <i>100</i>
              </button>
            ))}
          </div>
        </aside>

        <section className="card">
          <header className="head">
            <div><span className="eyebrow">One Story · One Context Vault</span><h2>Kho dữ liệu của truyện này</h2></div>
            <div className="headBtns">
              <button className="btn soft" onClick={() => onUpdateStory(story)}>Lưu Context</button>
              <button className="btn pink" onClick={onMerge}>Smart Merge</button>
              <button className="btn blue" onClick={onCallAll}>Gọi API Proxy toàn bộ</button>
            </div>
          </header>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#F8EDED', padding: '10px 16px', borderBottom: '1px solid #F2B8CC', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#333' }}>🎛️ Chế độ Context Mode:</span>
              <button className={`btn ${contextMode === 'full' ? 'pink' : 'soft'}`} style={{ fontSize: '11.5px', padding: '4px 10px', background: contextMode === 'full' ? '#EFA9C2' : '#fff', color: contextMode === 'full' ? '#fff' : '#333' }} onClick={() => onContextModeChange('full')} title="Gửi toàn bộ chi tiết 100 tác vụ trong 1 lần gọi duy nhất">1. Full Room Mode (1 Lần Duy Nhất)</button>
              <button className={`btn ${contextMode === 'compress' ? 'pink' : 'soft'}`} style={{ fontSize: '11.5px', padding: '4px 10px', background: contextMode === 'compress' ? '#EFA9C2' : '#fff', color: contextMode === 'compress' ? '#fff' : '#333' }} onClick={() => onContextModeChange('compress')} title="Nén phần lặp, giữ nguyên quy chuẩn và boundary">2. Smart Compress Mode</button>
              <button className={`btn ${contextMode === 'queue' ? 'pink' : 'soft'}`} style={{ fontSize: '11.5px', padding: '4px 10px', background: contextMode === 'queue' ? '#EFA9C2' : '#fff', color: contextMode === 'queue' ? '#fff' : '#333' }} onClick={() => onContextModeChange('queue')} title="Gọi nối tiếp tuần tự tất cả các phòng để đảm bảo độ sâu tối đa">3. Queue All Rooms Mode</button>
              <button className={`btn ${contextMode === 'preview' ? 'pink' : 'soft'}`} style={{ fontSize: '11.5px', padding: '4px 10px', background: contextMode === 'preview' ? '#EFA9C2' : '#fff', color: contextMode === 'preview' ? '#fff' : '#333' }} onClick={() => onContextModeChange('preview')} title="Xem trước cấu trúc Prompt Markdown không tốn API">4. Debug Context Preview</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>🌐 Ngôn ngữ viết Prompt:</span>
              <button className={`btn ${promptLanguage === 'vi' ? 'pink' : 'soft'}`} style={{ fontSize: '11px', padding: '3px 8px', background: promptLanguage === 'vi' ? '#EFA9C2' : '#fff', color: promptLanguage === 'vi' ? '#fff' : '#333' }} onClick={() => onPromptLanguageChange && onPromptLanguageChange('vi')}>🇻🇳 Tiếng Việt</button>
              <button className={`btn ${promptLanguage === 'en' ? 'pink' : 'soft'}`} style={{ fontSize: '11px', padding: '3px 8px', background: promptLanguage === 'en' ? '#EFA9C2' : '#fff', color: promptLanguage === 'en' ? '#fff' : '#333' }} onClick={() => onPromptLanguageChange && onPromptLanguageChange('en')}>🇬🇧 Tiếng Anh</button>
              <button className={`btn ${promptLanguage === 'zh' ? 'pink' : 'soft'}`} style={{ fontSize: '11px', padding: '3px 8px', background: promptLanguage === 'zh' ? '#EFA9C2' : '#fff', color: promptLanguage === 'zh' ? '#fff' : '#333' }} onClick={() => onPromptLanguageChange && onPromptLanguageChange('zh')}>🇨🇳 Tiếng Trung</button>
            </div>
          </div>

          <div className="mainScroll">
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

            <section className="importPanel" style={{ background: '#F9F1F1', border: '1px solid #F2B8CC', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div className="vaultHead" style={{ borderBottom: '1px solid #F3DADA', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <small style={{ color: '#EFA9C2', fontWeight: 600 }}>Local Device Import</small>
                  <b style={{ fontSize: '18px', color: '#333' }}>File trong máy</b>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>App chỉ đọc file/thư mục vợ đã chọn, gắn riêng vào truyện "{story.title || "Chưa đặt tên"}". Không tự quét máy, không cần Google Drive hay Gemini API.</p>
                </div>
              </div>

              <div className="btnRow" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <label className="btn pink" style={{ background: '#F2B8CC', color: '#333', cursor: 'pointer' }}>
                  <input type="file" onChange={e => onFiles(e.target.files)} style={{ display: 'none' }} />
                  1. Chọn file trong máy
                </label>
                <label className="btn blue" style={{ background: '#EFA9C2', color: '#fff', cursor: 'pointer' }}>
                  <input type="file" multiple onChange={e => onFiles(e.target.files)} style={{ display: 'none' }} />
                  2. Chọn nhiều file
                </label>
                <label className="btn soft" style={{ background: '#F8EDED', border: '1px solid #F2B8CC', color: '#333', cursor: 'pointer' }}>
                  <input type="file" webkitdirectory="" directory="" multiple onChange={e => onFiles(e.target.files)} style={{ display: 'none' }} />
                  3. Chọn thư mục trong máy
                </label>
                <button className="btn ghost" onClick={handleShowDirectoryPicker} style={{ fontSize: '13px' }} title="Dùng Directory Picker của trình duyệt (nếu hỗ trợ)">
                  Mở trình chọn thư mục
                </button>
              </div>

              <div className="fileTools">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <b style={{ fontSize: '14px', color: '#444' }}>Danh sách file đang gắn với truyện này ({story.context.files?.length || 0})</b>
                  {story.context.files && story.context.files.length > 0 && (
                    <button className="btn ghost" onClick={onClearFiles} style={{ fontSize: '12px', color: '#d9534f' }}>Xóa tất cả khỏi truyện</button>
                  )}
                </div>

                <div className="fileList" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {(!story.context.files || story.context.files.length === 0) ? (
                    <div className="fileItem" style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #F2B8CC' }}>
                      <b style={{ color: '#888' }}>Chưa có file nào được chọn cho câu chuyện này</b>
                      <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>Hãy bấm các nút bên trên để chọn file hoặc thư mục từ máy của vợ nhé!</p>
                    </div>
                  ) : (
                    story.context.files.map((f: any, i: number) => (
                      <div className="fileItem" key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #F3DADA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <b style={{ fontSize: '15px', color: '#333', wordBreak: 'break-all' }}>{f.fileName || f.name}</b>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '12px', lineHeight: '1.6' }}>
                              <span>📄 File name: <b>{f.fileName || f.name}</b></span>
                              <span>📑 File type: <b>{f.fileType || f.ext || "unknown"}</b></span>
                              <span>🖥️ Source: <b>{f.source || "local_device"}</b></span>
                              <span>⚡ Parser status: <b>{f.parserStatus || f.status || "reading"}</b></span>
                              <span>📏 Parsed text length: <b>{(f.parsedText || f.content || "").length} ký tự</b></span>
                              <span>🪙 Estimated token count: <b>{f.estimatedTokens || Math.round(((f.parsedText || f.content || "").length)/3.8)} tokens</b></span>
                              <span>📋 Extracted summary status: <b>{(f.extractedSummary || f.summary) ? "Đã có tóm tắt" : "Chưa có"}</b></span>
                              <span>🔗 Attached storyId: <b>{f.storyId || story.id || "Chưa gắn"}</b></span>
                            </div>
                          </div>
                          <span style={{ 
                            fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600,
                            background: f.parserStatus === 'parsed' ? '#d4edda' : f.parserStatus === 'summarized' ? '#fff3cd' : '#f8d7da',
                            color: f.parserStatus === 'parsed' ? '#155724' : f.parserStatus === 'summarized' ? '#856404' : '#721c24'
                          }}>
                            Status: {f.parserStatus || f.status}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #f9f9f9', paddingTop: '8px', flexWrap: 'wrap' }}>
                          <button className="btn soft" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => handleViewParsedContent(i)}>
                            1. Xem nội dung đã đọc
                          </button>
                          <button className="btn soft" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => handleViewSummary(i)}>
                            2. Xem tóm tắt file
                          </button>
                          <button className="btn soft" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => handleReParseLocalFile(i)}>
                            3. Parse lại file
                          </button>
                          <button className="btn pink" style={{ fontSize: '12px', padding: '4px 10px', background: '#F2B8CC' }} onClick={() => handleExtractFacts(i)}>
                            4. Tách dữ kiện truyện
                          </button>
                          <button className="btn blue" style={{ fontSize: '12px', padding: '4px 10px', background: '#EFA9C2', color: '#fff' }} onClick={() => handleInsertToWorkspace(i)}>
                            5. Đưa vào Story Workspace
                          </button>
                          <button className="btn ghost" style={{ fontSize: '12px', padding: '4px 10px', color: '#d9534f' }} onClick={() => handleRemoveLocalFile(i)}>
                            6. Gỡ khỏi truyện
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="workspaceGrid" style={{ display: 'block' }}>
              <div className="field big" style={{ height: '600px' }}>
                <label>Câu chuyện / Story Workspace chính (Tất cả bối cảnh, lịch sử, cốt truyện ở đây)</label>
                <textarea 
                  value={localStoryText} 
                  onChange={e => handleTextChange(e.target.value)} 
                  onBlur={handleTextBlur}
                  placeholder="Viết câu chuyện của bạn vào đây từ đầu đến cuối..."
                  style={{ height: '100%', minHeight: '550px', fontSize: '14px', lineHeight: '1.6' }}
                ></textarea>
              </div>
            </section>

            <div className="vault">
              <div className="vaultHead"><div><small>Context Vault</small><b>Context của riêng truyện này</b></div><button className="btn ghost" onClick={handleCopyCtx}>Copy</button></div>
              <pre className="merged">{story.context.mergedContext || "Bấm Smart Merge để hợp nhất context của truyện đang chọn."}</pre>
              <Prompt10CardSplitter text={story.context.mergedContext || ""} title={`Context truyện "${story.title}"`} />
            </div>

            <div className="outputVault">
              <div className="vaultHead"><div><small>API Output Vault</small><b>Kết quả API của truyện này</b></div><button className="btn ghost" onClick={handleCopyOut}>Copy</button></div>
              <pre className="output">{homeOutput}</pre>
              <Prompt10CardSplitter text={homeOutput} title={`Prompt kết quả truyện "${story.title}"`} />
            </div>

            <div className="runArchive">
              <div className="vaultHead">
                <div><small>Run Archive</small><b>Các đợt API của truyện này</b></div>
                <div className="runTools"><button className="btn ghost" onClick={onCreateBlankRun}>Tạo đợt trống</button><button className="btn warn" onClick={onClearRuns}>Xóa đợt truyện này</button></div>
              </div>
              <div className="runList">
                {runs.length === 0 ? (
                  <div className="runCard"><span className="runNo">--</span><span><b>Chưa có đợt nào trong truyện này</b><span>Gọi API Proxy để tạo đợt riêng cho truyện đang chọn.</span></span><i className="runStatus">empty</i></div>
                ) : (
                  runs.map(r => (
                    <button key={r.id} className="runCard" onClick={() => {
                      const text = r.content || r.prompt || "Chưa có nội dung";
                      setHomeOutput(text);
                      const el = document.querySelector('.outputVault');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
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

      {modalTitle && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '2px solid #F5C6D6'
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #F3DADA',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#F8EDED', borderTopLeftRadius: '10px', borderTopRightRadius: '10px'
            }}>
              <b style={{ fontSize: '16px', color: '#333' }}>{modalTitle}</b>
              <button
                className="btn ghost"
                style={{ fontSize: '18px', padding: '4px 10px', lineHeight: 1 }}
                onClick={() => { setModalTitle(null); setModalContent(null); }}
              >✕</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px',
                lineHeight: '1.6', color: '#333', margin: 0, fontFamily: 'monospace',
                background: '#fcfcfc', padding: '15px', borderRadius: '8px', border: '1px solid #eee'
              }}>
                {modalContent || "Trống"}
              </pre>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F3DADA', textAlign: 'right', background: '#fff', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
              <button className="btn soft" onClick={() => { setModalTitle(null); setModalContent(null); }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
