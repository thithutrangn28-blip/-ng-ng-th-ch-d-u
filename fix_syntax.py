import re

with open('src/screens/lipstick-prompt/RoomView.tsx', 'r') as f:
    content = f.read()

start_marker = '${isComicMode ? `[FINAL PROMPT]'
end_marker = 'Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)`}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    new_block = """${isComicMode ? `[FINAL PROMPT]
(Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for "${c.title}" here. CRITICAL MANDATE FOR COMIC / MANGA / WEBTOON: You MUST NOT use a single-image structure! Instead, you MUST generate a Multi-Panel Comic Page / Webtoon layout with sequential storytelling.
For EACH PANEL, you MUST apply an ULTIMATE "STUDIO AAA" PROMPT ENGINEERING breakdown (incorporating micro-modules for lighting, camera, pose, expression, hair, outfit, background).

Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ, màu sắc từ TOÀN BỘ ảnh tham chiếu đính kèm. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao. Cấm tuyệt đối kiểu render "bình thường".]

---
### 📚 TỔNG QUAN TRANG TRUYỆN / WEBTOON PAGE SETUP
- **🎬 Tên trang / Phân cảnh (Scene Title)**: [Tóm tắt tình huống cốt truyện trong trang/thẻ này]
- **🎨 Phong cách vẽ (Art Style & Medium)**: [MÔ TẢ CỰC KỲ CHI TIẾT phong cách nghệ thuật bám sát ảnh tham chiếu.]
- **📐 Bố cục trang & Nhịp điệu (Page Layout & Pacing)**: [Phân chia số khung từ 2 đến 6 khung, cách sắp xếp khung trên trang]

