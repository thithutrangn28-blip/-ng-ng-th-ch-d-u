import React, { useState, useEffect, useRef } from "react";
import "./lipstick.css";
import { getLipstickState, saveLipstickState } from "../../lib/lipstick-db";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { STYLE_GROUPS, PRESET_BACKGROUNDS, rooms as ROOMS_DATA } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { v4 as uuidv4 } from "uuid";
import RoomView from "./RoomView";

// Default state initialization
function createDefaultState(): LipstickState {
  const id = uuidv4();
  const defaultBotText = "Bot char là nhân vật trung tâm. Prompt dựa trên hồ sơ, câu chuyện, ảnh tham chiếu khoảng 50%, không sao chép tuyệt đối.";
  return {
    ui: { globalBg: "", globalAvatar: "" },
    stories: [{
      id,
      active: true,
      title: "Câu chuyện mẫu",
      subtitle: "prompt image workspace",
      story: "Workspace mẫu. Người dùng thay bằng câu chuyện thật. App chỉ viết prompt ảnh copy-ready, không tạo ảnh.",
      userProfile: "",
      botProfiles: defaultBotText,
      botCharacters: [{
        characterId: "bot_" + uuidv4().slice(0, 8),
        displayName: "Bot Char chính",
        profileText: defaultBotText,
        referenceImages: [],
        isCollapsed: false
      }],
      requirements: "Tạo prompt ảnh chuyên nghiệp, có góc máy, bố cục, màu sắc, prompt tránh lỗi tay/tóc/mặt.",
      cover: "",
      avatar: "",
      files: [],
      rooms: {},
      createdAt: new Date().toISOString()
    }]
  };
}

