import React, { useState, useEffect } from "react";
import { ApiProfile, dbGetAll, dbPut, dbDelete, dbClearPrimary } from "../lib/api-db";

type Props = {
  active: boolean;
  onHome: () => void;
};

export default function ApiProxyScreen({ active, onHome }: Props) {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [mode, setMode] = useState<"official" | "proxy">("official");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [pathMode, setPathMode] = useState<"auto" | "v1" | "none">("auto");
  const [format, setFormat] = useState<"openai" | "responses" | "custom">("openai");
  const [model, setModel] = useState("");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [timeoutSeconds, setTimeoutSeconds] = useState(900);
  const [headersStr, setHeadersStr] = useState("");
  
  const [testOutput, setTestOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const loadProfiles = async () => {
    const all = await dbGetAll();
    all.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || b.updatedAt - a.updatedAt);
    setProfiles(all);
  };

  useEffect(() => {
    loadProfiles();
  }, [active]);

  const fillForm = (p?: ApiProfile) => {
    if (p) {
      setEditingId(p.id);
      setMode(p.mode);
      setName(p.name);
      setKey(p.key);
      setEndpoint(p.endpoint);
      setPathMode(p.pathMode);
      setFormat(p.format);
      setModel(p.model);
      setMaxTokens(p.maxTokens);
      setTimeoutSeconds(p.timeoutSeconds);
      setHeadersStr(p.extraHeaders ? JSON.stringify(p.extraHeaders, null, 2) : "");
      setModelOptions([]); // Reset model options when loading a profile
    } else {
      setEditingId(null);
      setMode("official");
      setName("");
      setKey("");
      setEndpoint("");
      setPathMode("auto");
      setFormat("openai");
      setModel("");
      setMaxTokens(4096);
      setTimeoutSeconds(900);
      setHeadersStr("");
    }
  };

  const showMsg = (msg: string, error = false) => {
    setTestOutput(msg);
    setIsError(error);
  };

  const getFormData = (): ApiProfile => {
    let extraHeaders = {};
    try {
      if (headersStr.trim()) extraHeaders = JSON.parse(headersStr);
    } catch (e) {
      // ignore
    }
    
    return {
      id: editingId || `api_${Date.now()}`,
      mode,
      name: name.trim() || "MinMin API",
      key,
      endpoint: endpoint.trim(),
      pathMode,
      format,
      model: model.trim(),
      maxTokens,
      timeoutSeconds,
      extraHeaders,
      primary: false,
      updatedAt: Date.now()
    };
  };

  const handleSave = async (makePrimary = false) => {
    const profile = getFormData();
    if (!profile.key || !profile.endpoint || !profile.model) {
      showMsg("Thiếu API key, endpoint hoặc model. Điền đủ rồi lưu lại nha.", true);
      return null;
    }
    
    if (makePrimary) {
      await dbClearPrimary();
      profile.primary = true;
    } else if (editingId) {
      const old = profiles.find((p) => p.id === editingId);
      profile.primary = !!old?.primary;
    } else {
      profile.primary = profiles.length === 0;
    }
    
    await dbPut(profile);
    setEditingId(profile.id);
    await loadProfiles();
    
    showMsg(`Đã lưu API: ${profile.name}\nTrạng thái: ${profile.primary ? "API chính" : "API dự phòng"}\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}`);
    return profile;
  };

  const handleTest = async () => {
    const profile = await handleSave(false);
    if (!profile) return;
    
    showMsg("Đang test kết nối tạo nội dung qua route /api/test-proxy ...\nNếu mở file local thì route backend chưa chạy; deploy Cloudflare Pages để test thật.");
    
    try {
      const res = await fetch("/api/test-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, action: "test_generation" })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(
          "Backend route /api/test-proxy không trả về JSON. Nó trả về:\n" +
          text.slice(0, 120)
        );
      }
      
      if (!res.ok || data.ok === false) throw new Error(data.error || "Lỗi không xác định");
      
      let sampleText = data.sample;
      if (data.parsedData && data.parsedData.choices && data.parsedData.choices[0]?.message?.content) {
        sampleText = data.parsedData.choices[0].message.content;
      }
      
      showMsg(`Kết nối tạo nội dung thành công.\nEndpoint: ${data.endpointUsed || profile.endpoint}\nModel: ${profile.model}\nThời gian: ${data.elapsedMs || "?"}ms\nPhản hồi mẫu: ${sampleText || "OK"}`);
    } catch (err: any) {
      showMsg(`Chưa test được tạo nội dung.\nLý do: ${err.message}\n\nDeploy ZIP lên Cloudflare Pages để functions/api/test-proxy.js hoạt động.`, true);
    }
  };

  const handleTestStream = async () => {
    const profile = await handleSave(false);
    if (!profile) return;
    
    showMsg("Đang test kết nối tạo nội dung (STREAM) qua route /api/ai-stream ...\n");
    
    try {
      const payload = {
        profile,
        messages: [{ role: "user", content: "Reply with exactly OK." }]
      };

      const res = await fetch("/api/ai-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let fullContent = "";
      let chunkCount = 0;
      let buffer = "";
      
      setTestOutput("Đang nhận stream...\n");

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunkCount++;
          buffer += decoder.decode(value, { stream: true });
          
          let lines = buffer.split("\n");
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices[0]?.delta?.content) {
                  fullContent += data.choices[0].delta.content;
                  setTestOutput(`Kết nối tạo nội dung (STREAM) thành công.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nSố chunk đã nhận: ${chunkCount}\n\nNội dung đang stream: ${fullContent}`);
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
      
      setIsError(false);
      setTestOutput(`Kết nối tạo nội dung (STREAM) hoàn tất.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nTổng số chunk: ${chunkCount}\nNội dung cuối: ${fullContent}`);
      
    } catch (err: any) {
      showMsg(`Chưa test được stream.\nLý do: ${err.message}`, true);
    }
  };

  const handlePullModels = async () => {
    const profile = getFormData();
    if (!profile.key || !profile.endpoint) {
      showMsg("Cần nhập API key và endpoint trước khi kéo model.", true);
      return;
    }
    
    showMsg("Đang kéo danh sách model qua route /api/models ...");
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(
          "Backend route /api/models không trả về JSON. Nó trả về:\n" +
          text.slice(0, 120)
        );
      }
      
      if (!res.ok || data.ok === false) throw new Error(data.error || "Lỗi không xác định");
      
      const list = data.models || [];
      setModelOptions(list.slice(0, 100));
      
      let msg = `Kéo danh sách model thành công.\nĐã kéo được ${list.length} model.\n${list.slice(0, 12).join("\n") || "Không có model trong phản hồi."}`;
      if (profile.model && !list.includes(profile.model)) {
          msg += `\n\n⚠️ Cảnh báo: Model hiện tại "${profile.model}" không có trong danh sách hỗ trợ của Proxy này. Vui lòng chọn một model khác từ danh sách.`;
      }
      
      showMsg(msg);
    } catch (err: any) {
      showMsg(`Chưa kéo được model.\n${err.message}\n\nLưu ý: Một số API Proxy không hỗ trợ kéo tự động. Bạn có thể nhập tên model thủ công rồi bấm Lưu API.`, true);
    }
  };

  const maskKey = (k: string) => {
    if (!k) return "chưa có key";
    if (k.length <= 8) return "••••";
    return k.slice(0, 4) + "••••" + k.slice(-4);
  };

  return (
    <section className={`screen api-screen ${active ? "active" : ""}`} id="apiProxy">
      <div className="api-bg"></div>
      <section className="api-wrap">
        <header className="api-head">
          <button className="icon-btn" onClick={onHome}>
            <svg viewBox="0 0 48 48"><path d="M29 12L17 24l12 12"></path></svg>
          </button>
          <div className="api-title">
            <small>୨ৎ Main connection</small>
            <h2>Cài Đặt API Proxy</h2>
          </div>
          <button className="icon-btn" onClick={() => { fillForm(); showMsg("Đã mở hồ sơ API mới."); }}>
            <svg viewBox="0 0 48 48"><path d="M24 12v24M12 24h24"></path></svg>
          </button>
        </header>

        <section className="api-card">
          <div className="segmented">
            <button className={`seg ${mode === "official" ? "active" : ""}`} onClick={() => setMode("official")}>API chính thức</button>
            <button className={`seg ${mode === "proxy" ? "active" : ""}`} onClick={() => setMode("proxy")}>API Proxy bên thứ ba</button>
          </div>
          <div className="form-grid">
            <div className="field"><label>Tên lưu API</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ví dụ: MinMin Main Proxy" /></div>
            <div className="field"><label>API Key</label><input type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off" placeholder="Dán key của bạn tại đây" /></div>
            <div className="field"><label>Địa chỉ điểm cuối</label><input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://.../v1 hoặc endpoint proxy của bạn" /></div>
            <div className="row-2">
              <div className="field">
                <label>Kiểu đường dẫn</label>
                <select value={pathMode} onChange={e=>setPathMode(e.target.value as any)}>
                  <option value="auto">Tự nhận diện</option>
                  <option value="v1">Giữ /v1</option>
                  <option value="none">Không thêm /v1</option>
                </select>
              </div>
              <div className="field">
                <label>Định dạng</label>
                <select value={format} onChange={e=>setFormat(e.target.value as any)}>
                  <option value="openai">OpenAI compatible</option>
                  <option value="responses">Responses API</option>
                  <option value="custom">Proxy custom</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Model đang dùng</label>
              {modelOptions.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={model} onChange={e=>setModel(e.target.value)} style={{ flex: 1 }}>
                    <option value="">-- Chọn Model --</option>
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button 
                    onClick={() => setModelOptions([])} 
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(93,118,207,.18)', borderRadius: '12px', padding: '0 12px', fontSize: '12px', fontWeight: 'bold', color: '#6f87d4' }}
                    title="Nhập tay model"
                  >
                    Nhập tay
                  </button>
                </div>
              ) : (
                <input value={model} onChange={e=>setModel(e.target.value)} placeholder="Ví dụ: gpt-4o-mini, claude, gemini..." />
              )}
            </div>
            <div className="row-2">
              <div className="field"><label>Max tokens</label><input type="number" min="1" value={maxTokens} onChange={e=>setMaxTokens(Number(e.target.value))} /></div>
              <div className="field"><label>Timeout stream</label><input type="number" min="60" value={timeoutSeconds} onChange={e=>setTimeoutSeconds(Number(e.target.value))} /></div>
            </div>
            <div className="field"><label>Header phụ nếu proxy cần</label><textarea value={headersStr} onChange={e=>setHeadersStr(e.target.value)} placeholder='{"HTTP-Referer":"https://your-site.pages.dev"}'></textarea></div>
          </div>
          
          <div className="api-actions">
            <button className="soft-btn" onClick={handlePullModels}>
              <svg viewBox="0 0 48 48"><path d="M24 10v20"></path><path d="M15 22l9 9 9-9"></path><path d="M12 38h24"></path></svg>
              Kéo model
            </button>
            <button className="save-btn" onClick={() => handleSave(false)}>
              <svg viewBox="0 0 48 48"><path d="M12 12h20l4 4v20H12z"></path><path d="M18 12v10h12V12"></path><path d="M18 36V26h12v10"></path></svg>
              Lưu API
            </button>
          </div>
          <div className="api-actions">
            <button className="test-btn" onClick={handleTest}>
              <svg viewBox="0 0 48 48"><path d="M12 24h16"></path><path d="M24 14l10 10-10 10"></path><circle cx="24" cy="24" r="17"></circle></svg>
              Test nội dung (No Stream)
            </button>
            <button className="test-btn" onClick={handleTestStream} style={{ background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', color: '#B33050' }}>
              <svg viewBox="0 0 48 48"><path d="M24 14l10 10-10 10M12 24h20"></path></svg>
              Test Stream
            </button>
            <button className="soft-btn" onClick={() => handleSave(true)}>
              <svg viewBox="0 0 48 48"><path d="M24 9l4 11 12 1-9 8 3 11-10-6-10 6 3-11-9-8 12-1z"></path></svg>
              Đặt làm chính
            </button>
          </div>
          <p className="api-note">Mọi app con sau này sẽ đọc API chính tại đây. Khi deploy Cloudflare, route /api/test-proxy và /api/ai-stream giúp request đi qua cùng domain để tránh CORS.</p>
          
          {testOutput && (
            <pre className="test-output" style={{ background: isError ? "#5b2537" : "#23305d" }}>
              {testOutput}
            </pre>
          )}
        </section>

        <section className="api-card">
          <div className="api-title"><small>★ Saved profiles</small><h2>Kho API đã lưu</h2></div>
          <div className="saved-list">
            {profiles.length === 0 ? (
              <div className="saved-item">
                <div className="saved-top">
                  <b>Chưa có API nào được lưu</b><small>୨ৎ</small>
                </div>
                <div className="saved-badges">
                  <span className="badge">Bấm Lưu API để tạo hồ sơ đầu tiên</span>
                </div>
              </div>
            ) : (
              profiles.map(p => (
                <div key={p.id} className="saved-item">
                  <div className="saved-top">
                    <div>
                      <b>{p.name}</b><br />
                      <small>{p.model || "chưa chọn model"}</small>
                    </div>
                    <small>{p.primary ? "Đang dùng" : "Dự phòng"}</small>
                  </div>
                  <div className="saved-badges">
                    {p.primary && <span className="badge primary-badge">API chính</span>}
                    <span className="badge">{p.mode === "proxy" ? "Proxy bên thứ ba" : "API chính thức"}</span>
                    <span className="badge">{maskKey(p.key)}</span>
                    <span className="badge">{p.pathMode || "auto"}</span>
                  </div>
                  <div className="saved-controls">
                    <button onClick={() => { fillForm(p); showMsg(`Đang sửa hồ sơ: ${p.name}`); }}>Sửa</button>
                    <button onClick={async () => { await dbClearPrimary(); await dbPut({...p, primary: true, updatedAt: Date.now()}); await loadProfiles(); showMsg(`Đã đặt "${p.name}" làm API chính.`); }}>Làm chính</button>
                    <button onClick={async () => { await dbDelete(p.id); if (editingId === p.id) fillForm(); await loadProfiles(); showMsg("Đã xóa hồ sơ API."); }}>Xóa</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </section>
  );
}
