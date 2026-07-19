import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { STYLE_GROUPS } from "../../lib/lipstick-rooms-data";
import { callAIText } from "../../lib/api-client";
import { pruneBase64 } from "../../utils/apiProxy";
import { SafeImg } from "../../components/SafeImg";
import { compressImageFile } from "../../utils/imageCompressor";

export default function StyleAnalyzer({ roomState, currentStory, roomDef, state, save, toast }: any) {
  const [search, setSearch] = useState("");
  const sa = roomState.styleAnalyzer;
  const latestRoomStateRef = useRef<any>(roomState);

  useEffect(() => {
    latestRoomStateRef.current = roomState;
  }, [roomState]);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Create new refs array to trigger UI updates
    let newRefs = [...(sa.refs || [])];
    
    // Add placeholders for optimistic update
    const pendingFiles: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imgId = uuidv4();
      const now = new Date().toISOString();
      // create a temporary object URL for immediate display
      const tempUrl = URL.createObjectURL(file);
      
      const placeholder = {
        imageId: imgId,
        storyId: currentStory.id,
        roomId: roomDef.id,
        cardId: "style_analyzer",
        imageType: "style_analyzer_reference",
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
        previewUrl: tempUrl,
        storageUrl: tempUrl,
        analysisStatus: 'pending',
        // legacy fields
        id: imgId,
        name: file.name,
        type: file.type,
        data: tempUrl,
        time: now,
        _file: file // keep the file object to process it
      };
      newRefs.push(placeholder);
      pendingFiles.push(placeholder);
    }
    
    // Optimistic update
    const newRoomState = {
      ...roomState,
      styleAnalyzer: {
        ...sa,
        refs: newRefs
      }
    };
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
    save(newState, true);
    toast("✅ Đã tải ảnh vào Style Analyzer! Đang nén ảnh...");

    // Process base64 asynchronously
    setTimeout(async () => {
      let updatedRefs = [...newRefs];
      for (const pending of pendingFiles) {
        try {
          const data = await toBase64(pending._file);
          updatedRefs = updatedRefs.map(r => 
            r.imageId === pending.imageId 
              ? { ...r, data, previewUrl: data, storageUrl: data, analysisStatus: 'in_context', _file: undefined }
              : r
          );
        } catch (e) {
          console.error("Compression error", e);
        }
      }
      
      const latestRoom = latestRoomStateRef.current;
      const latestSA = latestRoom.styleAnalyzer || { refs: [] };
      
      const finalRoomState = {
        ...latestRoom,
        styleAnalyzer: {
          ...latestSA,
          refs: latestSA.refs ? latestSA.refs.map((r: any) => {
            const isPending = pendingFiles.some(p => p.imageId === r.imageId);
            if (isPending) {
              const updated = updatedRefs.find(ur => ur.imageId === r.imageId);
              if (updated) {
                return { ...r, data: updated.data, previewUrl: updated.previewUrl, storageUrl: updated.storageUrl, analysisStatus: updated.analysisStatus, _file: undefined };
              }
            }
            return r;
          }) : newRefs
        }
      };
      const finalStory = {
        ...currentStory,
        rooms: {
          ...(currentStory.rooms || {}),
          [roomDef.id]: finalRoomState
        }
      };
      save({
        ...state,
        stories: state.stories.map((s: any) => s.id === finalStory.id ? finalStory : s)
      }, true);
      toast("✅ Đã hoàn tất nén ảnh! Sẵn sàng trong Context Windows.");
    }, 100);
  };

  const runAnalysis = async () => {
    toast("Đang phân tích nét vẽ qua API...");
    let newAnalysis = "";
    let addedStyles: string[] = [];
    let modified = false;

    // Create a copy of refs array to work on immutably
    const updatedRefs = sa.refs ? sa.refs.map((r: any) => ({ ...r })) : [];

    for (let i = 0; i < updatedRefs.length; i++) {
      if (updatedRefs[i].analysisStatus !== 'analyzed') {
        updatedRefs[i].analysisStatus = 'analyzing';
        
        // Optimistic save of "analyzing" status
        const interimRoomState = {
          ...roomState,
          styleAnalyzer: {
            ...sa,
            refs: updatedRefs
          }
        };
        const interimStory = {
          ...currentStory,
          rooms: {
            ...(currentStory.rooms || {}),
            [roomDef.id]: interimRoomState
          }
        };
        save({
          ...state,
          stories: state.stories.map((s: any) => s.id === interimStory.id ? interimStory : s)
        }, true);

        try {
          const sysPrompt = `You are the world-class, ultra-premium Visual DNA Extraction Engine for Lipstick Prompt Rooms.
Your task is to perform an EXHAUSTIVE, high-fidelity artistic deconstruction of the attached reference image. You are NOT just identifying objects; you are extracting the "Engineering Blueprint" of the art style, technical execution, and visual intelligence.

### 👑 SUPREME DIRECTIVE: TRANSFORMATIVE AESTHETIC STUDY
- **Purpose**: Extract the artistic "How" (techniques, logic, rules) to apply it to the user's "What" (original story characters).
- **Strict Prohibition**: DO NOT copy the character's identity, gender, face, or literal props if they conflict with the user's story. Instead, focus on the "Aesthetic DNA" (brushwork, color theory, light physics, composition math).

### 🔍 MANDATORY ANALYSIS LAYERS (PHẠM VI PHÂN TÍCH BẮT BUỘC):
1. **Line Art (Kỹ thuật đi nét)**: Phân tích độ dày/mỏng (line weight), độ sắc nét (sharpness), màu sắc của nét line (colored lineart), và cách xử lý các điểm giao (intersections).
2. **Facial & Character Rendering (Render khuôn mặt & Nhân vật)**: Phân tích cấu trúc xương, cách đánh khối (shading) vùng mặt, độ trong của da (Subsurface Scattering), và phong cách render (soft-blending, cell-shading, hay semi-realism).
3. **Eye Rendering (Render mắt - Mắt biếc)**: Đặc tả chiều sâu mống mắt (iris depth), các chấm sáng phản chiếu (catchlights), độ bóng của giác mạc, và cách vẽ lông mi (feathery, clumped).
4. **Hair Physics & Rendering (Render tóc - Kiến trúc tóc)**: Phân tích khối tóc (volume), nhịp điệu lọn tóc (strand rhythm), vòng sáng trên tóc (angel rings), độ tơi (airy quality), và cách ánh sáng xuyên thấu qua các sợi tóc (translucency).
5. **Color Rendering & Material Physics (Render màu sắc & Vật lý vật liệu)**: Phân tích cách màu sắc tương tác với bề mặt chất liệu (vải, da, kim loại, nước). Độ phản xạ (reflectivity) và độ nhám (roughness).
6. **Composition & Visual Path (Bố cục & Đường dẫn thị giác)**: Phân tích các đường dẫn thị giác (leading lines), bố cục hình học (Triangle, Spiral, Golden Ratio), và cách sắp xếp tiền cảnh/hậu cảnh để tạo chiều sâu.
7. **Proportions & Anatomy (Tỉ lệ & Giải phẫu)**: Phân tích tỷ lệ đầu/thân, độ rộng vai, chiều dài tay chân, và các đặc điểm giải phẫu học đặc trưng của phong cách nghệ thuật này.
8. **Typography & Graphic Design (Chữ & Đồ họa)**: Phân tích layout, font style, cách sắp đặt các yếu tố đồ họa bổ trợ (nếu có).
9. **Color Palette & Light Physics (Bảng màu & Vật lý ánh sáng)**: Phân tích nguồn sáng chính/phụ (Key/Fill light), hướng sáng, nhiệt độ màu, và độ bão hòa (saturation map).
10. **Texture & Surface Details (Texture & Chi tiết bề mặt)**: Phân tích độ hạt (grain), texture vải, bề mặt giấy, hoặc các hiệu ứng nhiễu (noise/chromatic aberration) đặc trưng.

### 📜 OUTPUT FORMAT:
Return ONLY valid JSON with this schema:
{
  "imageId": "${updatedRefs[i].imageId || updatedRefs[i].id}",
  "summary": "Tóm tắt tinh hoa nghệ thuật và kỹ thuật đỉnh cao bằng tiếng Việt.",
  "visualStyleExtracted": "Đặc tả chi tiết kỹ thuật vẽ, chất cọ, độ loang và Art Family.",
  "colorPaletteExtracted": "Bảng màu, ánh sáng, độ bão hòa và độ tương phản kỹ thuật.",
  "lineAndRenderExtracted": "Kỹ thuật đi nét (linework), shading, render da/vật liệu.",
  "moodExtracted": "Khí chất thị giác và cảm xúc nghệ thuật.",
  "compositionExtracted": "Bố cục hình học ẩn, đường dẫn thị giác và thiết lập camera (góc máy, tiêu cự).",
  "outfitExtracted": "Logic thiết kế trang phục, nếp gấp vải và tính gắn kết chi tiết trang trí.",
  "detailsToPreserve": "Danh sách quy tắc kỹ thuật bắt buộc giữ lại.",
  "detailsToAdapt": "Các yếu tố nội dung cần biến đổi theo cốt truyện.",
  "originalityElements": "Yếu tố sáng tạo để đảm bảo tính nguyên bản cho nhân vật.",
  "technicalAnalysis": {
    "lineArt": "Phân tích sâu về linework DNA.",
    "facialRendering": "Phân tích sâu về render khuôn mặt/nhân vật.",
    "eyeRendering": "Phân tích sâu về render mắt/mắt biếc.",
    "hairPhysics": "Phân tích sâu về kiến trúc tóc/vật lý tóc.",
    "materialPhysics": "Phân tích sâu về vật lý màu sắc/vật liệu.",
    "visualPath": "Phân tích sâu về bố cục/đường dẫn thị giác.",
    "anatomyProportions": "Phân tích sâu về tỷ lệ/giải phẫu.",
    "graphicDesign": "Phân tích sâu về đồ họa/typography.",
    "lightPhysics": "Phân tích sâu về vật lý ánh sáng/bảng màu.",
    "surfaceDetails": "Phân tích sâu về texture/bề mặt."
  },
  "subject": { "pose": "", "expression": "", "anatomyNotes": "" },
  "style": { "brushwork": "", "rendering": "", "texture": "" },
  "color": { "palette": [], "lighting": "", "contrast": "" },
  "composition": { "angle": "", "framing": "", "eyePath": "" },
  "characterDetails": { "eyeRendering": "", "hairPhysics": "", "skinTexture": "" },
  "background": { "environment": "", "typography": "", "graphicElements": "" },
  "promptKeywords": ["keyword1", "keyword2", ...]
} (Ensure everything is in Vietnamese except keywords and technical IDs)`;
          const messages: any[] = [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this image and return structured JSON only." },
                { type: "image_url", image_url: { url: updatedRefs[i].data || updatedRefs[i].previewUrl || updatedRefs[i].storageUrl } }
              ]
            }
          ];
          const resultText = await callAIText({ messages, systemPrompt: sysPrompt, maxTokensOverride: 2000 });
          updatedRefs[i].imageAnalysisText = resultText;
          updatedRefs[i].analysisResult = resultText;
          
          let jsonObj = null;
          try {
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonObj = JSON.parse(jsonMatch[0]);
          } catch (err) {}
          
          updatedRefs[i].imageAnalysisJson = jsonObj;
          updatedRefs[i].analysisStatus = 'analyzed';
          newAnalysis += `\n--- Phân tích ảnh ${i + 1}: ${updatedRefs[i].name} ---\n${jsonObj ? (jsonObj.summary + " | Visual Style: " + JSON.stringify(pruneBase64(jsonObj.visualStyleExtracted || jsonObj.style)) + " | Color Palette: " + JSON.stringify(pruneBase64(jsonObj.colorPaletteExtracted || jsonObj.color)) + " | Outfit: " + JSON.stringify(pruneBase64(jsonObj.outfitExtracted || jsonObj.layer4_outfit)) + " | Composition: " + JSON.stringify(pruneBase64(jsonObj.compositionExtracted || jsonObj.composition)) + " | Keywords: " + (jsonObj.promptKeywords||[]).join(", ")) : resultText}`;
          
          // Match style candidates with dictionary
          const keywordsToMatch = jsonObj ? [...(jsonObj.promptKeywords||[]), ...(jsonObj.selectedStyleCandidates||[]), JSON.stringify(pruneBase64(jsonObj.style))].join(" ").toLowerCase() : resultText.toLowerCase();
          for (const g of STYLE_GROUPS) {
            for (const item of g.items) {
              const itemWords = (item.name + " " + item.keywords).toLowerCase().split(/[\s,—,•,+,&]+/);
              const matchCount = itemWords.filter(w => w.length > 3 && keywordsToMatch.includes(w)).length;
              if (matchCount >= 1 || keywordsToMatch.includes(item.name.toLowerCase().split(" ")[0])) {
                addedStyles.push(g.group + "|||" + item.name);
              }
            }
          }
        } catch (e: any) {
          updatedRefs[i].analysisStatus = 'failed';
          updatedRefs[i].analysisResult = e.message;
          updatedRefs[i].imageAnalysisText = "Error: " + e.message;
        }
        modified = true;
      }
    }
    
    if (modified) {
      const finalSelected = [...new Set([...(sa.selected || []), ...addedStyles])];
      const finalAnalysis = sa.analysis ? (sa.analysis + "\n" + newAnalysis) : newAnalysis;
      const finalHistory = [...(sa.history || []), {
        id: uuidv4(),
        time: new Date().toISOString(),
        selected: finalSelected,
        analysis: finalAnalysis
      }];

      const finalRoomState = {
        ...roomState,
        styleAnalyzer: {
          ...sa,
          refs: updatedRefs,
          selected: finalSelected,
          analysis: finalAnalysis,
          history: finalHistory
        }
      };
      const finalStory = {
        ...currentStory,
        rooms: {
          ...(currentStory.rooms || {}),
          [roomDef.id]: finalRoomState
        }
      };
      const finalState = {
        ...state,
        stories: state.stories.map((s: any) => s.id === finalStory.id ? finalStory : s)
      };
      save(finalState, true);
      toast("Đã phân tích xong nét vẽ và tô hồng phấn các nét phù hợp.");
    } else {
      toast("Không có ảnh mới để phân tích.");
    }
  };

  const toggleStyle = (k: string) => {
    const isSelected = (sa.selected || []).includes(k);
    const newSelected = isSelected
      ? (sa.selected || []).filter((x: string) => x !== k)
      : [...(sa.selected || []), k];
      
    const newRoomState = {
      ...roomState,
      styleAnalyzer: {
        ...sa,
        selected: newSelected
      }
    };
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
    save(newState, true);
  };

  return (
    <section className="block">
      <div className="block-title">
        <div>
          <p className="eyebrow">Style Analyzer</p>
          <h2>API phân tích nét vẽ riêng</h2>
          <p className="muted">Ảnh tham chiếu hiển thị ngang. Nét được chọn sẽ chuyển hồng phấn.</p>
        </div>
        <div className="actions">
          <button className="btn ghost small" onClick={() => {
            const newRoomState = {
              ...roomState,
              styleAnalyzer: {
                ...sa,
                selected: []
              }
            };
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
            save(newState, true);
          }}>Bỏ chọn</button>
          <button className="btn primary small" onClick={runAnalysis}>Gọi API phân tích nét</button>
        </div>
      </div>
      <div className="analyzer-layout">
        <div>
          <div className="upload-hero">
            <label className="file-label">
              Thêm ảnh phân tích nét
              <input type="file" multiple accept="image/*" className="file-native" onChange={handleUpload} />
            </label>
            <div className="image-rail">
              {sa.refs.length === 0 ? (
                <div className="photo-card empty-photo"><div><b>Chưa có ảnh phân tích nét</b></div></div>
              ) : (
                sa.refs.map((r: any, idx: number) => (
                  <div className="photo-card" key={`sa_photo_${r.id || 'img'}_${idx}`}>
                    <SafeImg src={r.data} alt="" />
                    <span>{r.name}</span>
                    <div className="analysis-status" title={r.analysisStatus === 'failed' ? '❌ Lỗi đọc ảnh' : '✅ Đã trong Context Windows (Sẵn sàng AI đọc)'}>{r.analysisStatus === 'failed' ? '❌' : '✅'}</div>
                    <button className="delete-btn" onClick={() => {
                      const imgId = r.id || r.imageId;
                      const updatedRefs = (sa.refs || []).filter((x: any) => (x.id || x.imageId) !== imgId);
                      
                      const newRoomState = {
                        ...roomState,
                        styleAnalyzer: {
                          ...sa,
                          refs: updatedRefs
                        }
                      };
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
                      save(newState, true);
                    }}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="style-toolbar">
            <input className="style-search" placeholder="Tìm nét vẽ..." value={search} onChange={e => setSearch(e.target.value)} />
            <span className="badge">{sa.selected.length} nét đã chọn</span>
          </div>
          <div className="selected-list">
            {sa.selected.slice(0, 30).map((k: string, idx: number) => (
              <span className="badge" key={`sa_sel_${k}_${idx}`}>{k.split("|||")[1]}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="analysis-box">
            {sa.analysis || "Kết quả phân tích nét vẽ sẽ hiện ở đây."}
          </div>
          <div className="style-groups">
            {STYLE_GROUPS.map((g, gi) => {
              const items = g.items.filter(it => (it.name + " " + it.keywords).toLowerCase().includes(search.toLowerCase()));
              if (!items.length) return null;
              return (
                <details className="style-group" open key={`sa_grp_${g.group}_${gi}`}>
                  <summary>{g.group} · {items.length}</summary>
                  <div className="chips">
                    {items.map((it, iti) => {
                      const k = g.group + "|||" + it.name;
                      const sel = sa.selected.includes(k);
                      return (
                        <button key={`sa_chip_${g.group}_${it.name}_${iti}`} className={`style-chip \${sel ? 'selected' : ''}`} onClick={() => toggleStyle(k)}>
                          {it.name}
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
