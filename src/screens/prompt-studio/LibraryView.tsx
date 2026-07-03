import React, { useState } from "react";
import { Story, CharProfile } from "../../lib/prompt-context-db";

type Props = {
  stories: Story[];
  activeStory: Story;
  time: string;
  battery: number;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateStory: (s: Story) => void;
  onWallpaperChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenStudio: () => void;
};

export default function LibraryView({
  stories, activeStory, time, battery, onSelect, onCreate, onDuplicate, onDelete, onUpdateStory, onWallpaperChange, onOpenStudio
}: Props) {
  
  const handleDetailChange = (field: keyof Story["detail"], val: string) => {
    onUpdateStory({
      ...activeStory,
      detail: { ...activeStory.detail, [field]: val }
    });
  };

  const handleUserChange = (field: keyof Story["userProfileSingle"], val: string) => {
    onUpdateStory({
      ...activeStory,
      userProfileSingle: { ...activeStory.userProfileSingle, [field]: val }
    });
  };

  const handleAddChar = () => {
    const chars = activeStory.characters || [];
    const newChar: CharProfile = {
      id: "botchar_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      profileGroup: "bot_char",
      name: "",
      role: "Bot char chính",
      identity: "",
      status: "",
      appearance: "",
      personality: "",
      relationship: "",
      voiceDNA: "",
      canon: "",
      avatar: ""
    };
    onUpdateStory({ ...activeStory, characters: [...chars, newChar] });
  };

  const handleUpdateChar = (id: string, field: keyof CharProfile, val: string) => {
    const chars = activeStory.characters || [];
    onUpdateStory({
      ...activeStory,
      characters: chars.map(c => c.id === id ? { ...c, [field]: val } : c)
    });
  };

  const handleDeleteChar = (id: string) => {
    const chars = activeStory.characters || [];
    onUpdateStory({
      ...activeStory,
      characters: chars.filter(c => c.id !== id)
    });
  };

  const readFile = (f: File): Promise<string> => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(f);
  });

  const handleImageChange = async (field: "cover" | "background" | "avatar", e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await readFile(f);
    onUpdateStory({ ...activeStory, [field]: b64 });
  };

  return (
    <section className="screen active" id="libraryScreen">
      <div className="grid">
        <aside className="card side">
          <div className="status"><span>{time}</span><span className="battery"><i style={{width: `${battery}%`}}></i></span></div>
          <div className="brand">
            <span className="eyebrow">Story Library</span>
            <h1>Kho câu chuyện</h1>
            <p>Mỗi câu chuyện là một kho riêng: Context, file, phòng, đợt API và lịch sử không trộn lẫn với truyện khác.</p>
          </div>
          <div className="sideBtns">
            <button className="btn pink" onClick={onCreate}>Tạo câu chuyện mới</button>
            <label className="btn ghost"><input type="file" accept="image/*" onChange={onWallpaperChange} />Chọn hình nền</label>
          </div>
          <div className="storyList">
            {stories.map((s, i) => (
              <button key={s.id} className={`storyCard ${s.id === activeStory.id ? 'active' : ''}`} onClick={() => onSelect(s.id)}>
                <span className="storyCover" style={s.cover ? { backgroundImage: `url(${s.cover})` } : {}}>
                  {!s.cover && String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{s.title || "Chưa đặt tên"}</b>
                  <span>{s.genre || "Chưa có thể loại"} · {s.context.files?.length || 0} file · {s.characters?.length || 0} Bot Char</span>
                </span>
                <i className="storyHeart">{s.id === activeStory.id ? '♥' : '♡'}</i>
              </button>
            ))}
          </div>
        </aside>

        <section className="card">
          <header className="head">
            <div><span className="eyebrow">Selected story controls</span><h2>Trang trưng bày truyện</h2></div>
            <div className="headBtns">
              <button className="btn soft" onClick={onDuplicate}>Nhân bản truyện</button>
              <button className="btn warn" onClick={onDelete}>Xóa truyện đang chọn</button>
              <button className="btn blue" onClick={onOpenStudio}>Mở Prompt Studio</button>
            </div>
          </header>
          <div className="mainScroll">
            <article className="notice">
              <h3>{activeStory.title || "Chưa đặt tên"}</h3>
              <p>{activeStory.summary || "Đây là kho riêng của câu chuyện đang chọn."}</p>
            </article>

            <section className="workspaceGrid">
              <div className="field"><label>Tên câu chuyện</label><input value={activeStory.title} onChange={e => onUpdateStory({...activeStory, title: e.target.value})} placeholder="Tên truyện / dự án" /></div>
              <div className="field"><label>Thể loại / vibe</label><input value={activeStory.genre} onChange={e => onUpdateStory({...activeStory, genre: e.target.value})} placeholder="GL, BL, fantasy, học đường, dark romance..." /></div>
              <div className="field big"><label>Mô tả ngắn cho trang trưng bày</label><textarea value={activeStory.summary} onChange={e => onUpdateStory({...activeStory, summary: e.target.value})} placeholder="Mô tả ngắn để nhận diện câu chuyện này trong kho."></textarea></div>
            </section>

            <section className="storySetup">
              <div className="setupBlock">
                <div className="setupBlockHead">
                  <div>
                    <small className="eyebrow">Visual Identity</small>
                    <b>Ảnh bìa · ảnh nền · avatar truyện</b>
                    <span>Phần này giúp mỗi câu chuyện có nhận diện riêng để không bị nhầm với truyện khác.</span>
                  </div>
                </div>
                <div className="setupBody">
                  <div className="mediaGrid">
                    <label className={`mediaPicker ${activeStory.cover ? 'hasImage' : ''}`}>
                      <input type="file" accept="image/*" onChange={e => handleImageChange("cover", e)} />
                      {activeStory.cover && <img className="mediaPreview" src={activeStory.cover} alt="" />}
                      <span className="mediaPickText"><b>Chọn ảnh bìa</b><span>Dùng cho thẻ truyện.</span></span>
                    </label>
                    <label className={`mediaPicker ${activeStory.background ? 'hasImage' : ''}`}>
                      <input type="file" accept="image/*" onChange={e => handleImageChange("background", e)} />
                      {activeStory.background && <img className="mediaPreview" src={activeStory.background} alt="" />}
                      <span className="mediaPickText"><b>Chọn ảnh nền</b><span>Nền tự đổi theo truyện.</span></span>
                    </label>
                    <label className={`mediaPicker ${activeStory.avatar ? 'hasImage' : ''}`}>
                      <input type="file" accept="image/*" onChange={e => handleImageChange("avatar", e)} />
                      {activeStory.avatar && <img className="mediaPreview" src={activeStory.avatar} alt="" />}
                      <span className="mediaPickText"><b>Chọn avatar</b><span>Trang trí nhận diện.</span></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="setupBlock">
                <div className="setupBlockHead">
                  <div>
                    <small className="eyebrow">Story Intake · Tổng hợp 1 thẻ</small>
                    <b>Toàn bộ thông tin chi tiết & Bối cảnh câu chuyện</b>
                    <span>Vợ chỉ cần điền gộp toàn bộ vào 1 ô lớn bên dưới (không bị ẩn, hiển thị đầy đủ, không phải lắt nhắt từng ô nhỏ).</span>
                  </div>
                </div>
                <div className="setupBody" style={{ display: 'block' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className="field">
                      <label>Tên khác & Trạng thái</label>
                      <input 
                        value={activeStory.detail.storyAltTitle || ""}
                        onChange={e => {
                          const val = e.target.value;
                          handleDetailChange("storyAltTitle", val);
                          handleDetailChange("storyStatus", val);
                        }}
                        placeholder="Tên khác / Trạng thái truyện..." 
                      />
                    </div>
                    <div className="field">
                      <label>Thể loại & Route</label>
                      <input 
                        value={activeStory.detail.storySubGenre || ""}
                        onChange={e => {
                          const val = e.target.value;
                          handleDetailChange("storySubGenre", val);
                          handleDetailChange("storyRoute", val);
                        }}
                        placeholder="GL, BL, Ngôn tình, Route A..." 
                      />
                    </div>
                  </div>
                  <div className="field big" style={{ height: '380px' }}>
                    <label>Nội dung cốt truyện · Bối cảnh thế giới · Timeline · Canon · Mục tiêu · Yêu cầu bắt buộc</label>
                    <textarea 
                      value={activeStory.detail.storyWorld} 
                      onChange={e => {
                        const val = e.target.value;
                        handleDetailChange("storyWorld", val);
                        handleDetailChange("storyLogline", val);
                        handleDetailChange("storyTimeline", val);
                        handleDetailChange("storyCanonDeep", val);
                        handleDetailChange("storyGoal", val);
                        handleDetailChange("storyMustHave", val);
                      }}
                      placeholder="Vợ hãy nhập toàn bộ câu chuyện, bối cảnh, timeline, canon quan trọng và yêu cầu vào 1 ô lớn này cho tiện nhé..."
                      style={{ height: '100%', minHeight: '320px', fontSize: '14px', lineHeight: '1.6' }}
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="setupBlock">
                <div className="setupBlockHead">
                  <div>
                    <small className="eyebrow">User Profile · Tổng hợp 1 thẻ</small>
                    <b>Hồ sơ {"{{user}}"} duy nhất (Gộp chung mọi thông tin)</b>
                  </div>
                </div>
                <div className="setupBody profileSplitGrid" style={{ display: 'block' }}>
                  <div className="userOnlyCard" style={{ width: '100%' }}>
                    <div className="userOnlyHead">
                      <span><small>Single User Profile</small><b>Hồ sơ {"{{user}}"} duy nhất · Điền gộp vào 1 thẻ</b></span>
                      <span className="userLockBadge">ONLY ONE</span>
                    </div>
                    <div className="userOnlyBody" style={{ display: 'block' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div className="field">
                          <label>Tên {"{{user}}"}</label>
                          <input 
                            value={activeStory.userProfileSingle.name || ""}
                            onChange={e => handleUserChange("name", e.target.value)} 
                            placeholder="Tên {{user}}..."
                          />
                        </div>
                        <div className="field">
                          <label>Quan hệ với Bot Char</label>
                          <input 
                            value={activeStory.userProfileSingle.relation || ""}
                            onChange={e => handleUserChange("relation", e.target.value)} 
                            placeholder="Người yêu, đối thủ, bạn thân..."
                          />
                        </div>
                      </div>
                      <div className="field big" style={{ height: '260px' }}>
                        <label>Toàn bộ thông tin công khai · bí mật · agency boundary · phong cách vai của {"{{user}}"}</label>
                        <textarea 
                          value={activeStory.userProfileSingle.publicInfo} 
                          onChange={e => {
                            const val = e.target.value;
                            handleUserChange("publicInfo", val);
                            handleUserChange("privateInfo", val);
                            handleUserChange("agency", val);
                            handleUserChange("style", val);
                          }}
                          placeholder="Điền tất cả thông tin hồ sơ, tính cách, bí mật và phong cách của {{user}} vào đây..."
                          style={{ height: '100%', minHeight: '200px', fontSize: '14px', lineHeight: '1.6' }}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="botProfileHint" style={{ marginTop: '12px' }}>
                    <b>Nguyên tắc quan trọng:</b><br/>
                    Hồ sơ {"{{user}}"} đã được gộp chung vào 1 ô lớn bên trên để vợ điền một lần là xong.<br/>
                    Hồ sơ Bot Char bên dưới cũng được gộp thành 1 thẻ lớn cho mỗi nhân vật.
                  </div>
                </div>
              </div>

              <div className="setupBlock">
                <div className="setupBlockHead">
                  <div>
                    <small className="eyebrow">Bot Char Cards · Tổng hợp 1 thẻ</small>
                    <b>Hồ sơ Bot Char của câu chuyện</b>
                  </div>
                </div>
                <div className="setupBody characterBuilder">
                  <div className="characterToolbar">
                    <button className="btn pink" onClick={handleAddChar}>+ Thêm Bot Char</button>
                  </div>
                  <div className="characterCards">
                    {(!activeStory.characters || activeStory.characters.length === 0) && (
                      <div className="storyRequiredNote">Chưa có thẻ nhân vật. Bấm "+ Thêm Bot Char".</div>
                    )}
                    {activeStory.characters?.map((c, i) => (
                      <div key={c.id} className="characterCard">
                        <div className="characterCardHead">
                          <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                            <span className="charMiniAvatar">
                              {c.avatar ? <img src={c.avatar} alt=""/> : String(i+1).padStart(2,"0")}
                            </span>
                            <span><small>Character {String(i+1).padStart(2,"0")} · BOT PROFILE</small><b>{c.name || "Chưa đặt tên"}</b></span>
                          </div>
                          <div className="charActions">
                            <label className="btn ghost">
                               <input type="file" accept="image/*" onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                      const b64 = await readFile(f);
                                      handleUpdateChar(c.id, "avatar", b64);
                                  }
                               }} />Avatar
                            </label>
                            <button className="btn warn" onClick={() => handleDeleteChar(c.id)}>Xóa</button>
                          </div>
                        </div>
                        <div className="characterCardBody" style={{ display: 'block' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div className="field">
                              <label>Tên nhân vật & Vai trò</label>
                              <input 
                                value={c.name || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleUpdateChar(c.id, "name", val);
                                  handleUpdateChar(c.id, "role", val);
                                }}
                                placeholder="Tên nhân vật..."
                              />
                            </div>
                            <div className="field">
                              <label>Tuổi / Xưng hô / Nghề nghiệp</label>
                              <input 
                                value={c.identity || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  handleUpdateChar(c.id, "identity", val);
                                  handleUpdateChar(c.id, "status", val);
                                }}
                                placeholder="Tuổi, xưng hô, nghề nghiệp..."
                              />
                            </div>
                          </div>
                          <div className="field big" style={{ height: '320px' }}>
                            <label>Toàn bộ hồ sơ nhân vật (Ngoại hình · Tính cách/tâm lý · Quan hệ · Voice DNA · Canon lock riêng)</label>
                            <textarea 
                              value={c.personality} 
                              onChange={e => {
                                const val = e.target.value;
                                handleUpdateChar(c.id, "personality", val);
                                handleUpdateChar(c.id, "appearance", val);
                                handleUpdateChar(c.id, "relationship", val);
                                handleUpdateChar(c.id, "voiceDNA", val);
                                handleUpdateChar(c.id, "canon", val);
                              }}
                              placeholder="Vợ nhập toàn bộ ngoại hình, tính cách, tâm lý, voice DNA, quan hệ và canon lock của nhân vật này vào 1 ô lớn ở đây nhé..."
                              style={{ height: '100%', minHeight: '260px', fontSize: '14px', lineHeight: '1.6' }}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </section>

            <div className="btnRow3" style={{marginTop: "14px"}}>
              <button className="btn pink" onClick={() => onUpdateStory(activeStory)}>Lưu thông tin truyện</button>
              <button className="btn soft" onClick={() => { onCreate(); onOpenStudio(); }}>Tạo mới & mở</button>
              <button className="btn blue" onClick={onOpenStudio}>Vào viết prompt</button>
            </div>
            
            <div className="vault">
              <div className="vaultHead"><div><small>Story Isolation Rule</small><b>Dữ liệu mỗi truyện tách riêng</b></div></div>
              <pre className="merged">storyId riêng → Context Vault riêng → Imported Files riêng → Room Tasks riêng → Run Archive riêng → API Output riêng.

Khi chọn truyện A: chỉ hiển thị dữ liệu của truyện A.
Khi chọn truyện B: chỉ hiển thị dữ liệu của truyện B.
Không dùng chung localStorage key toàn cục cho nội dung truyện.</pre>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
