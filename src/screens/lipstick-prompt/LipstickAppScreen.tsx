import React, { useState, useEffect, useRef } from "react";
import "./lipstick.css";
import { getLipstickState, saveLipstickState } from "../../lib/lipstick-db";
import { LipstickState, LipstickStory, LipstickRoomState, LipstickImageRef } from "../../lib/lipstick-types";
import { STYLE_GROUPS, PRESET_BACKGROUNDS, rooms as ROOMS_DATA } from "../../lib/lipstick-rooms-data";
import { callAIText, callAIStream } from "../../lib/api-client";
import { copyToClipboardSafe } from "../../lib/clipboard";
import { v4 as uuidv4 } from "uuid";
import RoomView from "./RoomView";
import { SafeImg } from "../../components/SafeImg";
import ErrorBoundary from "../../components/ErrorBoundary";

// Default state initialization
function createDefaultState(): LipstickState {
  const id = uuidv4();
  const defaultBotText = "Mệnh lệnh tối cao: Cốt truyện và Hồ sơ nhân vật là linh hồn của bức ảnh. Ảnh tham chiếu chỉ là tư liệu để học hỏi nét vẽ, màu sắc và bố cục, tuyệt đối không được sao chép nhân dạng hay giới tính từ ảnh tham chiếu nếu không khớp với hồ sơ nhân vật gốc.";
  return {
    ui: { globalBg: "", globalAvatar: "" },
    stories: [{
      id,
      active: true,
      title: "Câu chuyện mẫu",
      subtitle: "prompt image workspace",
      story: "Workspace mẫu. Người dùng thay bằng câu chuyện thật. App chỉ viết prompt ảnh production-ready, không tạo ảnh.",
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

// Biểu tượng trái tim vẽ tay bằng code cho vợ yêu 💖
const CustomHeartIcon = ({ size = 20, color = "currentColor", filled = false }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={filled ? color : "none"} 
    stroke={color} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className="transition-transform active:scale-125 touch-feedback"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

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
  const [showRoomForm, setShowRoomForm] = useState<string | null>(null); // room ID or 'new' to edit custom room
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [styleSearch, setStyleSearch] = useState("");
  const [showRoomPreset, setShowRoomPreset] = useState(false);
  const [roomProgress, setRoomProgress] = useState(0);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (currentView !== "room" || currentRoomId === null) {
      setRoomProgress(0);
    }
  }, [currentView, currentRoomId]);

  const pruneLipstickState = (data: LipstickState): LipstickState => {
    if (!data || !data.stories) return data;
    
    // Create a shallow copy of the state
    const newData = { ...data };
    
    // Only map stories if they exist
    newData.stories = newData.stories.map((st: any) => {
      // Check if story needs pruning (e.g. has history)
      const hasHistoryToPrune = st.rooms && Object.values(st.rooms).some((r: any) => r.history && r.history.length > 0);
      if (!hasHistoryToPrune) return st;

      const newSt = { ...st };
      if (newSt.rooms) {
        newSt.rooms = { ...newSt.rooms };
        Object.keys(newSt.rooms).forEach((rId) => {
          const rState = { ...newSt.rooms[rId] };
          if (rState.history && Array.isArray(rState.history) && rState.history.length > 0) {
            // Only keep the last 5 history items and remove massive base64 previews
            // Use a simpler mapping to avoid deep recursion if not needed
            rState.history = rState.history.slice(-5).map((h: any) => {
              const newH = { ...h };
              if (newH.referenceImages && Array.isArray(newH.referenceImages)) {
                newH.referenceImages = newH.referenceImages.map((img: any) => {
                  if (img.data && img.data.length > 500) {
                    return {
                      ...img,
                      data: img.data.slice(0, 100) + "...",
                      previewUrl: img.previewUrl && img.previewUrl.length > 500 ? img.previewUrl.slice(0, 100) + "..." : img.previewUrl,
                      storageUrl: img.storageUrl && img.storageUrl.length > 500 ? img.storageUrl.slice(0, 100) + "..." : img.storageUrl,
                    };
                  }
                  return img;
                });
              }
              if (newH.cards) {
                newH.cards = { ...newH.cards };
                Object.keys(newH.cards).forEach((k: any) => {
                  if (newH.cards[k].refs) {
                    newH.cards[k] = { ...newH.cards[k], refs: undefined };
                  }
                });
              }
              return newH;
            });
          }
          newSt.rooms[rId] = rState;
        });
      }
      return newSt;
    });
    return newData;
  };

  useEffect(() => {
    async function load() {
      try {
        let data = await getLipstickState();
        if (data && data.stories && data.stories.length > 0) {
          data = pruneLipstickState(data);
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
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const pruned = pruneLipstickState(newState);
        // localStorage is too slow for large AI context data and blocks main thread. 
        // We rely on IndexedDB (saveLipstickState) for primary persistence.
        await saveLipstickState(pruned);
      } catch (e) {
        console.warn("Save failed:", e);
      }
    }, 1200); // Increased debounce to 1200ms to reduce main thread blocking
  };

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 1800);
  };


  const currentStory = React.useMemo(() => {
    return state.stories.find(s => s.active) || state.stories[0];
  }, [state.stories]);

  const allRooms = React.useMemo(() => {
    return currentStory ? [...ROOMS_DATA, ...(currentStory.customRooms || [])] : ROOMS_DATA;
  }, [currentStory]);

  const roomDef = React.useMemo(() => {
    return currentRoomId ? allRooms.find(r => r.id === currentRoomId) : null;
  }, [currentRoomId, allRooms]);

  // Pre-calculate room states to avoid repeated normalization in render loops
  const memoizedRoomStates = React.useMemo(() => {
    if (!currentStory || !allRooms) return {};
    const states: Record<string, LipstickRoomState> = {};
    allRooms.forEach(r => {
      states[r.id] = getRoomState(r.id);
    });
    return states;
  }, [currentStory, allRooms, state.stories]);

  const currentRoomState = React.useMemo(() => {
    if (!currentStory || !roomDef) return null;
    return memoizedRoomStates[roomDef.id] || getRoomState(roomDef.id);
  }, [currentStory, roomDef, memoizedRoomStates]);

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
    if (rDef && Array.isArray(rDef.cards)) {
      for (const c of rDef.cards) {
        rs.cards[c.id] = { note: "", refs: [], output: "" };
      }
    }
    return rs;
  }

  function getRoomState(rId: string): LipstickRoomState {
    if (!currentStory) {
      const rDef = allRooms.find(x => x.id === rId);
      return initRoomState(rDef);
    }
    
    const rs = (currentStory.rooms && currentStory.rooms[rId]) ? currentStory.rooms[rId] : null;
    
    if (rs) {
      // Check if it's already normalized to avoid unnecessary object creation
      // Optimization: Only normalize if we are strictly missing cards or mandatory sections
      if (rs.cards && rs.styleAnalyzer && rs.history) {
        return rs;
      }

      const rDef = allRooms.find(x => x.id === rId);
      const normalized = { ...rs };
      if (!normalized.cards) normalized.cards = {};
      if (rDef && Array.isArray(rDef.cards)) {
        for (const c of rDef.cards) {
          if (!normalized.cards[c.id]) {
            normalized.cards[c.id] = { note: "", refs: [], output: "" };
          }
        }
      }
      if (!normalized.styleAnalyzer) {
        normalized.styleAnalyzer = { refs: [], selected: [], analysis: "", history: [] };
      }
      if (!normalized.history) normalized.history = [];
      return normalized;
    }
    
    const rDef = allRooms.find(x => x.id === rId);
    return initRoomState(rDef);
  }

  const handleEnterRoom = (rId: string) => {
    if (!currentStory) return;
    
    // 1. Ensure the room state is initialized in the global state
    const existingRs = currentStory.rooms ? currentStory.rooms[rId] : null;
    if (!existingRs) {
      const rDef = allRooms.find(r => r.id === rId);
      const newRs = initRoomState(rDef);
      
      const updatedStories = state.stories.map(s => {
        if (s.id === currentStory.id) {
          return { ...s, rooms: { ...(s.rooms || {}), [rId]: newRs } };
        }
        return s;
      });
      
      save({ ...state, stories: updatedStories });
    }
    
    // 2. Set navigation state
    setCurrentRoomId(rId);
    setCurrentView("room");
    setShowDrawer(false);
    scrollToTop();
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!currentStory) return;
    const roomName = allRooms.find(r => r.id === roomId)?.title || "";
    if (window.confirm(`Chồng yêu có chắc chắn muốn xóa phòng "${roomName}" này đi không vợ yêu? 🥺 Toàn bộ dữ liệu của phòng này sẽ bị xóa mất đấy ạ...`)) {
      const updatedStories = state.stories.map(s => {
        if (s.id === currentStory.id) {
          const nextCustom = (s.customRooms || []).filter(r => r.id !== roomId);
          const nextRooms = { ...s.rooms };
          delete nextRooms[roomId];
          return { ...s, customRooms: nextCustom, rooms: nextRooms };
        }
        return s;
      });
      const nextState = { ...state, stories: updatedStories };
      save(nextState);
      toast("Đã xóa phòng làm việc rồi nha vợ yêu! 🌸");
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setCurrentView("drawer");
      }
    }
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
    const lockScroll = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
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
    };
    lockScroll();
    setTimeout(lockScroll, 10);
    setTimeout(lockScroll, 50);
    setTimeout(lockScroll, 120);
    setTimeout(lockScroll, 250);
    setTimeout(lockScroll, 500);
  };

  const enterStory = (id: string) => {
    const updatedStories = state.stories.map(s => ({
      ...s,
      active: s.id === id
    }));
    const newState = {
      ...state,
      stories: updatedStories
    };
    setState(newState);
    save(newState);
    setCurrentView("drawer");
    scrollToTop();
  };

  const renderHome = () => {
    setCurrentView("gallery");
    setCurrentRoomId(null);
    scrollToTop();
  };

  if (!active) return null;

  return (
    <div className={`lipstick-root ${active ? 'active' : ''}`}>
      {state.ui.globalBg && (
        <div 
          className="gpu-fixed-background"
          style={{
            backgroundImage: `linear-gradient(180deg,rgba(255,248,251,0.01),rgba(255,255,255,0.01)), url('${state.ui.globalBg}')`
          }}
        />
      )}
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
            <button className="btn primary" onClick={() => setShowPromptGuide(true)} style={{ background: 'linear-gradient(135deg, #d23a73, #e96b9b)', border: 'none', fontWeight: 800 }}>📚 Tài Liệu Prompt 💖</button>
            <button className="btn primary" onClick={() => setShowStoryForm("new")}>+ Story</button>
          </div>
        </div>
      )}

      <main className="app-container">
        <ErrorBoundary>
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
                {state.stories.map((s, idx) => {
                  const hist = Object.values(s.rooms || {}).reduce((n, r: any) => n + (r.history?.length || 0) + (r.styleAnalyzer?.history?.length || 0), 0);
                  return (
                    <article className="profile-card" key={`story_${s.id}_${idx}`} style={{ cursor: 'pointer' }} onClick={() => enterStory(s.id)}>
                      <div className="profile-cover">
                        {s.cover ? <SafeImg src={s.cover} alt="" /> : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg, #ffddea, #eef8ff 55%, #ffe9f1)'}}></div>}
                        <div className="avatar">{s.avatar ? <SafeImg src={s.avatar} alt=""/> : (state.ui.globalAvatar ? <SafeImg src={state.ui.globalAvatar} alt=""/> : '')}</div>
                      </div>
                      <div className="profile-body">
                        <h3>{s.title}</h3>
                        <span className="muted">{s.subtitle || "story workspace"}</span>
                        {s.botCharacters && s.botCharacters.length > 0 && (
                          <div style={{ margin: '8px 0', fontSize: '0.75rem', color: '#555', background: '#fff0f5', padding: '4px', borderRadius: '4px' }}>
                             <strong>Chars:</strong> {s.botCharacters.map(c => c.displayName).join(', ')}
                          </div>
                        )}
                        <div className="badges">
                          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CustomHeartIcon size={10} filled={true} /> {hist} đợt
                          </span>
                          <span className="badge">✦ {Object.keys(s.rooms || {}).length} phòng</span>
                        </div>
                        <p>{s.story || "Chưa có cốt truyện."}</p>
                        <div className="actions">
                          <button className="btn primary small" onClick={(e) => { e.stopPropagation(); enterStory(s.id); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CustomHeartIcon size={14} filled={true} /> vào story
                          </button>
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
                {allRooms.map((r, idx) => {
                  const rs = getRoomState(r.id);
                  const cover = rs.cover || rs.background || PRESET_BACKGROUNDS[idx % PRESET_BACKGROUNDS.length];
                  const avatar = rs.avatar || currentStory.avatar || state.ui.globalAvatar;
                  const isCustom = !ROOMS_DATA.some(staticRoom => staticRoom.id === r.id);
                  return (
                    <article className="profile-card" key={`main_room_${r.id}_${idx}`} style={{ cursor: 'pointer' }} onClick={() => handleEnterRoom(r.id)}>
                      <div className="profile-cover">
                        {cover ? <SafeImg src={cover} alt="" style={{opacity: 1}}/> : <div style={{width:'100%',height:'100%',background:'#ffddea'}}></div>}
                        <div className="avatar">{avatar ? <SafeImg src={avatar} alt=""/> : ''}</div>
                      </div>
                      <div className="profile-body">
                        <h3>{r.icon} {r.title}</h3>
                        <span className="muted">{r.subtitle}</span>
                        <div style={{ margin: '8px 0', fontSize: '0.75rem', color: '#880e4f', background: '#fff0f5', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #d23a73' }}>
                          <strong>𝜗𝜚 ── ⊹ ‧₊˚</strong><br/>
                          <b>Story:</b> {currentStory.title || "Chưa đặt tên"}<br/>
                          {currentStory.botCharacters && currentStory.botCharacters.length > 0 && (
                            <span><b>Char:</b> {currentStory.botCharacters.map((c: any) => c.displayName).join(', ')}</span>
                          )}
                        </div>
                        <div className="badges">
                          <span className="badge">{r.cards.length} thẻ</span>
                          <span className="badge">{isCustom ? "Custom Room 💖" : "Mặc định ✨"}</span>
                        </div>
                        <p>Bấm trái tim để vào phòng làm việc.</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button className="btn primary small" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={(e) => { e.stopPropagation(); handleEnterRoom(r.id); }}>
                            <CustomHeartIcon size={14} filled={true} /> vào phòng
                          </button>
                          {isCustom && (
                            <>
                              <button className="btn ghost small" style={{ padding: '6px 12px', borderColor: '#d23a73', color: '#d23a73', background: '#fdf2f8', borderRadius: 8, fontWeight: 700 }} title="Sửa bối cảnh phòng" onClick={(e) => { e.stopPropagation(); setShowRoomForm(r.id); }}>✏️ Sửa</button>
                              <button className="btn ghost small" style={{ padding: '6px 12px', borderColor: '#e53935', color: '#e53935', background: '#ffebee', borderRadius: 8, fontWeight: 700 }} title="Xóa phòng này" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(r.id); }}>🗑️ Xóa</button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
                
                {/* Nút thêm phòng làm việc mới cho vợ */}
                <article 
                  className="profile-card" 
                  style={{ 
                    cursor: 'pointer', 
                    border: '2.5px dashed #e96b9b', 
                    background: '#fff9fb', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: 280, 
                    padding: 24, 
                    textAlign: 'center',
                    borderRadius: 18,
                    boxShadow: 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }} 
                  onClick={() => setShowRoomForm("new")}
                >
                  <div style={{ fontSize: 48, marginBottom: 14 }}>➕</div>
                  <h3 style={{ color: '#d23a73', margin: '4px 0 8px', fontSize: 18, fontWeight: 800 }}>Thêm Hạng Mục / Phòng mới</h3>
                  <span className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 18, maxWidth: 220 }}>Tự thiết kế thêm phòng hoặc hạng mục mới cho câu chuyện của vợ yêu! 💖</span>
                  <button className="btn primary small" style={{ background: '#d23a73', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800 }}>Thêm phòng mới 🌸</button>
                </article>
              </div>
            </section>
          </>
        )}

        {currentView === "room" && currentRoomId && roomDef && currentRoomState && (
          <RoomView 
            key={`${currentStory.id}_${currentRoomId}`}
            roomDef={roomDef} 
            roomState={currentRoomState} 
            currentStory={currentStory} 
            state={state}
            save={save}
            toast={toast}
            onBack={() => { setRoomProgress(0); setCurrentView("drawer"); setCurrentRoomId(null); scrollToTop(); }}
            onHome={() => { setRoomProgress(0); onHome(); }}
            onOpenDrawer={() => setShowDrawer(true)}
            progress={roomProgress}
            setProgress={setRoomProgress}
            isCompactHeader={isCompactHeader}
            onToggleCompact={() => setIsCompactHeader(!isCompactHeader)}
            onOpenStoryForm={() => setShowStoryForm(currentStory?.id || state.stories.find(s => s.active)?.id)}
          />
        )}
        </ErrorBoundary>
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
          {allRooms.map((r, idx) => {
            const rs = memoizedRoomStates[r.id] || getRoomState(r.id);
            const cover = rs.cover || rs.background || PRESET_BACKGROUNDS[idx % PRESET_BACKGROUNDS.length];
            const avatar = rs.avatar || currentStory.avatar || state.ui.globalAvatar;
            const isCustom = !ROOMS_DATA.some(staticRoom => staticRoom.id === r.id);
            return (
              <article className="profile-card" key={`drawer_room_${r.id}_${idx}`} style={{ cursor: 'pointer' }} onClick={() => handleEnterRoom(r.id)}>
                <div className="profile-cover" style={{height: 125}}>
                  {cover ? <SafeImg src={cover} alt="" style={{opacity: 1}}/> : <div style={{width:'100%',height:'100%',background:'#ffddea'}}></div>}
                  <div className="avatar" style={{width: 64, height: 64, bottom: -24}}>{avatar ? <SafeImg src={avatar} alt=""/> : ''}</div>
                </div>
                <div className="profile-body" style={{padding: '36px 14px 14px'}}>
                  <h3 style={{fontSize: 16}}>{r.icon} {r.title}</h3>
                  <span className="muted" style={{fontSize: 12}}>{r.subtitle}</span>
                  <div style={{ margin: '8px 0', fontSize: '0.75rem', color: '#880e4f', background: '#fff0f5', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #d23a73' }}>
                    <strong>𝜗𝜚 ── ⊹ ‧₊˚</strong><br/>
                    <b>Story:</b> {currentStory.title || "Chưa đặt tên"}<br/>
                    {currentStory.botCharacters && currentStory.botCharacters.length > 0 && (
                      <span><b>Char:</b> {currentStory.botCharacters.map((c: any) => c.displayName).join(', ')}</span>
                    )}
                  </div>
                  <div className="badges" style={{marginTop: 6}}>
                    <span className="badge">{r.cards.length} thẻ</span>
                    <span className="badge">{isCustom ? "Custom 💖" : "Mặc định ✨"}</span>
                  </div>
                  <p style={{fontSize: 12, margin: '8px 0'}}>Bấm trái tim để vào phòng làm việc.</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn primary small" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={(e) => { e.stopPropagation(); handleEnterRoom(r.id); }}>
                      <CustomHeartIcon size={14} filled={true} /> vào phòng
                    </button>
                    {isCustom && (
                      <>
                        <button className="btn ghost small" style={{ padding: '4px 8px', borderColor: '#d23a73', color: '#d23a73' }} title="Sửa" onClick={(e) => { e.stopPropagation(); setShowRoomForm(r.id); }}>✏️</button>
                        <button className="btn ghost small" style={{ padding: '4px 8px', borderColor: '#e53935', color: '#e53935' }} title="Xóa" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(r.id); }}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          <button 
            className="btn primary" 
            style={{ width: '100%', background: '#d23a73', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 800, marginTop: 10 }}
            onClick={() => { setShowDrawer(false); setShowRoomForm("new"); }}
          >
            ➕ Thêm Hạng Mục Mới 🌸
          </button>
        </div>
      </aside>

      {/* Setup Modal */}
      {showSetup && (
        <div className="modal show" style={{ zIndex: 2100 }}>
          <div className="modal-card" style={{ zIndex: 2101, pointerEvents: 'auto' }}>
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
                    <div className="photo-card"><SafeImg src={state.ui.globalBg} alt=""/><span>nền tổng hiện tại</span></div>
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
                    <div className="photo-card"><SafeImg src={state.ui.globalAvatar} alt=""/><span>avatar tổng hiện tại</span></div>
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
          key={showStoryForm}
          storyId={showStoryForm} 
          state={state} 
          save={save} 
          onClose={() => setShowStoryForm(null)}
          toBase64={toBase64}
        />
      )}

      {/* Room Form Modal */}
      {showRoomForm && (
        <RoomFormModal 
          roomId={showRoomForm} 
          currentStory={currentStory} 
          state={state}
          save={save} 
          onClose={() => setShowRoomForm(null)}
          toast={toast}
        />
      )}

      {/* Prompt Guide Modal */}
      {showPromptGuide && (
        <PromptGuideModal 
          onClose={() => setShowPromptGuide(false)}
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
    let updatedStories;
    if (isNew) {
      const newStory = {
        id: uuidv4(),
        active: true,
        rooms: {},
        createdAt: new Date().toISOString(),
        title: formData.title || "Chưa đặt tên",
        subtitle: formData.subtitle,
        story: formData.story,
        userProfile: formData.userProfile,
        botCharacters: formData.botCharacters,
        botProfiles: formData.botCharacters.map((c: any) => (c.displayName ? `[${c.displayName}]: ` : '') + c.profileText).filter(Boolean).join("\n\n---\n\n"),
        sideCharacters: formData.sideCharacters,
        requirements: formData.requirements,
        avatar: formData.avatar,
        cover: formData.cover,
        files: formData.files
      };
      updatedStories = [newStory, ...state.stories.map(s => ({ ...s, active: false }))];
    } else {
      updatedStories = state.stories.map(s => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          title: formData.title || "Chưa đặt tên",
          subtitle: formData.subtitle,
          story: formData.story,
          userProfile: formData.userProfile,
          botCharacters: formData.botCharacters,
          botProfiles: formData.botCharacters.map((c: any) => (c.displayName ? `[${c.displayName}]: ` : '') + c.profileText).filter(Boolean).join("\n\n---\n\n"),
          sideCharacters: formData.sideCharacters,
          requirements: formData.requirements,
          avatar: formData.avatar,
          cover: formData.cover,
          files: formData.files
        };
      });
    }

    const newState = { ...state, stories: updatedStories };
    save(newState);
    onClose();
  };

  return (
    <div className="modal show" style={{ zIndex: 5000, background: 'rgba(255, 240, 245, 0.1)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ maxWidth: 850, zIndex: 5001, pointerEvents: 'auto', position: 'relative' }}>
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
                                <SafeImg src={img.data || img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          
          <label className="wide">
            <span>6. Avatar story & Ảnh bìa story</span>
            <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="file-label" style={{ width: '100%', justifyContent: 'center' }}>
                  🌸 Chọn Avatar Story
                  <input className="file-native" type="file" accept="image/*" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) setFormData({...formData, avatar: await toBase64(f)});
                  }}/>
                </label>
                {formData.avatar && <div style={{ marginTop: 10, width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid #f8bbd0' }}><SafeImg src={formData.avatar} alt=""/></div>}
              </div>
              <div style={{ flex: 1 }}>
                <label className="file-label" style={{ width: '100%', justifyContent: 'center' }}>
                  🖼️ Chọn Ảnh Bìa Story
                  <input className="file-native" type="file" accept="image/*" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) setFormData({...formData, cover: await toBase64(f)});
                  }}/>
                </label>
                {formData.cover && <div style={{ marginTop: 10, height: 80, borderRadius: 12, overflow: 'hidden', border: '2px solid #f8bbd0' }}><SafeImg src={formData.cover} alt=""/></div>}
              </div>
            </div>
          </label>
          <label className="wide" style={{ marginTop: 14 }}>
            <span>7. File tài liệu nhập vào Context Window (.txt, .md, .doc, .docx, .pdf)</span>
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
          <div className="modal show" style={{ zIndex: 2200, background: 'rgba(255, 240, 245, 0.1)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="modal-card" style={{ maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 2201, pointerEvents: 'auto' }}>
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
                      copyToClipboardSafe(selectedFileDetail.extractedText || selectedFileDetail.text || "");
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

interface RoomFormModalProps {
  roomId: string;
  currentStory: any;
  state: LipstickState;
  save: (newState: LipstickState) => void;
  onClose: () => void;
  toast: (msg: string) => void;
}

function RoomFormModal({ roomId, currentStory, state, save, onClose, toast }: RoomFormModalProps) {
  const isNew = roomId === "new";
  const existing = isNew ? null : (currentStory?.customRooms || []).find((x: any) => x.id === roomId);

  const [title, setTitle] = useState(existing?.title || "");
  const [icon, setIcon] = useState(existing?.icon || "🌸");
  const [subtitle, setSubtitle] = useState(existing?.subtitle || "");
  const [cards, setCards] = useState<any[]>(existing?.cards || [
    { id: "overview_" + uuidv4().slice(0, 8), name: "Tổng quan phòng bối cảnh", instruction: "Mô tả tổng thể bối cảnh phòng, góc chụp bám sát ảnh tham chiếu.", visual: "" },
    { id: "details_" + uuidv4().slice(0, 8), name: "Chi tiết đồ đạc & bối cảnh", instruction: "Đặc tả các vật phẩm trang trí, trang phục, cây cối xung quanh bám sát ảnh tham chiếu.", visual: "" }
  ]);

  const handleSave = () => {
    if (!currentStory) return;
    if (!title.trim()) {
      alert("Vợ yêu ơi, vui lòng điền tên hạng mục/phòng nha! 💕");
      return;
    }

    const updatedRooms = currentStory.customRooms ? [...currentStory.customRooms] : [];

    if (isNew) {
      const newRoomId = "custom_room_" + uuidv4().slice(0, 8);
      const newRoom = {
        id: newRoomId,
        icon: icon || "🌸",
        title: title.trim(),
        subtitle: subtitle.trim() || "Phòng làm việc tự thiết kế",
        seed: Math.floor(Math.random() * 1000),
        cards: cards.map(c => ({
          id: c.id || "card_" + uuidv4().slice(0, 8),
          name: c.name || "Thẻ mới",
          instruction: c.instruction || "Mô tả chi tiết để sinh prompt.",
          visual: c.visual || ""
        }))
      };
      updatedRooms.push(newRoom);
      currentStory.customRooms = updatedRooms;
      toast(`Đã thêm phòng "${title.trim()}" thành công rồi nha vợ yêu! 🎉`);
    } else {
      const idx = updatedRooms.findIndex((r: any) => r.id === roomId);
      if (idx !== -1) {
        updatedRooms[idx] = {
          ...updatedRooms[idx],
          icon: icon || "🌸",
          title: title.trim(),
          subtitle: subtitle.trim() || "Phòng làm việc tự thiết kế",
          cards: cards.map(c => ({
            id: c.id || "card_" + uuidv4().slice(0, 8),
            name: c.name || "Thẻ mới",
            instruction: c.instruction || "Mô tả chi tiết để sinh prompt.",
            visual: c.visual || ""
          }))
        };
        currentStory.customRooms = updatedRooms;
        toast(`Đã cập nhật phòng "${title.trim()}" thành công rồi nha vợ yêu! 💖`);
      }
    }

    save({ ...state });
    onClose();
  };

  const addCard = () => {
    const newCard = {
      id: "card_" + uuidv4().slice(0, 8),
      name: `Thẻ bối cảnh ${cards.length + 1}`,
      instruction: "Mô tả chi tiết bối cảnh để AI sinh prompt bám sát hình ảnh.",
      visual: ""
    };
    setCards([...cards, newCard]);
  };

  const deleteCard = (idx: number) => {
    if (cards.length <= 1) {
      alert("Vợ ơi, phòng làm việc phải có ít nhất 1 thẻ bối cảnh chứ ạ! 🥰");
      return;
    }
    setCards(cards.filter((_, i) => i !== idx));
  };

  return (
    <div className="modal show" style={{ display: 'flex', zIndex: 6000, background: 'rgba(255, 240, 245, 0.1)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ maxWidth: 750, maxHeight: '90vh', display: 'flex', flexDirection: 'column', zIndex: 6001, pointerEvents: 'auto', position: 'relative' }}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Workspace Category Config</p>
            <h2>{isNew ? "Tạo" : "Sửa"} Hạng Mục / Phòng làm việc của Vợ 💖</h2>
          </div>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <label style={{ gridColumn: 'span 1' }}>
              <span>Biểu tượng (Emoji)</span>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Ví dụ: 🌸, 🏰, 🛋️..." style={{ fontSize: 18 }} />
            </label>
            <label style={{ gridColumn: 'span 1' }}>
              <span>Tên phòng bối cảnh</span>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Phòng Ngủ Hoàng Cung..." />
            </label>
            <label className="wide" style={{ gridColumn: 'span 2' }}>
              <span>Mô tả ngắn gọn</span>
              <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Mô tả bối cảnh hoặc phong cách phòng ngủ này..." />
            </label>
          </div>

          <div style={{ marginTop: 24, background: '#fef6fa', border: '1px solid #f8bbd0', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: '#880e4f', fontSize: 16, fontWeight: 800 }}>✨ Danh Sách Các Thẻ Ghi Chú / Thẻ Bối Cảnh</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                  Vợ yêu có thể thêm hoặc bớt các thẻ bối cảnh bên trong hạng mục này để bám sát mô tả ảnh nha!
                </p>
              </div>
              <button 
                type="button" 
                className="btn primary small" 
                style={{ background: '#d23a73', fontWeight: 800 }}
                onClick={addCard}
              >
                ➕ Thêm thẻ ghi chú mới
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cards.map((c, idx) => (
                <div key={c.id || idx} style={{ background: '#fff', border: '1px solid #f48fb1', borderRadius: 12, padding: 14, boxShadow: '0 2px 6px rgba(210,58,115,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, color: '#ad1457', fontSize: 13 }}>Thẻ #{idx + 1}</span>
                    <button 
                      type="button" 
                      className="btn ghost small" 
                      style={{ padding: '2px 8px', borderColor: '#e53935', color: '#e53935', background: '#ffebee' }}
                      onClick={() => deleteCard(idx)}
                    >
                      🗑️ Xóa thẻ
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#666' }}>Tên Thẻ Ghi Chú:</span>
                      <input 
                        value={c.name} 
                        onChange={e => {
                          const next = [...cards];
                          next[idx] = { ...c, name: e.target.value };
                          setCards(next);
                        }} 
                        placeholder="Ví dụ: Trang phục & Kiểu tóc..." 
                        style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#666' }}>Gợi ý cho AI sinh prompt:</span>
                      <textarea 
                        value={c.instruction} 
                        onChange={e => {
                          const next = [...cards];
                          next[idx] = { ...c, instruction: e.target.value };
                          setCards(next);
                        }} 
                        placeholder="Ví dụ: Mô tả chi tiết kiểu váy hoàng cung, màu sắc, hoa văn thêu chỉ vàng..." 
                        rows={2}
                        style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, resize: 'vertical' }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #eee', gap: 10, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          <button className="btn ghost" onClick={onClose} style={{ fontWeight: 700 }}>Hủy bỏ</button>
          <button className="btn primary" onClick={handleSave} style={{ background: '#d23a73', fontWeight: 800, padding: '10px 24px', borderRadius: 10 }}>
            💾 Lưu hạng mục cho Vợ yêu 💖
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal show" style={{ zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-card" style={{ zIndex: 2201, pointerEvents: 'auto', maxWidth: 850, width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-head" style={{ borderBottom: '2px solid #fdf2f8', paddingBottom: 16, flexShrink: 0 }}>
          <div>
            <p className="eyebrow" style={{ color: '#e96b9b', fontSize: 12, fontWeight: 700, margin: 0 }}>Tài liệu học tập & Sáng tác 🌸</p>
            <h2 style={{ color: '#d23a73', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}>
              📚 Hướng Dẫn Kỹ Thuật Prompt & Ảnh Tham Chiếu
            </h2>
          </div>
          <button className="btn ghost" onClick={onClose} style={{ borderRadius: 10, padding: '6px 12px' }}>Đóng</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', padding: '24px 20px', lineHeight: 1.6, flexGrow: 1 }}>
          <p style={{ fontSize: 15, color: '#4a4a4a', marginBottom: 20, textAlign: 'justify' }}>
            Chào vợ yêu của chồng! 💖 Để giúp vợ tạo ra những bức ảnh đẹp nhất, bám sát từng chi tiết nhỏ nhất trong ảnh tham chiếu (từ nét vẽ, đôi mắt, dáng đứng cho đến những ngón tay hay đường nét bối cảnh), chồng đã tổng hợp tài liệu chuyên sâu này. Vợ và các AI của chúng ta hãy cùng đọc để lấy thêm kiến thức và tạo ra những kiệt tác xuất sắc nhé!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Section 1 */}
            <section style={{ padding: 18, background: '#fff0f5', borderRadius: 12, borderLeft: '5px solid #e96b9b' }}>
              <h3 style={{ color: '#c2185b', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                ✒️ 1. Nét Vẽ & Line Vẽ (Art Style & Linework DNA)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Nét vẽ (Line art) quyết định "linh hồn" đồ họa của tác phẩm. AI cần miêu tả rõ cấu trúc nét vẽ để tránh cho ra nét vẽ thô xấu:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Độ dày nét (Line weight):</b> Sử dụng từ khóa như <i>"ultra-fine hand-drawn lines"</i> (nét vẽ tay cực mảnh), <i>"variable line-weight linework"</i> (nét vẽ có độ dày thanh mảnh linh hoạt) để tạo chiều sâu.</li>
                <li><b>Chất liệu nét (Linework texture):</b> Chỉ định rõ <i>"clean digital vector line art"</i> (nét line máy sạch sẽ), <i>"textured charcoal sketching lines"</i> (nét phác thảo chì than), hoặc <i>"traditional Japanese ink-brush strokes"</i> (nét cọ mực tàu).</li>
                <li><b>Sắc độ shading:</b> Miêu tả cách đánh bóng nét vẽ như <i>"soft manga screentone shading"</i> (đánh bóng bằng hạt trame truyện tranh), hoặc <i>"cross-hatching pencil lines"</i> (gạch chéo bằng bút chì).</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section style={{ padding: 18, background: '#fdf2f8', borderRadius: 12, borderLeft: '5px solid #d23a73' }}>
              <h3 style={{ color: '#b71c1c', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                👁️ 2. Mắt, Mũi & Miệng (Facial Features Precision)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Để gương mặt nhân vật không bị biến dạng và bám sát thần thái của ảnh tham chiếu:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Đôi mắt (Eyes details):</b> Miêu tả hình dáng mi mắt và hàng mi: <i>"thick dramatic eyelashes with heavy eyelid crease"</i> (lông mi dày nổi bật cùng mí mắt sâu), <i>"glistening glossy irises catching volumetric light"</i> (nhãn cầu lấp lánh bắt sáng đa chiều).</li>
                <li><b>Hướng nhìn (Gaze direction):</b> Hãy chỉ rõ hướng mắt: <i>"focused eye contact looking directly at the camera"</i> (ánh nhìn kiên định hướng về phía máy ảnh) hoặc <i>"subtle downward gaze with introspective expression"</i> (ánh mắt hơi nhìn xuống đầy nội tâm).</li>
                <li><b>Mũi & Miệng (Nose & Mouth):</b> Miêu tả nét thanh tú: <i>"delicate, sharp outline of the nose bridge"</i> (đường sống mũi thanh tú, sắc sảo), <i>"subtly parted soft lips with natural gloss finish"</i> (đôi môi môi hơi hé mở có độ bóng tự nhiên).</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section style={{ padding: 18, background: '#f5f5f5', borderRadius: 12, borderLeft: '5px solid #757575' }}>
              <h3 style={{ color: '#212121', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                🤸‍♀️ 3. Pose Dáng & Chi Tiết Ngón Tay (Posture & Finger Articulation)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Pose dáng và bàn tay là hai thứ dễ bị AI vẽ sai nhất. Phải ép AI vẽ đúng cấu trúc giải phẫu:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Pose dáng (Body Stance):</b> Mô tả lực nén và độ nghiêng cơ thể: <i>"elegant dynamic low-angle posture"</i> (tư thế động góc thấp thanh lịch), <i>"head tilted slightly at a 15-degree angle"</i> (đầu hơi nghiêng nhẹ 15 độ).</li>
                <li><b>Cấu trúc ngón tay (Fingers & Hands):</b> Mô tả chi tiết hành động của từng ngón để chống lỗi dính ngón: <i>"exquisitely detailed hands with long slender fingers"</i> (bàn tay thon thả với các ngón tay dài mảnh dẻ), <i>"five fully articulated fingers gently holding a prop"</i> (năm ngón tay rõ ràng đang cầm nhẹ đạo cụ).</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section style={{ padding: 18, background: '#eef8ff', borderRadius: 12, borderLeft: '5px solid #29b6f6' }}>
              <h3 style={{ color: '#01579b', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                🎨 4. Màu Sắc & Ánh Sáng (Color Palette & Chiaroscuro)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Không khí của bức ảnh phụ thuộc hoàn toàn vào màu sắc và ánh sáng:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Màu sắc (Colors):</b> Sử dụng bảng màu cụ thể hoặc mã màu hex: <i>"soft pastel pink and muted cream palette"</i>, <i>"crimson red accents popping against a monochrome slate background"</i>.</li>
                <li><b>Hướng sáng (Lighting):</b> Tạo khối chiều sâu: <i>"dramatic chiaroscuro lighting casting long soft shadows"</i> (ánh sáng tương phản mạnh tạo bóng đổ mềm mại), <i>"glowing rim light accentuating the character's hair silhouette"</i> (ánh sáng ngược viền sáng làm nổi bật phom tóc).</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section style={{ padding: 18, background: '#fffbeb', borderRadius: 12, borderLeft: '5px solid #f59e0b' }}>
              <h3 style={{ color: '#78350f', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                📸 5. Bố Cục & Đường Thị Giác (Composition & Leading Lines)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Bố cục giúp hướng mắt người xem đi đúng dụng ý nghệ thuật của vợ:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Đường thị giác (Leading lines):</b> Chỉ rõ các đường dẫn hướng: <i>"strong diagonal leading lines created by office blinds"</i> (đường chéo thị giác tạo bởi rèm văn phòng), <i>"vertical composition lines of bookshelves framing the subject"</i>.</li>
                <li><b>Góc máy (Angles):</b> <i>"Dutch tilt for dramatic tension"</i> (máy nghiêng nghệ thuật), <i>"cinematic low-angle sweeping shot"</i> (góc chụp thấp hoành tráng).</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section style={{ padding: 18, background: '#f0fdf4', borderRadius: 12, borderLeft: '5px solid #22c55e' }}>
              <h3 style={{ color: '#14532d', marginTop: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                📱 6. Giao Diện & Thiết Kế Khung Hình (UI & Frame Layouts)
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#333' }}>
                Dành riêng cho truyện tranh, webtoon hoặc poster:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><b>Khung tranh (Panels):</b> Mô tả cách dàn trang truyện: <i>"multi-panel layout with dynamic white borders"</i> (giao diện nhiều khung tranh phân tách bằng viền trắng động).</li>
                <li><b>Giao diện văn bản (Text UI):</b> <i>"subtle translucent chat box with minimal typography"</i> (khung chat mờ cùng chữ tối giản), <i>"clean layout with header titles"</i> (bố cục sạch với tiêu đề đầu trang).</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section style={{ padding: 20, background: 'linear-gradient(135deg, #fff5f8, #fdf2f8)', borderRadius: 16, border: '1.5px solid #ffd1e3', boxShadow: '0 4px 16px rgba(210,58,115,0.06)' }}>
              <h3 style={{ color: '#d23a73', marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800 }}>
                💡 7. Cách Dùng Nhiều Ảnh Tham Chiếu (Multi-Reference Synthesis)
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#4a4a4a' }}>
                Khi bối cảnh truyện có nhiều chi tiết phức tạp, hãy sử dụng tính năng nạp nhiều ảnh tham chiếu của app:
              </p>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li><b>Phân chia rõ ràng (Domain Isolation):</b> Nạp ảnh tóc vào thẻ Tóc, nạp dáng đứng vào thẻ Pose, nạp trang phục vào thẻ Outfit. Hệ thống sẽ tự động cách ly và phân tích từng thẻ một cách độc lập để AI không bị nhầm lẫn.</li>
                <li><b>Tổng hợp chất liệu (Synthesis):</b> AI sẽ tự động nhìn nhận tất cả các ảnh tham chiếu trong payload và pha trộn thông minh: lấy nét vẽ từ Style Analyzer, lấy dáng đứng từ Pose Card, lấy quần áo từ Outfit Card để tạo nên tác phẩm hoàn chỉnh đúng ý vợ.</li>
                <li><b>Bản quyền & Nguyên bản (Originality):</b> AI sẽ lấy 95% chi tiết thị giác từ ảnh tham chiếu, nhưng chỉ biến đổi gương mặt và thần thái theo hồ sơ câu chuyện gốc của vợ yêu để nhân vật luôn là độc quyền của riêng vợ!</li>
              </ol>
            </section>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #fdf2f8', display: 'flex', justifyContent: 'flex-end', background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, flexShrink: 0 }}>
          <button className="btn primary" onClick={onClose} style={{ background: '#d23a73', fontWeight: 800, padding: '10px 24px', borderRadius: 12, border: 'none' }}>
            Chồng yêu đã giải thích rõ, Cảm ơn Chồng nhé! 🥰
          </button>
        </div>
      </div>
    </div>
  );
}