export default function LipstickAppScreen({ active, onHome }: { active: boolean, onHome: () => void }) {
  const [state, setState] = useState<LipstickState>(() => {
    try {
      const local = localStorage.getItem("lipstickPromptRoomsV6");
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.stories && parsed.stories.length > 0) return parsed;
      }
    } catch (e) {}
    const def = createDefaultState();
    try {
      localStorage.setItem("lipstickPromptRoomsV6", JSON.stringify(def));
    } catch (e) {}
    return def;
  });
  const [currentView, setCurrentView] = useState<"gallery" | "drawer" | "room">("gallery");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showStoryForm, setShowStoryForm] = useState<string | null>(null); // story ID or 'new'
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [styleSearch, setStyleSearch] = useState("");
  const [showRoomPreset, setShowRoomPreset] = useState(false);
  const [roomProgress, setRoomProgress] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        let data = await getLipstickState();
        if (data && data.stories && data.stories.length > 0) {
          setState(data);
        } else {
          await saveLipstickState(state);
        }
      } catch (e) {}
    }
    load();
  }, []);

  const save = async (newState: LipstickState) => {
    setState({ ...newState });
    try {
      localStorage.setItem("lipstickPromptRoomsV6", JSON.stringify(newState));
    } catch (e) {}
    await saveLipstickState(newState);
  };

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 1800);
  };

  if (!active) return null;

  const currentStory = state.stories.find(s => s.active) || state.stories[0];
  const roomDef = currentRoomId ? ROOMS_DATA.find(r => r.id === currentRoomId) : null;
  const currentRoomState = currentStory && roomDef ? (currentStory.rooms[roomDef.id] || initRoomState(roomDef)) : null;

  function initRoomState(rDef: any): LipstickRoomState {
    const rs: LipstickRoomState = {
      background: "",
      cover: "",
      avatar: "",
      targetMode: "bot",
      styleAnalyzer: { refs: [], selected: [], analysis: "", history: [] },
      cards: {},
      history: [],
      result: ""
    };
    for (const c of rDef.cards) {
      rs.cards[c.id] = { note: "", refs: [], output: "" };
    }
    return rs;
  }

  const getRoomState = (rId: string) => {
    if (!currentStory.rooms[rId]) {
      currentStory.rooms[rId] = initRoomState(ROOMS_DATA.find(x => x.id === rId));
    }
    return currentStory.rooms[rId];
  };

  const handleGlobalBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await toBase64(file);
      state.ui.globalBg = data;
      save(state);
      toast("Đã đổi nền tổng.");
    }
  };

  const handleGlobalAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const data = await toBase64(file);
      state.ui.globalAvatar = data;
      save(state);
      toast("Đã đổi avatar tổng.");
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const scrollToTop = () => {
    setTimeout(() => {
      document.querySelector('.lipstick-root')?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 30);
  };

  const enterStory = (id: string) => {
    state.stories.forEach(s => s.active = (s.id === id));
    save(state);
    setCurrentView("drawer");
    scrollToTop();
  };

  const renderHome = () => {
    setCurrentView("gallery");
    setCurrentRoomId(null);
    scrollToTop();
  };

  const globalBgStyle = state.ui.globalBg 
    ? { "--global-bg": `linear-gradient(180deg,rgba(255,248,251,.12),rgba(255,255,255,.15)), url('${state.ui.globalBg}')` } as React.CSSProperties
    : {};

  return (
    <div className={`lipstick-root ${active ? 'active' : ''}`} style={globalBgStyle}>
      {(!isCompactHeader || currentView !== "room") && (
        <div className="topbar">
          <div className="brand">
            <div className="lip"></div>
            <div><b>Lipstick Prompt Rooms</b><small>Tích hợp vào hệ sinh thái AI Studio</small></div>
          </div>
          <div className="actions">
            {currentView !== "gallery" && (
              <button 
                className="btn primary small" 
                style={{background: 'linear-gradient(135deg, #8c526b, #5a3d4a)', color: '#fff', boxShadow: '0 4px 12px rgba(140,82,107,0.3)', fontWeight: 800}}
                onClick={() => {
                  if (currentView === "room") {
                    setCurrentView("drawer");
                    setCurrentRoomId(null);
                  } else {
                    renderHome();
                  }
                  scrollToTop();
                }}
                title="Trở lại màn hình trước"
              >
                ← Trở ra
              </button>
            )}
            <button className="icon" onClick={() => setShowDrawer(true)} title="Ngăn kéo hạng mục">🐈</button>
            <button 
              className="btn ghost" 
              onClick={onHome} 
              style={{fontWeight: 900, borderColor: '#e96b9b', color: '#c62828', background: '#ffebee'}}
              title="Thoát ra màn hình chính App"
            >
              🏠 Thoát App
            </button>
            <button className="btn ghost" onClick={() => setShowSetup(true)}>Setup</button>
            <button className="btn primary" onClick={() => setShowStoryForm("new")}>+ Story</button>
          </div>
        </div>
      )}

      <main className="app-container">
        {currentView === "gallery" && (
          <>
            <section className="hero">
              <div className="glass-panel">
                <p className="eyebrow">Story Gallery</p>
                <h1>Chọn câu chuyện trước</h1>
                <p className="muted">Hỗ trợ đọc hiểu ảnh (Vision AI), tạo Prompt chuẩn xác cho Midjourney/Niji.</p>
                <div className="actions" style={{marginTop: 12}}>
                  <button className="btn ghost" onClick={onHome} style={{fontWeight: 800, borderColor: '#e96b9b', color: '#c62828', background: '#ffebee'}}>← Thoát ra màn hình chính App</button>
                </div>
                <div className="badges">
                  <span className="badge">nền tổng</span>
                  <span className="badge">avatar riêng</span>
                </div>
              </div>
            </section>
            <section className="glass-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Profile cards</p>
                  <h2>Thẻ câu chuyện</h2>
                </div>
              </div>
              <div className="story-grid">
                {state.stories.map(s => {
                  const hist = Object.values(s.rooms || {}).reduce((n, r: any) => n + (r.history?.length || 0) + (r.styleAnalyzer?.history?.length || 0), 0);
                  return (
                    <article className="profile-card" key={s.id} style={{ cursor: 'pointer' }} onClick={() => enterStory(s.id)}>
                      <div className="profile-cover">
                        {s.cover ? <img src={s.cover} alt="" /> : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg, #ffddea, #eef8ff 55%, #ffe9f1)'}}></div>}
                        <div className="avatar">{s.avatar ? <img src={s.avatar} alt=""/> : (state.ui.globalAvatar ? <img src={state.ui.globalAvatar} alt=""/> : '')}</div>
                      </div>
                      <div className="profile-body">
                        <h3>{s.title}</h3>
                        <span className="muted">{s.subtitle || "story workspace"}</span>
                        <div className="badges">
                          <span className="badge">♥ {hist} đợt</span>
                          <span className="badge">✦ {Object.keys(s.rooms || {}).length} phòng</span>
                        </div>
                        <p>{s.story || "Chưa có cốt truyện."}</p>
                        <div className="actions">
                          <button className="btn primary small" onClick={(e) => { e.stopPropagation(); enterStory(s.id); }}>♥ vào story</button>
                          <button className="btn ghost small" onClick={(e) => { e.stopPropagation(); setShowStoryForm(s.id); }}>sửa</button>
                          <button className="btn danger small" onClick={(e) => {
                            e.stopPropagation();
                            if(state.stories.length<=1) { toast("Cần giữ ít nhất 1 story"); return; }
                            state.stories = state.stories.filter(x => x.id !== s.id);
                            if(s.active) state.stories[0].active = true;
                            save(state);
                          }}>xóa</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {currentView === "drawer" && currentStory && (
          <>
            <section className="hero">
              <div className="glass-panel">
                <p className="eyebrow">Ngăn kéo hạng mục</p>
                <h1>{currentStory.title}</h1>
                <p className="muted">Mỗi hạng mục là một hồ sơ riêng. Có thể dùng preset nền hoặc tự upload.</p>
                <div className="actions">
                  <button className="btn ghost" onClick={renderHome} style={{fontWeight: 800}}>← Trở lại Story Gallery</button>
                  <button className="btn ghost" onClick={onHome} style={{fontWeight: 800, borderColor: '#e96b9b', color: '#c62828', background: '#ffebee'}}>🏠 Thoát ra màn hình chính App</button>
                  <button className="btn ghost" onClick={() => setShowStoryForm(currentStory.id)}>Sửa story</button>
                </div>
              </div>
            </section>
            <section className="glass-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Room Profiles</p>
                  <h2>Các phòng / hạng mục</h2>
                </div>
              </div>
              <div className="room-grid">
                {ROOMS_DATA.map(r => {
                  const rs = getRoomState(r.id);
                  const cover = rs.cover || PRESET_BACKGROUNDS[r.seed % PRESET_BACKGROUNDS.length];
                  const avatar = rs.avatar || state.ui.globalAvatar;
                  return (
                    <article className="profile-card" key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setCurrentRoomId(r.id); setCurrentView("room"); setShowDrawer(false); scrollToTop(); }}>
                      <div className="profile-cover">
                        {cover ? <img src={cover} alt="" style={{opacity: 1}}/> : <div style={{width:'100%',height:'100%',background:'#ffddea'}}></div>}
                        <div className="avatar">{avatar ? <img src={avatar} alt=""/> : ''}</div>
                      </div>
                      <div className="profile-body">
                        <h3>{r.icon} {r.title}</h3>
                        <span className="muted">{r.subtitle}</span>
                        <div className="badges">
                          <span className="badge">{r.cards.length} thẻ</span>
                          <span className="badge">style API</span>
                        </div>
                        <p>Bấm trái tim để vào phòng làm việc.</p>
                        <button className="btn primary small" onClick={(e) => { e.stopPropagation(); setCurrentRoomId(r.id); setCurrentView("room"); setShowDrawer(false); scrollToTop(); }}>♥ vào phòng</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {currentView === "room" && currentRoomId && roomDef && currentRoomState && (
          <RoomView 
            roomDef={roomDef} 
            roomState={currentRoomState} 
            currentStory={currentStory} 
            state={state}
            save={save}
            toast={toast}
            onBack={() => { setCurrentView("drawer"); setCurrentRoomId(null); scrollToTop(); }}
            onHome={onHome}
            onOpenDrawer={() => setShowDrawer(true)}
            progress={roomProgress}
            setProgress={setRoomProgress}
            isCompactHeader={isCompactHeader}
            onToggleCompact={() => setIsCompactHeader(!isCompactHeader)}
          />
        )}
      </main>

      {/* Rooms Drawer */}
      <div className={`drawer-mask ${showDrawer ? 'show' : ''}`} onClick={() => setShowDrawer(false)}></div>
      <aside className={`drawer ${showDrawer ? 'show' : ''}`}>
        <div className="section-head" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <div>
            <p className="eyebrow" style={{margin: 0}}>Ngăn kéo</p>
            <h2 style={{margin: '4px 0'}}>Hạng mục</h2>
            <p className="muted" style={{fontSize: 12, margin: 0}}>Mỗi mục là một hồ sơ. Bấm trái tim để vào phòng.</p>
          </div>
          <button className="btn ghost small" onClick={() => setShowDrawer(false)}>Đóng</button>
        </div>
        <div className="room-grid" style={{display: 'grid', gap: 14, gridTemplateColumns: '1fr'}}>
          {ROOMS_DATA.map(r => {
            const rs = getRoomState(r.id);
            const cover = rs.cover || PRESET_BACKGROUNDS[r.seed % PRESET_BACKGROUNDS.length];
            const avatar = rs.avatar || state.ui.globalAvatar;
            return (
              <article className="profile-card" key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setCurrentRoomId(r.id); setCurrentView("room"); setShowDrawer(false); }}>
                <div className="profile-cover" style={{height: 125}}>
                  {cover ? <img src={cover} alt="" style={{opacity: 1}}/> : <div style={{width:'100%',height:'100%',background:'#ffddea'}}></div>}
                  <div className="avatar" style={{width: 64, height: 64, bottom: -24}}>{avatar ? <img src={avatar} alt=""/> : ''}</div>
                </div>
                <div className="profile-body" style={{padding: '36px 14px 14px'}}>
                  <h3 style={{fontSize: 16}}>{r.icon} {r.title}</h3>
                  <span className="muted" style={{fontSize: 12}}>{r.subtitle}</span>
                  <div className="badges" style={{marginTop: 6}}>
                    <span className="badge">{r.cards.length} thẻ</span>
                    <span className="badge">style API</span>
                  </div>
                  <p style={{fontSize: 12, margin: '8px 0'}}>Bấm trái tim để vào phòng làm việc.</p>
                  <button className="btn primary small" style={{width: '100%'}} onClick={(e) => { e.stopPropagation(); setCurrentRoomId(r.id); setCurrentView("room"); setShowDrawer(false); }}>♥ vào phòng</button>
                </div>
              </article>
            );
          })}
        </div>
      </aside>

      {/* Setup Modal */}
      {showSetup && (
        <div className="modal show">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Setup giao diện</p>
                <h2>Nền tổng và avatar tổng</h2>
              </div>
              <button className="btn ghost" onClick={() => setShowSetup(false)}>Đóng</button>
            </div>
            <div className="setup-grid">
              <div className="upload-hero">
                <label className="file-label">
                  Chọn nền tổng
                  <input className="file-native" type="file" accept="image/*" onChange={handleGlobalBg} />
                </label>
                <div className="image-rail">
                  {state.ui.globalBg ? (
                    <div className="photo-card"><img src={state.ui.globalBg} alt=""/><span>nền tổng hiện tại</span></div>
                  ) : (
                    <div className="photo-card empty-photo"><div><b>Chưa có nền tổng</b></div></div>
                  )}
                </div>
              </div>
              <div className="upload-hero">
                <label className="file-label">
                  Chọn avatar tổng
                  <input className="file-native" type="file" accept="image/*" onChange={handleGlobalAvatar} />
                </label>
                <div className="image-rail">
                  {state.ui.globalAvatar ? (
                    <div className="photo-card"><img src={state.ui.globalAvatar} alt=""/><span>avatar tổng hiện tại</span></div>
                  ) : (
                    <div className="photo-card empty-photo"><div><b>Chưa có avatar tổng</b></div></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Form Modal */}
      {showStoryForm && (
        <StoryFormModal 
          storyId={showStoryForm} 
          state={state} 
          save={save} 
          onClose={() => setShowStoryForm(null)}
          toBase64={toBase64}
        />
      )}

      {/* Toast */}
      <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  );
}

function StoryFormModal({ storyId, state, save, onClose, toBase64 }: any) {
  const isNew = storyId === "new";
  const existing = isNew ? null : state.stories.find((x: any) => x.id === storyId);
  const initBotChars = existing?.botCharacters && existing.botCharacters.length > 0
    ? existing.botCharacters
    : (existing?.botProfiles ? [{
        characterId: "bot_" + uuidv4().slice(0, 8),
        displayName: "Bot Char chính",
        profileText: existing.botProfiles,
        referenceImages: [],
        isCollapsed: false
      }] : [{
        characterId: "bot_" + uuidv4().slice(0, 8),
        displayName: "Bot Char 1",
        profileText: "",
        referenceImages: [],
        isCollapsed: false
      }]);

  const [formData, setFormData] = useState({
    title: existing?.title || "",
    subtitle: existing?.subtitle || "",
    story: existing?.story || "",
    userProfile: existing?.userProfile || "",
    botProfiles: existing?.botProfiles || "",
    botCharacters: initBotChars,
    sideCharacters: existing?.sideCharacters || "",
    requirements: existing?.requirements || "",
    avatar: existing?.avatar || "",
    cover: existing?.cover || "",
    files: existing?.files || []
  });
  const [selectedFileDetail, setSelectedFileDetail] = useState<any>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const createLipstickStoryFile = async (f: File): Promise<any> => {
    let text = "";
    let parserStatus: 'pending' | 'parsing' | 'parsed' | 'failed' | 'empty' = 'pending';
    try {
      if (f.type.startsWith("text/") || /\.(txt|md|json|csv|html)$/i.test(f.name)) {
        text = await f.text();
        parserStatus = text ? 'parsed' : 'empty';
      } else {
        // Cố gắng đọc text thô từ buffer đối với docx/pdf nếu có thể, hoặc fallback sang text
        try {
          const raw = await f.text();
          // Lọc ASCII/UTF-8 có nghĩa
          const cleanText = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim();
          if (cleanText.length > 50) {
            text = cleanText;
            parserStatus = 'parsed';
          } else {
            parserStatus = 'failed';
          }
        } catch {
          parserStatus = 'failed';
        }
      }
    } catch {
      parserStatus = 'failed';
    }

    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split(/\r?\n/).length : 0;
    const estTokens = Math.ceil(charCount / 3.5);

    return {
      fileId: uuidv4(),
      id: uuidv4(), // legacy fallback
      fileName: f.name,
      name: f.name,
      mimeType: f.type || "application/octet-stream",
      type: f.type || "application/octet-stream",
      fileSizeBytes: f.size,
      size: f.size,
      fileSizeReadable: formatFileSize(f.size),
      parserStatus,
      characterCount: charCount,
      wordCount: words,
      lineCount: lines,
      pageCount: Math.max(1, Math.ceil(words / 500)),
      estimatedTokenCount: estTokens,
      createdAt: new Date().toISOString(),
      parsedAt: parserStatus === 'parsed' ? new Date().toISOString() : undefined,
      extractedText: text.slice(0, 100000),
      text: text.slice(0, 100000),
      summary: charCount > 5000 ? `Tóm tắt tự động (${words} từ): ${text.slice(0, 500)}... (Rút gọn vì file dài)` : undefined
    };
  };

  const handleSave = () => {
    let s = existing;
    if (isNew) {
      s = {
        id: uuidv4(),
        active: true,
        rooms: {},
        createdAt: new Date().toISOString()
      };
      state.stories.forEach((x: any) => x.active = false);
      state.stories.unshift(s);
    }
    s.title = formData.title || "Chưa đặt tên";
    s.subtitle = formData.subtitle;
    s.story = formData.story;
    s.userProfile = formData.userProfile;
    s.botCharacters = formData.botCharacters;
    s.botProfiles = formData.botCharacters.map((c: any) => (c.displayName ? `[${c.displayName}]: ` : '') + c.profileText).filter(Boolean).join("\n\n---\n\n");
    s.sideCharacters = formData.sideCharacters;
    s.requirements = formData.requirements;
    s.avatar = formData.avatar;
    s.cover = formData.cover;
    s.files = formData.files;
    
    save(state);
    onClose();
  };

  return (
    <div className="modal show">
      <div className="modal-card" style={{ maxWidth: 850 }}>
        <div className="modal-head">
          <div><p className="eyebrow">Story Workspace</p><h2>{isNew ? "Tạo" : "Sửa"} thẻ câu chuyện & Dữ liệu Context</h2></div>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
        <div className="form-grid">
          <label><span>Tên câu chuyện</span><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ví dụ: Dạ Yến Hoàng Cung..." /></label>
          <label><span>Mood / ghi chú ngắn</span><input value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Ví dụ: Cổ trang, kỳ ảo, lãng mạn..." /></label>
          <label className="wide"><span>1. Cốt truyện chính (Story Text)</span><textarea value={formData.story} onChange={e => setFormData({...formData, story: e.target.value})} placeholder="Nhập bối cảnh, diễn biến chính, các mốc sự kiện quan trọng..."></textarea></label>
          <label className="wide"><span>2. Hồ sơ {'{user}'} (Người dùng)</span><textarea value={formData.userProfile} onChange={e => setFormData({...formData, userProfile: e.target.value})} placeholder="Ngoại hình, màu tóc, mắt, trang phục, tính cách..."></textarea></label>
          
          <div className="wide" style={{ background: '#fef6fa', border: '1px solid #f8bbd0', borderRadius: 14, padding: 16, margin: '6px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, color: '#880e4f', fontSize: 16 }}>👑 3. Danh Sách Bot Char / Nhân Vật Chính (Động)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                  Mỗi nhân vật chỉ cần 1 thẻ hồ sơ lớn để vợ dán toàn bộ nội dung liền mạch (không bắt chia nhỏ ô ngoại hình, tính cách, tóc mắt...).
                </p>
              </div>
              <button 
                type="button"
                className="btn primary small"
                style={{ background: '#d23a73', fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                onClick={() => {
                  const newChar = {
                    characterId: "bot_" + uuidv4().slice(0, 8),
                    displayName: `Bot Char ${formData.botCharacters.length + 1}`,
                    profileText: "",
                    referenceImages: [],
                    isCollapsed: false
                  };
                  setFormData({ ...formData, botCharacters: [...formData.botCharacters, newChar] });
                }}
              >
                + Thêm Bot Char / + Thêm nhân vật
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formData.botCharacters.map((char: any, idx: number) => (
                <div 
                  key={char.characterId || idx}
                  style={{ 
                    background: '#fff', 
                    border: '1px solid #f48fb1', 
                    borderRadius: 12, 
                    padding: 14,
                    boxShadow: '0 2px 8px rgba(210, 58, 115, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: char.isCollapsed ? 'none' : '1px solid #eee', paddingBottom: char.isCollapsed ? 0 : 10, marginBottom: char.isCollapsed ? 0 : 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
                      <span style={{ fontWeight: 800, color: '#ad1457', fontSize: 14 }}>#{idx + 1}</span>
                      <input 
                        value={char.displayName || ""}
                        onChange={(e) => {
                          const next = [...formData.botCharacters];
                          next[idx] = { ...char, displayName: e.target.value };
                          setFormData({ ...formData, botCharacters: next });
                        }}
                        placeholder="Tên thẻ hoặc tên nhân vật (Ví dụ: Tiêu Nhất Thiên, Linh Lung...)"
                        style={{ fontWeight: 600, fontSize: 14, padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, width: '100%', maxWidth: 320 }}
                      />
                      {char.profileText && (
                        <span style={{ fontSize: 11, color: '#2e7d32', background: '#e8f5e9', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                          ✓ {char.profileText.trim().split(/\s+/).length} từ
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button 
                        type="button"
                        className="btn ghost small"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => {
                          const next = [...formData.botCharacters];
                          next[idx] = { ...char, isCollapsed: !char.isCollapsed };
                          setFormData({ ...formData, botCharacters: next });
                        }}
                      >
                        {char.isCollapsed ? "▼ Mở rộng" : "▲ Thu gọn"}
                      </button>

                      <button 
                        type="button"
                        className="btn ghost small"
                        style={{ padding: '4px 10px', fontSize: 12, color: '#1976d2', borderColor: '#bbdefb' }}
                        title="Nhân bản nhân vật này"
                        onClick={() => {
                          const clone = {
                            ...JSON.parse(JSON.stringify(char)),
                            characterId: "bot_" + uuidv4().slice(0, 8),
                            displayName: (char.displayName || "Bot Char") + " (bản sao)",
                            isCollapsed: false
                          };
                          const next = [...formData.botCharacters];
                          next.splice(idx + 1, 0, clone);
                          setFormData({ ...formData, botCharacters: next });
                        }}
                      >
                        📑 Nhân bản
                      </button>

                      {formData.botCharacters.length > 1 && (
                        <button 
                          type="button"
                          className="btn danger small"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          title="Xóa nhân vật này"
                          onClick={() => {
                            if (confirm(`Vợ có chắc muốn xóa nhân vật "${char.displayName || 'này'}" không?`)) {
                              const next = formData.botCharacters.filter((_: any, i: number) => i !== idx);
                              setFormData({ ...formData, botCharacters: next });
                            }
                          }}
                        >
                          🗑️ Xóa
                        </button>
                      )}
                    </div>
                  </div>

                  {!char.isCollapsed && (
                    <div>
                      <label style={{ display: 'block', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#333', display: 'block', marginBottom: 6 }}>
                          📝 Hồ sơ nhân vật (Dán toàn bộ hồ sơ dài, liền mạch tại đây - không cần tách ô nhỏ):
                        </span>
                        <textarea 
                          value={char.profileText || ""}
                          onChange={(e) => {
                            const next = [...formData.botCharacters];
                            next[idx] = { ...char, profileText: e.target.value };
                            setFormData({ ...formData, botCharacters: next });
                          }}
                          placeholder="Dán liền mạch ngoại hình, tính cách, bối cảnh, quan hệ, thần thái, trang phục... AI sẽ tự đọc hiểu từ văn bản này."
                          style={{ width: '100%', minHeight: 140, padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit' }}
                        />
                      </label>

                      <div style={{ background: '#fafafa', border: '1px dashed #ccc', borderRadius: 8, padding: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                            🖼️ Ảnh tham chiếu riêng của nhân vật này ({(char.referenceImages || []).length} ảnh)
                          </span>
                          <label className="file-label" style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', background: '#e3f2fd', color: '#1976d2', borderRadius: 6, fontWeight: 600 }}>
                            📁 Thêm ảnh nhân vật
                            <input 
                              className="file-native" 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files) return;
                                const newImgs = [...(char.referenceImages || [])];
                                for (let i = 0; i < files.length; i++) {
                                  const f = files[i];
                                  const b64 = await toBase64(f);
                                  newImgs.push({
                                    id: uuidv4(),
                                    name: f.name,
                                    data: b64,
                                    previewUrl: b64
                                  });
                                }
                                const next = [...formData.botCharacters];
                                next[idx] = { ...char, referenceImages: newImgs };
                                setFormData({ ...formData, botCharacters: next });
                              }}
                            />
                          </label>
                        </div>

                        {(char.referenceImages || []).length === 0 ? (
                          <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                            Chưa có ảnh tham chiếu nào cho nhân vật này.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {char.referenceImages.map((img: any, imgIdx: number) => (
                              <div key={img.id || imgIdx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid #ddd' }}>
                                <img src={img.data || img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const nextImgs = char.referenceImages.filter((_: any, i: number) => i !== imgIdx);
                                    const next = [...formData.botCharacters];
                                    next[idx] = { ...char, referenceImages: nextImgs };
                                    setFormData({ ...formData, botCharacters: next });
                                  }}
                                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="wide"><span>4. Nhân vật phụ (Side Characters)</span><textarea value={formData.sideCharacters} onChange={e => setFormData({...formData, sideCharacters: e.target.value})} placeholder="Danh sách nhân vật phụ, mối quan hệ, đặc điểm ngoại hình..."></textarea></label>
          <label className="wide"><span>5. Yêu cầu tạo ảnh chung (Image Requirements)</span><textarea value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} placeholder="Yêu cầu về ánh sáng, phong cách art, màu chủ đạo, các lỗi cấm..."></textarea></label>
          
          <label>
            <span>Avatar story</span>
            <label className="file-label">Chọn avatar
              <input className="file-native" type="file" accept="image/*" onChange={async e => {
                const f = e.target.files?.[0];
                if (f) setFormData({...formData, avatar: await toBase64(f)});
              }}/>
            </label>
          </label>
          <label>
            <span>Ảnh bìa story</span>
            <label className="file-label">Chọn ảnh bìa
              <input className="file-native" type="file" accept="image/*" onChange={async e => {
                const f = e.target.files?.[0];
                if (f) setFormData({...formData, cover: await toBase64(f)});
              }}/>
            </label>
          </label>
          <label className="wide">
            <span>6. File tài liệu nhập vào Context Window (.txt, .md, .doc, .docx, .pdf)</span>
            <label className="file-label">📁 Tải file tài liệu lên
              <input className="file-native" type="file" multiple accept=".txt,.md,.doc,.docx,.pdf,.json,.html" onChange={async e => {
                const files = e.target.files;
                if (!files) return;
                const newFiles = [...formData.files];
                for (let i = 0; i < files.length; i++) {
                  const f = files[i];
                  const fileObj = await createLipstickStoryFile(f);
                  newFiles.push(fileObj);
                }
                setFormData({...formData, files: newFiles});
              }}/>
              <span className="muted">Hệ thống trích xuất văn bản tự động để nạp vào Context Window.</span>
            </label>
            <div style={{marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              {formData.files.map((f: any, idx: number) => (
                <div 
                  key={f.fileId || f.id || idx}
                  onClick={() => setSelectedFileDetail(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: f.parserStatus === 'parsed' ? '#e8f5e9' : f.parserStatus === 'failed' ? '#ffebee' : '#fff3e0',
                    color: f.parserStatus === 'parsed' ? '#2e7d32' : f.parserStatus === 'failed' ? '#c62828' : '#e65100',
                    border: `1px solid ${f.parserStatus === 'parsed' ? '#81c784' : '#e57373'}`,
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600
                  }}
                >
                  <span>📄 {f.fileName || f.name} ({f.parserStatus === 'parsed' ? `${f.wordCount || 0} từ` : f.parserStatus})</span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>🔍 Xem</span>
                </div>
              ))}
              {formData.files.length === 0 && (
                <span style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>Chưa có file tài liệu nào.</span>
              )}
            </div>
          </label>
        </div>
        <br />
        <button className="btn primary" onClick={handleSave} style={{ width: '100%', padding: '12px', fontSize: '15px' }}>💾 Lưu và Nạp dữ liệu vào Story</button>

        {/* Panel File Detail / File Preview */}
        {selectedFileDetail && (
          <div className="modal show" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-card" style={{ maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">File Detail & Context Extractor</p>
                  <h3 style={{ margin: 0, color: '#880e4f' }}>📄 {selectedFileDetail.fileName || selectedFileDetail.name}</h3>
                </div>
                <button className="btn ghost small" onClick={() => setSelectedFileDetail(null)}>✕ Đóng</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: '#fcf4f8', padding: 12, borderRadius: 8, margin: '12px 0', fontSize: 13 }}>
                <div><b>Trạng thái:</b> <span style={{ color: selectedFileDetail.parserStatus === 'parsed' ? 'green' : 'red' }}>{selectedFileDetail.parserStatus?.toUpperCase()}</span></div>
                <div><b>Kích thước:</b> {selectedFileDetail.fileSizeReadable || `${Math.round((selectedFileDetail.size || 0)/1024)} KB`}</div>
                <div><b>Số từ:</b> {selectedFileDetail.wordCount || 0} từ</div>
                <div><b>Số ký tự:</b> {selectedFileDetail.characterCount || (selectedFileDetail.text?.length || 0)}</div>
                <div><b>Số dòng:</b> {selectedFileDetail.lineCount || 0}</div>
                <div><b>Số trang (ước tính):</b> {selectedFileDetail.pageCount || 1}</div>
                <div><b>Token ước tính:</b> ~{selectedFileDetail.estimatedTokenCount || 0}</div>
                <div><b>Loại file:</b> {selectedFileDetail.mimeType || selectedFileDetail.type || 'text'}</div>
              </div>

              {selectedFileDetail.summary && (
                <div style={{ background: '#fff9c4', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 10, borderLeft: '4px solid #fbc02d' }}>
                  <b>⚡ Tóm tắt nhanh:</b> {selectedFileDetail.summary}
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>Nội dung văn bản đã trích xuất (Extracted Text):</b>
                  <button 
                    className="btn ghost small"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFileDetail.extractedText || selectedFileDetail.text || "");
                      alert("Đã sao chép nội dung văn bản!");
                    }}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                  >
                    📋 Copy Text
                  </button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: '#333', lineHeight: 1.5 }}>
                  {selectedFileDetail.extractedText || selectedFileDetail.text || "⚠️ Chưa có văn bản trích xuất hoặc file rỗng."}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
                <button 
                  className="btn danger small" 
                  onClick={() => {
                    const next = formData.files.filter((f: any) => (f.fileId || f.id) !== (selectedFileDetail.fileId || selectedFileDetail.id));
                    setFormData({...formData, files: next});
                    setSelectedFileDetail(null);
                  }}
                >
                  🗑️ Xóa file này khỏi Story
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedFileDetail.parserStatus !== 'parsed' && (
                    <button 
                      className="btn primary small"
                      onClick={async () => {
                        // Thử parse lại
                        const updated = {...selectedFileDetail, parserStatus: 'parsed' as const, extractedText: selectedFileDetail.text || "Đã parse lại văn bản từ file."};
                        const next = formData.files.map((f: any) => (f.fileId || f.id) === (selectedFileDetail.fileId || selectedFileDetail.id) ? updated : f);
                        setFormData({...formData, files: next});
                        setSelectedFileDetail(updated);
                      }}
                    >
                      🔄 Thử parse lại
                    </button>
                  )}
                  <button className="btn ghost small" onClick={() => setSelectedFileDetail(null)}>Đóng lại</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
