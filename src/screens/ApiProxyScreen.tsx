import React, { useState, useEffect } from "react";
import { ApiProfile, dbGetAll, dbPut, dbDelete, dbClearPrimary } from "../lib/api-db";
import { callAIText, callAIStream, pullModels } from "../lib/api-client";
import { getApiProxySettings, setApiProxySettings } from "../utils/apiProxy";
import { compressImageFile } from "../utils/imageCompressor";

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

  const [isWorking, setIsWorking] = useState(false);
  const [workStage, setWorkStage] = useState("");
  const [workNotification, setWorkNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Vision Multi-Modal Reference Image State
  const [refImage, setRefImage] = useState<string>("");
  const [refImageName, setRefImageName] = useState<string>("");
  const [visionTestPrompt, setVisionTestPrompt] = useState<string>(
    "Hãy phân tích chi tiết hình ảnh tham chiếu nhân vật này (tạo hình, trang phục, màu sắc, thần thái, phong cách nghệ thuật). Hãy chứng minh bạn đã 'nhìn' thấy rõ ảnh thay vì chỉ đọc văn bản, để đảm bảo bám sát thiết kế nhân vật."
  );

  const handleUploadRefImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefImageName(file.name);
    try {
      const compressed = await compressImageFile(file, 1024, 1024, 0.82);
      setRefImage(compressed);
      showMsg(`Đã tải ảnh tham chiếu "${file.name}" thành công vào bộ nhớ Vision.`);
    } catch (err) {
      showMsg(`❌ Lỗi tải ảnh: Không thể đọc file.`);
    }
  };

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

  const loadProfiles = async (autoFill = false) => {
    const all = await dbGetAll();
    all.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || b.updatedAt - a.updatedAt);
    setProfiles(all);
    if (autoFill && all.length > 0) {
      const primaryOrFirst = all.find(p => p.primary) || all[0];
      fillForm(primaryOrFirst);
    } else if (autoFill && all.length === 0) {
      fillForm();
    }
  };

  useEffect(() => {
    if (active) {
      setIsWorking(false);
      setWorkStage("");
      setWorkNotification(null);
      setTestOutput("");
      setIsError(false);
      loadProfiles(true);
    }
  }, [active]);

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

  const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 30));

  const handleTest = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setWorkStage(refImage ? "⏳ Đang đẩy ảnh tham chiếu vào Context Window và test Vision (No Stream)..." : "⏳ Đang test kết nối tạo nội dung (No Stream)...");
    setWorkNotification(null);
    await yieldToBrowser();
    const profile = await handleSave(false);
    if (!profile) {
      setIsWorking(false);
      return;
    }
    
    showMsg(refImage ? "Đang test AI nhìn ảnh tham chiếu (Vision Multi-Modal) qua API service của app..." : "Đang test kết nối tạo nội dung qua API service của app...\nNếu đang mở bản giao diện tĩnh/local preview thì backend/API service có thể chưa chạy. Vui lòng chạy bằng môi trường app có server/API service thật để test kết nối.");
    await yieldToBrowser();
    
    try {
      const startTime = Date.now();
      const testContent = refImage 
        ? [
            { type: "text", text: visionTestPrompt || "Hãy phân tích chi tiết hình ảnh tham chiếu này để xác nhận bạn 'nhìn' thấy ảnh thay vì chỉ đọc văn bản." },
            { type: "image_url", image_url: { url: refImage } }
          ]
        : "Reply with exactly OK.";

      const sampleText = await callAIText({
        messages: [{ role: "user", content: testContent }],
        profileOverride: profile
      });
      const elapsedMs = Date.now() - startTime;
      
      showMsg(`Kết nối tạo nội dung thành công.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nThời gian: ${elapsedMs}ms\nPhản hồi mẫu:\n${sampleText || "OK"}`);
      setWorkNotification({ msg: `✅ Kiểm tra kết nối thành công (${elapsedMs}ms)! ${refImage ? "AI đã 'nhìn' thấy ảnh tham chiếu và phản hồi chính xác." : "API Proxy đang hoạt động rất tốt."}`, type: 'success' });
      setTestOutput(`Kết nối tạo nội dung (No Stream) thành công.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nThời gian phản hồi: ${elapsedMs}ms${refImage ? "\n[Đã gửi kèm Ảnh tham chiếu vào Context Window]" : ""}\n\nNội dung AI phản hồi:\n${sampleText || "OK"}`);
      setIsError(false);
    } catch (err: any) {
      showMsg(`Chưa test được tạo nội dung.\nLý do: ${err.message}\n\nVui lòng kiểm tra lại endpoint hoặc API key.`, true);
      setWorkNotification({ msg: `❌ Lỗi kết nối: ${err.message}`, type: 'error' });
      setTestOutput(`❌ Lỗi kết nối:\n${err.message}`);
      setIsError(true);
    } finally {
      setIsWorking(false);
      setWorkStage("");
    }
  };

  const handleTestStream = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setWorkStage(refImage ? "⏳ Đang đẩy ảnh tham chiếu vào Context Window và kiểm tra Stream Vision..." : "⏳ Đang kết nối và kiểm tra Stream token từ API Proxy...");
    setWorkNotification(null);
    await yieldToBrowser();
    const profile = await handleSave(false);
    if (!profile) {
      setIsWorking(false);
      return;
    }
    
    showMsg(refImage ? "Đang test AI nhìn ảnh tham chiếu (STREAM VISION) qua API service của app..." : "Đang test kết nối tạo nội dung (STREAM) qua API service của app...\n");
    await yieldToBrowser();
    
    let fullContent = "";
    let chunkCount = 0;
    setTestOutput(refImage ? "⏳ Đang nhận stream phân tích ảnh từ AI Model...\n" : "Đang nhận stream...\n");

    const testContent = refImage 
      ? [
          { type: "text", text: visionTestPrompt || "Hãy phân tích chi tiết hình ảnh tham chiếu này để xác nhận bạn 'nhìn' thấy ảnh thay vì chỉ đọc văn bản." },
          { type: "image_url", image_url: { url: refImage } }
        ]
      : "Reply with exactly OK.";

    await callAIStream({
      messages: [{ role: "user", content: testContent }],
      profileOverride: profile,
      onToken: (chunk) => {
        chunkCount++;
        fullContent += chunk;
        setWorkStage(`🟢 Đang nhận Stream... (Đã nhận ${chunkCount} chunks)`);
        setTestOutput(`Kết nối tạo nội dung (STREAM) thành công.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nSố chunk đã nhận: ${chunkCount}${refImage ? "\n[Đã đẩy trực tiếp Ảnh tham chiếu vào Context Window]" : ""}\n\nNội dung đang stream:\n${fullContent}`);
      },
      onDone: (finalContent) => {
        setIsError(false);
        setIsWorking(false);
        setWorkStage("");
        setWorkNotification({ msg: `✅ Kiểm tra Stream thành công! Đã nhận đủ ${chunkCount} chunks từ API Proxy. ${refImage ? "AI đã 'nhìn' rõ ảnh tham chiếu!" : ""}`, type: 'success' });
        setTestOutput(`Kết nối tạo nội dung (STREAM) hoàn tất.\nEndpoint: ${profile.endpoint}\nModel: ${profile.model}\nTổng số chunk: ${chunkCount}${refImage ? "\n[Đã đẩy trực tiếp Ảnh tham chiếu vào Context Window]" : ""}\nNội dung cuối:\n${finalContent}`);
      },
      onError: (err) => {
        setIsWorking(false);
        setWorkStage("");
        setWorkNotification({ msg: `❌ Lỗi Stream: ${err}`, type: 'error' });
        showMsg(`Chưa test được stream.\nLý do: ${err}`, true);
        setTestOutput(`❌ Lỗi Stream:\n${err}`);
        setIsError(true);
      }
    });
  };

  const handlePullModels = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setWorkStage("⏳ Đang kết nối và tải danh sách model từ API Proxy...");
    setWorkNotification(null);
    await yieldToBrowser();
    const profile = getFormData();
    if (!profile.key || !profile.endpoint) {
      setIsWorking(false);
      showMsg("Cần nhập API key và endpoint trước khi kéo model.", true);
      return;
    }
    
    showMsg("Đang kéo danh sách model qua API service của app ...");
    await yieldToBrowser();
    try {
      const list = await pullModels(profile);
      setModelOptions(list.slice(0, 100));
      
      let msg = `Kéo danh sách model thành công.\nĐã kéo được ${list.length} model.\n${list.slice(0, 12).join("\n") || "Không có model trong phản hồi."}`;
      if (profile.model && !list.includes(profile.model)) {
          msg += `\n\n⚠️ Cảnh báo: Model hiện tại "${profile.model}" không có trong danh sách hỗ trợ của Proxy này. Vui lòng chọn một model khác từ danh sách.`;
      }
      
      showMsg(msg);
      setWorkNotification({ msg: `✅ Đã tải xong ${list.length} model từ API Proxy!`, type: 'success' });
    } catch (err: any) {
      showMsg(`Chưa kéo được model.\n${err.message}\n\nLưu ý: Một số API Proxy không hỗ trợ kéo tự động. Bạn có thể nhập tên model thủ công rồi bấm Lưu API.`, true);
      setWorkNotification({ msg: `❌ Lỗi khi tải model: ${err.message}`, type: 'error' });
    } finally {
      setIsWorking(false);
      setWorkStage("");
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
          <button className="btn soft" onClick={onHome} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, padding: '8px 14px', background: '#ffebee', color: '#c62828', border: '1px solid #e96b9b', borderRadius: '999px', cursor: 'pointer'}}>
            <svg viewBox="0 0 48 48" style={{width: 18, height: 18, stroke: 'currentColor', strokeWidth: 4, fill: 'none'}}><path d="M29 12L17 24l12 12"></path></svg>
            🏠 Về Home
          </button>
          <div className="api-title">
            <small>୨ৎ Main connection</small>
            <h2>Cài Đặt API Proxy</h2>
          </div>
          <button className="icon-btn" onClick={() => { fillForm(); showMsg("Đã mở hồ sơ API mới."); }}>
            <svg viewBox="0 0 48 48"><path d="M24 12v24M12 24h24"></path></svg>
          </button>
        </header>

        <style>{`
          @keyframes apiSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {isWorking && (
          <div style={{
            margin: '0 0 16px 0', padding: '14px 20px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #fff0f5 0%, #ffe4e1 100%)',
            border: '2px solid #ff69b4', boxShadow: '0 8px 24px rgba(255, 105, 180, 0.25)',
            display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', border: '3px solid #ffb6c1',
              borderTopColor: '#e91e63', animation: 'apiSpin 1s linear infinite', flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#880e4f' }}>
                {workStage || "⏳ Đang kết nối API Proxy..."}
              </div>
              <div style={{ fontSize: '12px', color: '#c2185b', marginTop: '2px' }}>
                Hệ thống đang giữ kết nối và xử lý luồng dữ liệu. Vui lòng không thoát trang...
              </div>
            </div>
          </div>
        )}

        {workNotification && (
          <div style={{
            margin: '0 0 16px 0', padding: '14px 20px', borderRadius: '16px',
            background: workNotification.type === 'success' ? '#e8f5e9' : '#ffebee',
            border: `1.5px solid ${workNotification.type === 'success' ? '#66bb6a' : '#ef5350'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: workNotification.type === 'success' ? '#2e7d32' : '#c62828' }}>
              {workNotification.msg}
            </div>
            <button
              onClick={() => setWorkNotification(null)}
              style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#666', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

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
          
          {/* MULTI-MODAL VISION ENGINE & REFERENCE IMAGE CONFIG */}
          <div style={{
            margin: '20px 0',
            padding: '18px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fff8fb 100%)',
            border: '2px solid #f48fb1',
            boxShadow: '0 8px 24px rgba(244, 143, 177, 0.18)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>🖼️</span>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#880e4f', fontWeight: 800 }}>
                Chuẩn Hóa & Kiểm Tra Xử Lý Ảnh Tham Chiếu (Multi-Modal Vision Engine)
              </h4>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#555', lineHeight: '1.5' }}>
              <b>Đẩy trực tiếp vào Context Window:</b> Để AI <i>"nhìn"</i> thấy ảnh thay vì chỉ đọc văn bản, giúp bám sát thiết kế nhân vật, cấu trúc code gửi kèm dữ liệu hình ảnh luôn được định dạng chuẩn mảng đa phương tiện (Base64 hoặc URL tham chiếu).
            </p>

            {/* Code preview */}
            <div style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '12px 16px',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              marginBottom: '14px',
              overflowX: 'auto',
              border: '1px solid #334155',
              lineHeight: '1.4'
            }}>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>// Cấu trúc payload gửi vào Context Window khi có ảnh tham chiếu:</div>
              <div>{`"messages": [`}</div>
              <div style={{ paddingLeft: '12px' }}>{`{`}</div>
              <div style={{ paddingLeft: '24px' }}>{`"role": "user",`}</div>
              <div style={{ paddingLeft: '24px' }}>{`"content": [`}</div>
              <div style={{ paddingLeft: '36px' }}>{`{ "type": "text", "text": "${visionTestPrompt ? (visionTestPrompt.length > 35 ? visionTestPrompt.slice(0, 35) + '...' : visionTestPrompt) : 'Phân tích hình ảnh...'}" },`}</div>
              <div style={{ paddingLeft: '36px', color: '#f472b6' }}>{`{ "type": "image_url", "image_url": { "url": "${refImage ? (refImage.length > 40 ? refImage.slice(0, 37) + '...' : refImage) : 'data:image/png;base64,iVBORw0KGgo...'}" } }`}</div>
              <div style={{ paddingLeft: '24px' }}>{`]`}</div>
              <div style={{ paddingLeft: '12px' }}>{`}`}</div>
              <div>{`]`}</div>
            </div>

            {/* Input & Upload Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <input 
                type="file" 
                id="refImageInput" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleUploadRefImage} 
              />
              <button 
                type="button"
                onClick={() => document.getElementById('refImageInput')?.click()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e91e63',
                  background: '#ffebee',
                  color: '#c62828',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📁 Chọn ảnh từ máy (Base64)
              </button>

              <input 
                type="text" 
                value={refImage} 
                onChange={(e) => { setRefImage(e.target.value); setRefImageName(e.target.value ? "URL/Base64 Image" : ""); }} 
                placeholder="Hoặc dán Link ảnh (https://...) hay chuỗi Base64 (data:image/...)" 
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #ffcdd2',
                  fontSize: '12px',
                  outline: 'none',
                  background: '#fff',
                  color: '#333'
                }}
              />

              {refImage && (
                <button 
                  type="button"
                  onClick={() => { setRefImage(""); setRefImageName(""); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#64748b',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Xóa ảnh
                </button>
              )}
            </div>

            {/* Thumbnail preview if exists */}
            {refImage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#fff0f5',
                border: '1px solid #ffb6c1',
                marginBottom: '12px'
              }}>
                <img 
                  src={refImage} 
                  alt="Ref Thumbnail" 
                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #e91e63' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#880e4f' }}>
                    ✅ {refImageName || "Ảnh tham chiếu đã sẵn sàng"}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#c2185b', marginTop: '2px' }}>
                    Ảnh này sẽ được gửi kèm trực tiếp vào Context Window khi bạn bấm nút Test bên dưới!
                  </div>
                </div>
              </div>
            )}

            {/* Vision prompt test */}
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#880e4f', marginBottom: '4px' }}>
                💬 Câu lệnh kiểm tra khả năng "nhìn" ảnh của AI (Vision Test Prompt):
              </label>
              <textarea 
                value={visionTestPrompt}
                onChange={(e) => setVisionTestPrompt(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #ffcdd2',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  background: '#fff',
                  color: '#333'
                }}
              />
            </div>
          </div>

          <div className="api-actions">
            <button className="soft-btn" onClick={handlePullModels} disabled={isWorking} style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
              <svg viewBox="0 0 48 48"><path d="M24 10v20"></path><path d="M15 22l9 9 9-9"></path><path d="M12 38h24"></path></svg>
              Kéo model
            </button>
            <button className="save-btn" onClick={() => handleSave(false)} disabled={isWorking} style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
              <svg viewBox="0 0 48 48"><path d="M12 12h20l4 4v20H12z"></path><path d="M18 12v10h12V12"></path><path d="M18 36V26h12v10"></path></svg>
              Lưu API
            </button>
          </div>
          <div className="api-actions">
            <button className="test-btn" onClick={handleTest} disabled={isWorking} style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
              <svg viewBox="0 0 48 48"><path d="M12 24h16"></path><path d="M24 14l10 10-10 10"></path><circle cx="24" cy="24" r="17"></circle></svg>
              Test nội dung (No Stream)
            </button>
            <button className="test-btn" onClick={handleTestStream} disabled={isWorking} style={isWorking ? { opacity: 0.6, cursor: 'not-allowed', background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', color: '#B33050' } : { background: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', color: '#B33050' }}>
              <svg viewBox="0 0 48 48"><path d="M24 14l10 10-10 10M12 24h20"></path></svg>
              Test Stream
            </button>
            <button className="soft-btn" onClick={() => handleSave(true)} disabled={isWorking} style={isWorking ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
              <svg viewBox="0 0 48 48"><path d="M24 9l4 11 12 1-9 8 3 11-10-6-10 6 3-11-9-8 12-1z"></path></svg>
              Đặt làm chính
            </button>
          </div>
          <p className="api-note">Mọi app con sau này sẽ đọc API chính tại đây. Khi chạy bản app thật, các route nội bộ như /api/test-proxy, /api/models và /api/ai-stream phải được xử lý bởi backend/server/API service của app. Các route này giúp request đi qua lớp trung gian của app để tránh CORS, bảo vệ API key và stream dữ liệu về UI ổn định.</p>
          
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