---
### 🖼️ KHUNG 1: [TÊN TÌNH HUỐNG / SCENE FOCUS]
(Áp dụng siêu cấu trúc Studio AAA cho khung này)
- **🎬 Quay phim, Góc máy & Bố cục (Cinematography & Composition - 15 Modules)**: [Đặc tả Perspective, Focal Length, DoF, Rule of Thirds, Leading Lines, Framing...]
- **💡 Ánh sáng & Màu sắc (Lighting & Color - 15 Modules)**: [Key light, Rim light, Volumetrics, Shadows, Color grading, Cinematic tones...]
- **🧑 Hành động & Giải phẫu (Action & Anatomy - 15 Modules)**: [Dáng điệu, Động năng, Ngôn ngữ cơ thể, Góc nghiêng đầu, Trọng tâm...]
- **😍 Biểu cảm & Khuôn mặt (Expression & Face - 10 Modules)**: [Hướng mắt, Cấu trúc xương hàm, Chuyển động cơ mặt, Cảm xúc...]
- **💇‍♀️ Tóc & Đường nét (Hair & Linework - 10 Modules)**: [Luồng gió, Khối lượng tóc, Lọn tơ, Độ sắc nét của lineart...]
- **👗 Trang phục & Chất liệu (Outfit & Textiles - 10 Modules)**: [Chất liệu vải, Nếp gấp, Độ chuyển động, Phụ kiện...]
- **🌌 Bối cảnh & Không gian (Environment & Depth - 5 Modules)**: [Chiều sâu tiền-trung-hậu cảnh, Môi trường xung quanh...]
- **💬 Lời thoại & Chữ (Dialogue / SFX)**: [Nhân vật nói gì / Hiệu ứng âm thanh...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 1 (Production-ready AI Image Prompt)**: 
  \`[Đoạn prompt tiếng Anh DÀI VÀ SIÊU CHI TIẾT cho Khung 1 sử dụng trực tiếp trong AI tạo ảnh. Bắt buộc chứa TẤT CẢ các chi tiết AAA vừa phân tích!]\`

---
### 🖼️ KHUNG 2: [TÊN TÌNH HUỐNG / SCENE FOCUS]
(Áp dụng siêu cấu trúc Studio AAA tương tự như Khung 1)
- **🎬 Quay phim, Góc máy & Bố cục**: [...]
- **💡 Ánh sáng & Màu sắc**: [...]
- **🧑 Hành động & Giải phẫu**: [...]
- **😍 Biểu cảm & Khuôn mặt**: [...]
- **💇‍♀️ Tóc & Đường nét**: [...]
- **👗 Trang phục & Chất liệu**: [...]
- **🌌 Bối cảnh & Không gian**: [...]
- **💬 Lời thoại & Chữ**: [...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 2 (Production-ready AI Image Prompt)**: 
  \`[...]\`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến)*

---
### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all panels into a sequential comic page layout AND explicitly enforcing the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece comic/webtoon layout strictly imitating the exact art style..."]\`

---
### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA (Absolute Zero-Tolerance Error List)**:
  + *Lỗi giải phẫu cơ thể (Anatomical Glitches)*: Cấm thừa ngón tay/ngón chân, biến dạng bàn tay/bàn chân, lệch khớp xương vai/cổ, lệch tâm mắt (asymmetric eyes), méo mồm hoặc biểu cảm đờ đẫn mất tự nhiên.
  + *Lỗi phong cách nét vẽ (Style Drift/AI Bleed)*: Cấm tuyệt đối pha trộn nét vẽ mặc định của AI (generic, overly airbrushed/plastic render styles). Nét vẽ phải đi đúng lineart rõ ràng, thô nháp hoặc mượt mà chính xác bám sát toàn bộ ảnh gốc tham chiếu.
  + *Lỗi bối cảnh và rác hình ảnh (Background Pollution & Artifacts)*: Cấm các chi tiết vật lý phi lý (cốc nước bay, bàn ghế dính liền người, vũ khí mọc sai chỗ), các đốm mờ, nhiễu hạt, chữ viết lộn xộn (nonsense text) xuất hiện bừa bãi trong tranh trừ SFX được ghi cụ thể.
  + *Lỗi bỏ quên tư liệu tham chiếu (Reference Neglect)*: Cấm chỉ học từ ảnh đầu tiên và ngó lơ các ảnh tiếp theo! Phải phân bổ rõ vai trò từng ảnh (ví dụ: ảnh 1 lấy tóc, ảnh 2 lấy dáng, ảnh 3 lấy bối cảnh, ảnh 4 lấy cách tô màu bão hòa). Nếu bỏ sót bất cứ đặc trưng visual nào từ bất kỳ ảnh nào đã được gom đều bị coi là lỗi nghiêm trọng.
- **CHỈ DẪN VÀ CÚ PHÁP ĐỀ PHÒNG & KHẮC PHỤC LỖI CHI TIẾT (Strict Prevention Prompts & Negative Weights)**:
  [Cung cấp chi tiết hướng giải quyết, câu lệnh bổ trợ cụ thể bằng cả tiếng Việt và tiếng Anh (Negative Prompts như: "multiple limbs, deformed hands, poorly drawn face, bad anatomy, blurry, worst quality, low quality...") bám sát từng phân cảnh của thẻ này để người dùng dán vào Midjourney/Niji/DALL-E phòng ngừa lỗi triệt để].
- **LỜI NHẮC NHỞ NGHIÊM NGẶT CHO HỌA SĨ AI (Strict Quality Assurance Mandate)**:
  [Viết một đoạn thông điệp cam kết chất lượng cực kỳ dài, chi tiết, nhắc nhở từng phân đoạn, nhắc nhở kĩ càng từng chi tiết nhỏ của tóc, mắt, trang phục, góc máy không được phép sai lệch so với nguồn cảm hứng nguyên bản].

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)` : `[FINAL PROMPT]
(Write the final production-ready standalone image prompt for "${c.title}" here. CRITICAL MANDATE: You MUST divide the prompt into an ULTIMATE "STUDIO AAA" PROMPT ENGINEERING FRAMEWORK containing roughly 80-120 micro-modules categorized into major chapters, AND end with a Master Production-Ready English Prompt block so the user can use each part or the whole prompt easily!

Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ (brushwork), mã màu hex, chất liệu vải, góc máy điện ảnh, tạo dáng từ TOÀN BỘ ảnh tham chiếu đính kèm của thẻ này. Phân tích thật sâu nét vẽ của ảnh tham chiếu để áp dụng vào ảnh cuối cùng. BẮT BUỘC ỨNG DỤNG TẤT CẢ TƯ LIỆU, KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ ẢNH NÀO!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao (8k resolution, IMAX, hyper-detailed, masterpiece, award-winning cinematography, sharp focus, intricate detailing). Cấm tuyệt đối kiểu render "bình thường" hoặc "generic". Hình ảnh phải đạt đẳng cấp đồ hoạ điện ảnh (cinematic graphics) cao nhất!]

---
### 🎬 CHƯƠNG 1: QUAY PHIM & NHIẾP ẢNH (CINEMATOGRAPHY & PHOTOGRAPHY - 15 Modules)
[Phân tích siêu sâu sắc thành các bullet point tiếng Anh kèm giải thích tiếng Việt. Bao gồm: 1. Camera Angle, 2. Shot Type (Close-up, Cowboy, Wide), 3. Lens Type (Macro, Wide, Telephoto), 4. Focal Length, 5. Depth of Field (DoF), 6. Bokeh Type, 7. Aperture (f/1.4 etc), 8. Shutter Speed Effect, 9. ISO/Film Grain, 10. Sensor Size, 11. Perspective (1-point, 2-point, 3-point), 12. Viewpoint (Bird's eye, Worm's eye), 13. Tilt/Dutch Angle, 14. Lens Distortion, 15. Glare/Lens Flare]

### 💡 CHƯƠNG 2: HỆ THỐNG ÁNH SÁNG & ĐÁNH KHỐI (LIGHTING & VOLUMETRICS - 15 Modules)
[Bao gồm: 16. Key Light, 17. Fill Light, 18. Backlight/Rim Light, 19. Hair Light, 20. Catchlight (Eye sparkle), 21. Ambient Light, 22. Bounce Light, 23. Practical Lights, 24. Volumetric Rays (God rays), 25. Subsurface Scattering (SSS), 26. Global Illumination, 27. Contrast Ratio, 28. Shadow Softness/Hardness, 29. Color Temperature, 30. Atmospheric Haze/Fog interaction with light]

### 🎨 CHƯƠNG 3: MÀU SẮC ĐIỆN ẢNH & HIỆU CHỈNH (COLOR GRADING & PALETTE - 12 Modules)
[Bao gồm: 31. Primary Color Palette, 32. Secondary/Accent Colors, 33. Color Harmony (Analogous, Complementary), 34. Hue Shifts, 35. Saturation Dynamics, 36. Luminance Levels, 37. Color Contrast, 38. Shadows Tint, 39. Midtones Tint, 40. Highlights Tint, 41. LUT/Cinematic Grading Profile, 42. Visual Mood/Atmosphere via Color]

### 🖌️ CHƯƠNG 4: CHẤT LIỆU, NÉT VẼ & RENDER (ART STYLE, MEDIUM & BRUSHWORK - 15 Modules)
[Bao gồm: 43. Core Art Style (Anime, Manhwa, Realism, etc.), 44. Medium (Oil, Watercolor, Digital, Cel-shaded), 45. Brushstroke Type, 46. Linework Weight, 47. Line Color/Tapering, 48. Blending Technique, 49. Texture Overlays, 50. Canvas/Paper Grain, 51. Impasto/Thickness, 52. Edge Control (Soft vs Hard edges), 53. Rendering Engine (Unreal, Octane, V-Ray), 54. Specular Maps, 55. Normal/Bump mapping simulation, 56. Anti-Aliasing/Sharpness, 57. Style Bleed Prevention]

### 📐 CHƯƠNG 5: BỐ CỤC & DẪN DẮT THỊ GIÁC (COMPOSITION & VISUAL HIERARCHY - 12 Modules)
[Bao gồm: 58. Rule of Thirds/Golden Ratio, 59. Eye Guiding Lines (Leading Lines), 60. Framing within Framing, 61. Symmetry/Asymmetry, 62. Visual Weight Distribution, 63. Positive/Negative Space Ratio, 64. Foreground Elements, 65. Midground Elements, 66. Background Elements, 67. Subject Placement, 68. Tension Points, 69. Scale and Proportion]

### 🧑 CHƯƠNG 6: NHÂN VẬT & NGÔN NGỮ CƠ THỂ (CHARACTER, POSE & KINETICS - 15 Modules)
[Bao gồm: 70. Core Subject Description, 71. Gender/Identity Fidelity, 72. Age Presentation, 73. Body Type/Anatomy, 74. Posture/Stance, 75. Kinetic Energy/Motion, 76. Weight Distribution (Contrapposto), 77. Hand Gestures/Placement, 78. Footing, 79. Head Tilt, 80. Shoulders Angle, 81. Spine Curve, 82. Tension in Muscles, 83. Interaction with Props, 84. Silhouette Clarity]

### 😍 CHƯƠNG 7: KHUÔN MẶT, BIỂU CẢM & TRANG ĐIỂM (FACE, EXPRESSION & MAKEUP - 10 Modules)
[Bao gồm: 85. Facial Bone Structure, 86. Eye Shape and Gaze Direction, 87. Pupil/Iris Detailing, 88. Eyebrow Arch/Micro-expression, 89. Mouth/Lip Shape and Parting, 90. Skin Texture/Pores/Translucency, 91. Blush/Makeup Application, 92. Micro-asymmetry (Realism), 93. Emotional Output, 94. Jawline/Chin definition]

### 💇‍♀️ CHƯƠNG 8: KIẾN TRÚC TÓC & ĐỘ BỒNG BỀNH (HAIR ARCHITECTURE & FLOW - 10 Modules)
[Bao gồm: 95. Hair Length and Silhouette, 96. Volume and Density, 97. Hair Root/Parting Line, 98. Strand Grouping (Clumps), 99. Flyaways and Fine Hairs, 100. Hair Flow/Wind Direction, 101. Bangs/Fringe Styling, 102. Material/Glossiness, 103. Highlight Band (Angel Ring), 104. Gravity Interaction]

### 👗 CHƯƠNG 9: TRANG PHỤC & CHẤT LIỆU VẢI (FASHION, DRAPERY & TEXTILES - 12 Modules)
[Bao gồm: 105. Main Outfit Description, 106. Creative Adaptation (from ref to story), 107. Fabric Types (Silk, Leather, Cotton), 108. Fold Types (Pipe, Drop, Zig-zag), 109. Tension/Pull Points in Fabric, 110. Seam/Stitch Detailing, 111. Metallic/Reflective Accents, 112. Translucency (Sheer fabrics), 113. Layering/Complexity, 114. Accessory Placement, 115. Embroidery/Patterns, 116. Fabric Interaction with Wind]

### 🌌 CHƯƠNG 10: KHÔNG GIAN & VẬT THỂ BỔ TRỢ (ENVIRONMENT & PROPS - 4 Modules)
[Bao gồm: 117. Setting/Location, 118. Weather/Atmosphere, 119. Environmental Storytelling, 120. Prop integration]

---
### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)
\`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining ALL 120 modules into a unified prompt string. Explicitly enforce the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece illustration strictly imitating the exact art style, brush strokes, line art, color saturation, and visual DNA from the reference source materials. Absolutely NO generic or ordinary AI rendering. Do NOT default to standard styles..." followed by the detailed prompt. Ready for 1-click copy & paste into Midjourney, Niji, or DALL-E!]\`

---
### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA (Absolute Zero-Tolerance Error List)**:
  + *Lỗi giải phẫu cơ thể (Anatomical Glitches)*: Cấm thừa ngón tay/ngón chân, biến dạng bàn tay/bàn chân, lệch khớp xương vai/cổ, lệch tâm mắt (asymmetric eyes), méo mồm hoặc biểu cảm đờ đẫn mất tự nhiên.
  + *Lỗi phong cách nét vẽ (Style Drift/AI Bleed)*: Cấm tuyệt đối pha trộn nét vẽ mặc định của AI (generic, overly airbrushed/plastic render styles). Nét vẽ phải đi đúng lineart rõ ràng, thô nháp hoặc mượt mà chính xác bám sát toàn bộ ảnh gốc tham chiếu.
  + *Lỗi bối cảnh và rác hình ảnh (Background Pollution & Artifacts)*: Cấm các chi tiết vật lý phi lý (cốc nước bay, bàn ghế dính liền người, vũ khí mọc sai chỗ), các đốm mờ, nhiễu hạt, chữ viết lộn xộn (nonsense text) xuất hiện bừa bãi trong tranh trừ SFX được ghi cụ thể.
  + *Lỗi bỏ quên tư liệu tham chiếu (Reference Neglect)*: Cấm chỉ học từ ảnh đầu tiên và ngó lơ các ảnh tiếp theo! Phải phân bổ rõ vai trò từng ảnh (ví dụ: ảnh 1 lấy tóc, ảnh 2 lấy dáng, ảnh 3 lấy bối cảnh, ảnh 4 lấy cách tô màu bão hòa). Nếu bỏ sót bất cứ đặc trưng visual nào từ bất kỳ ảnh nào đã được gom đều bị coi là lỗi nghiêm trọng.
- **CHỈ DẪN VÀ CÚ PHÁP ĐỀ PHÒNG & KHẮC PHỤC LỖI CHI TIẾT (Strict Prevention Prompts & Negative Weights)**:
  [Cung cấp chi tiết hướng giải quyết, câu lệnh bổ trợ cụ thể bằng cả tiếng Việt và tiếng Anh (Negative Prompts như: "multiple limbs, deformed hands, poorly drawn face, bad anatomy, blurry, worst quality, low quality...") bám sát từng phân cảnh của thẻ này để người dùng dán vào Midjourney/Niji/DALL-E phòng ngừa lỗi triệt để].
- **LỜI NHẮC NHỞ NGHIÊM NGẶT CHO HỌA SĨ AI (Strict Quality Assurance Mandate)**:
  [Viết một đoạn thông điệp cam kết chất lượng cực kỳ dài, chi tiết, nhắc nhở từng phân đoạn, nhắc nhở kĩ càng từng chi tiết nhỏ của tóc, mắt, trang phục, góc máy không được phép sai lệch so với nguồn cảm hứng nguyên bản].

Do NOT include any image IDs, filenames (.jpg/.png), UUIDs, "Attached Reference Images", "Room:", "Card:", or technical metadata inside this [FINAL PROMPT] section!)`}"""

    content = content[:start_idx] + new_block + content[end_idx:]
    with open('src/screens/lipstick-prompt/RoomView.tsx', 'w') as f:
        f.write(content)
    print("Fixed syntax")
else:
    print("Could not find markers")
