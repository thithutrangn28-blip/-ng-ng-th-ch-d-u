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
          const sysPrompt = `You are the professional vision analysis module inside Lipstick Prompt Rooms.
You MUST analyze and extract the visual traits from this reference image to support downstream AI image generation under the core rule: "SUPREME MANDATE: Story Fidelity & Character Soul (Cốt truyện và Nhân vật là linh hồn - Ảnh tham chiếu là tư liệu)":

CRITICAL RULE: The core goal of this app is to draw the characters from the user's specific story plot. The attached images serve ONLY as visual DNA references to learn the artistic language (art style, rendering, mood, line quality, lighting, color palette, outfit spirit, composition rhythm). YOU ARE STRICTLY FORBIDDEN FROM FOCUSING ON THE FACE/IDENTITY/GENDER OF THE PERSON IN THE REFERENCE. Instead, you must extract the aesthetic DNA and analyze how it can be TRANSFORMATIVELY ADAPTED to perfectly represent the user's original character in their story!

You MUST analyze and extract these mandatory layers:
1. Nhận diện Aesthetic DNA tổng thể (khí chất thẩm mỹ, độ mềm/sắc/lạnh/ngọt/sang, vibe nghệ thuật)
2. Phong cách vẽ & Chất cọ / texture / rendering (watercolor, manhua fantasy, soft ink-wash, digital anime..., độ mềm của line, độ loang màu, độ trong mờ)
3. Bảng màu chính & Ánh sáng (nhiệt độ màu, độ bão hòa, độ tương phản, ánh sáng, pastel / dark / ethereal / warm)
4. Mood / Khí chất / Không khí thị giác (ethereal, poetic, dreamy, quiet, floral, regal, retro, dark...)
5. Phân tích Khả năng Tự sự / Visual Storytelling Potential: Phân tích xem các yếu tố trong ảnh tham chiếu (ánh sáng, vật thể, bố cục) có thể giúp kể câu chuyện của người dùng như thế nào.
6. Motif hình ảnh (hoa, sen, nước, ruy băng, khung trang trí, thiên nhiên, gió, khói...)
6. Trang phục / Outfit Fidelity (tinh thần trang phục, form dáng silhouette, độ rủ, lớp layer, mật độ chi tiết, cảm giác chất liệu, trim/lace/ribbon/embroidery tendencies, elegance/fantasy level)
7. Bố cục thị giác / Composition Fidelity (visual hierarchy, focal structure, eye-flow/visual path, subject placement logic, negative space rhythm, directional movement of hair/fabric/props/light).
8. Đặc tả Tóc / Hair Design (Học hỏi cấu trúc lọn tóc, độ tơi, vật lý và rendering từ ảnh tham chiếu để áp dụng cho nhân vật trong truyện).
9. Đặc tả Mắt (Eye Rendering): Cấu trúc đồng tử, độ sâu, ánh sáng phản chiếu, kỹ thuật vẽ mắt.
10. Transformation Guidance: Chỉ rõ những chi tiết thẩm mỹ (nét vẽ, màu sắc, bố cục) bắt buộc giữ lại, và những yếu tố (nhân dạng, pose, bối cảnh) cần biến đổi hoàn toàn để khớp với hồ sơ nhân vật gốc của vợ yêu.

Return ONLY valid JSON with this exact schema:
{
  "imageId": "${updatedRefs[i].imageId || updatedRefs[i].id}",
  "storyId": "${currentStory.id}",
  "roomId": "${roomDef.id}",
  "cardId": "style_analyzer",
  "imageType": "style_analyzer_reference",
  "analysisStatus": "analyzed",
  "summary": "Tóm tắt Aesthetic/Style DNA theo quy tắc High Aesthetic Fidelity, Transformative Adaptation bằng tiếng Việt",
  "visualStyleExtracted": "Chi tiết phong cách vẽ, medium texture, chất cọ, độ loang, cổ phong/manhua/anime/semi-realistic...",
  "colorPaletteExtracted": "Bảng màu chính, màu điểm nhấn, độ trong/mờ, nhiệt độ màu, ánh sáng",
  "lineAndRenderExtracted": "Độ mềm/clean của nét line, kỹ thuật shading, độ bóng, translucent washes...",
  "moodExtracted": "Không khí thị giác tổng thể, vibe cảm xúc (ethereal, poetic, dreamy, regal...)",
  "compositionExtracted": "Nhịp bố cục, visual hierarchy, eye-flow, negative space rhythm, directional movement của tóc/vải/light",
  "outfitExtracted": "Hướng trang phục, silhouette, layering logic, cảm giác chất liệu, mật độ trang trí, elegance/fantasy level",
  "detailsToPreserve": "Danh sách chi tiết thẩm mỹ bắt buộc giữ lại (color atmosphere, watery softness, floral mood, flowing composition, outfit direction...)",
  "detailsToAdapt": "Danh sách chi tiết cho phép biến đổi 15%-30% theo cốt truyện (pose, bối cảnh phụ, đạo cụ, khuôn mặt mới)",
  "originalityElements": "Danh sách yếu tố được biến đổi linh hoạt (transformative adaptation để tạo dấu ấn nguyên bản độc quyền cho nhân vật trong câu chuyện)",
  "layer1_overall": { "genderPresentation": "", "ageVibe": "", "auraVibe": "", "softnessSharpness": "" },
  "layer2_face": { "faceShape": "", "eyes": "", "nose": "", "mouth": "", "eyelashes": "", "makeupLevel": "", "maturity": "" },
  "layer3_hair": { "color": "", "length": "", "thickness": "", "texture": "", "bangs": "", "style": "" },
  "layer4_outfit": { "category": "", "silhouette": "", "materialFeel": "", "dominantColor": "", "accessories": "" },
  "layer5_artStyle": { "artFamily": "", "lineCleanliness": "", "lineSoftness": "", "shading": "", "texture": "", "glossiness": "", "detailLevel": "" },
  "layer6_color": { "dominantPalette": [], "colorTemp": "", "saturation": "", "contrast": "" },
  "layer7_composition": { "shotSize": "", "characterPlacement": "", "negativeSpace": "", "cameraAngle": "", "cinematicFeel": "" },
  "layer8_vibe": { "coreVibe": "" },
  "subject": { "mainSubject": "", "characterCount": 1, "genderPresentation": "", "ageVibe": "", "pose": "", "expression": "" },
  "style": { "artFamily": "", "lineArt": "", "rendering": "", "texture": "", "coloringMethod": "", "detailLevel": "" },
  "color": { "mainPalette": [], "accentColors": [], "temperature": "", "saturation": "", "contrast": "" },
  "composition": { "shotSize": "", "cameraAngle": "", "focalPoint": "", "characterPlacement": "", "negativeSpace": "", "leadingLines": "" },
  "characterDetails": { "face": "", "eyes": "", "hair": "", "outfit": "", "accessories": "", "makeup": "" },
  "background": { "environment": "", "objects": [], "typography": "", "graphicElements": [] },
  "promptKeywords": [],
  "selectedStyleCandidates": [],
  "negativePromptSuggestions": [],
  "referenceControl": { "visualSimilarityTarget": "Aesthetic study of art style, rendering, color palette & atmosphere", "adaptationAllowance": "Transformative adaptation to create original story character & Canva design", "originalityGuarantee": "Original Character Creation (Transformative Aesthetic Study)", "priority": "Bespoke character originality first, aesthetic style DNA second" }
}`;
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
