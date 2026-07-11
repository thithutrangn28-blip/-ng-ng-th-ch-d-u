import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { STYLE_GROUPS } from "../../lib/lipstick-rooms-data";
import { callAIText } from "../../lib/api-client";
import { SafeImg } from "../../components/SafeImg";
import { compressImageFile } from "../../utils/imageCompressor";

export default function StyleAnalyzer({ roomState, currentStory, roomDef, state, save, toast }: any) {
  const [search, setSearch] = useState("");
  const sa = roomState.styleAnalyzer;

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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await toBase64(file);
      const imgId = uuidv4();
      const now = new Date().toISOString();
      sa.refs.push({
        imageId: imgId,
        storyId: currentStory.id,
        roomId: roomDef.id,
        cardId: "style_analyzer",
        imageType: "style_analyzer_reference",
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: now,
        previewUrl: data,
        storageUrl: data,
        analysisStatus: 'in_context',
        // legacy fields
        id: imgId,
        name: file.name,
        type: file.type,
        data: data,
        time: now
      });
    }
    save(state);
    toast("✅ Đã tải ảnh vào Style Analyzer! Ảnh đã sẵn sàng trong Context Windows.");
  };

  const runAnalysis = async () => {
    toast("Đang phân tích nét vẽ qua API...");
    let newAnalysis = "";
    let addedStyles: string[] = [];
    let modified = false;

    for (let i = 0; i < sa.refs.length; i++) {
      if (sa.refs[i].analysisStatus !== 'analyzed') {
        sa.refs[i].analysisStatus = 'analyzing';
        save(state);
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
  "imageId": "${sa.refs[i].imageId || sa.refs[i].id}",
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
                { type: "image_url", image_url: { url: sa.refs[i].data || sa.refs[i].previewUrl || sa.refs[i].storageUrl } }
              ]
            }
          ];
          const resultText = await callAIText({ messages, systemPrompt: sysPrompt, maxTokensOverride: 2000 });
          sa.refs[i].imageAnalysisText = resultText;
          sa.refs[i].analysisResult = resultText;
          
          let jsonObj = null;
          try {
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonObj = JSON.parse(jsonMatch[0]);
          } catch (err) {}
          
          sa.refs[i].imageAnalysisJson = jsonObj;
          sa.refs[i].analysisStatus = 'analyzed';
          newAnalysis += `\n--- Phân tích ảnh ${i + 1}: ${sa.refs[i].name} ---\n${jsonObj ? (jsonObj.summary + " | Visual Style: " + JSON.stringify(jsonObj.visualStyleExtracted || jsonObj.style) + " | Color Palette: " + JSON.stringify(jsonObj.colorPaletteExtracted || jsonObj.color) + " | Outfit: " + JSON.stringify(jsonObj.outfitExtracted || jsonObj.layer4_outfit) + " | Composition: " + JSON.stringify(jsonObj.compositionExtracted || jsonObj.composition) + " | Keywords: " + (jsonObj.promptKeywords||[]).join(", ")) : resultText}`;
          
          // Match style candidates with dictionary
          const keywordsToMatch = jsonObj ? [...(jsonObj.promptKeywords||[]), ...(jsonObj.selectedStyleCandidates||[]), JSON.stringify(jsonObj.style)].join(" ").toLowerCase() : resultText.toLowerCase();
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
          sa.refs[i].analysisStatus = 'failed';
          sa.refs[i].analysisResult = e.message;
          sa.refs[i].imageAnalysisText = "Error: " + e.message;
        }
        modified = true;
      }
    }
    
    if (modified) {
      if (addedStyles.length > 0) {
        sa.selected = [...new Set([...sa.selected, ...addedStyles])];
      }
      sa.analysis = sa.analysis ? (sa.analysis + "\n" + newAnalysis) : newAnalysis;
      sa.history.push({
        id: uuidv4(),
        time: new Date().toISOString(),
        selected: [...sa.selected],
        analysis: sa.analysis
      });
      save(state);
      toast("Đã phân tích xong nét vẽ và tô hồng phấn các nét phù hợp.");
    } else {
      toast("Không có ảnh mới để phân tích.");
    }
  };

  const toggleStyle = (k: string) => {
    if (sa.selected.includes(k)) {
      sa.selected = sa.selected.filter((x: string) => x !== k);
    } else {
      sa.selected.push(k);
    }
    save(state);
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
          <button className="btn ghost small" onClick={() => { sa.selected = []; save(state); }}>Bỏ chọn</button>
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
                      sa.refs = sa.refs.filter((x: any) => x.id !== r.id);
                      save(state);
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
