import re

with open('src/screens/lipstick-prompt/RoomView.tsx', 'r') as f:
    content = f.read()

# We know where it broke
# find: ${isComicMode ? `[FINAL PROMPT]....
start_idx = content.find('${isComicMode ? `[FINAL PROMPT](Write the final')
end_idx = content.find('- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA', start_idx)

original_comic = """${isComicMode ? `[FINAL PROMPT](Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for "${c.title}" here. CRITICAL MANDATE FOR COMIC / MANGA / WEBTOON: You MUST NOT use a single-image 5-part structure! Instead, you MUST generate a Multi-Panel Comic Page / Webtoon layout with sequential storytelling, distinct comic frames, character dialogue, facial expressions, actions, and backgrounds!
Structure exactly as follows:

### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC (MANDATORY SOURCE MATERIAL DATA)
- **Tư liệu thị giác bắt buộc (Full-Util 100%)**: [Liệt kê cực kỳ chi tiết, sắc sảo từng nét vẽ, kỹ thuật cọ (brushwork), mã màu hex, chất liệu vải, góc máy điện ảnh, tạo dáng từ TOÀN BỘ ảnh tham chiếu đính kèm. Phân tích thật sâu nét vẽ của ảnh tham chiếu để áp dụng vào ảnh cuối cùng. BẮT BUỘC ỨNG DỤNG TẤT CẢ VIBE VÀ PHONG CÁCH TỪ TƯ LIỆU, NHƯNG TUYỆT ĐỐI KHÔNG COPY ĐỒ VẬT, DỤNG CỤ HAY HOÀN CẢNH CỦA ẢNH THAM CHIẾU NẾU KHÔNG PHÙ HỢP CỐT TRUYỆN!]
- **Mệnh lệnh tạo ảnh tuyệt mỹ (Anti-Ordinary Guarantee)**: [Mệnh lệnh tiếng Anh chuyên sâu dùng từ vựng điện ảnh cực cao (8k resolution, IMAX, hyper-detailed, masterpiece, award-winning cinematography, sharp focus, intricate detailing). Cấm tuyệt đối kiểu render "bình thường" hoặc "generic". Hình ảnh phải đạt đẳng cấp đồ hoạ điện ảnh (cinematic graphics) cao nhất!]

---

### 📚 TỔNG QUAN TRANG TRUYỆN / WEBTOON PAGE SETUP
- **🎬 Tên trang / Phân cảnh (Scene Title)**: [Tóm tắt tình huống cốt truyện trong trang/thẻ này]
- **🎨 Phong cách vẽ (Art Style & Medium)**: [MÔ TẢ CỰC KỲ CHI TIẾT phong cách nghệ thuật bám sát ảnh tham chiếu. Nét vẽ Manga/Manhwa/Comic/Semi-realistic? ÉP BUỘC sử dụng phong cách này để TRÁNH mặc định của AI (override generic AI style). Bắt buộc dùng từ khóa mạnh như "in the exact art style of..."]
- **📐 Bố cục trang & Nhịp điệu (Page Layout & Pacing)**: [Phân chia số khung từ 2 đến 6 khung, cách sắp xếp khung trên trang, sự đan xen giữa các khung toàn cảnh và khung cận cảnh]

---

### 🖼️ KHUNG 1: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [MÔ TẢ CỰC KỲ CHI TIẾT DỰA TRÊN "VISUAL COMPOSITION LIBRARY": Ngôn ngữ Camera (Perspective, Height, Distance, Focal Length). Hệ thống dẫn dắt mắt (Leading Lines, Eye Path, Golden Ratio, Framing). Phân bổ không gian (Positive/Negative Space, Foreground/Background Depth). Cấu trúc ánh sáng & Bóng đổ (Key Light, Rim Light, Soft/Hard Shadow). Đặc tả độ tương phản và màu sắc điện ảnh (Cinematic Color Script)]
- **🧑 Tình huống & Hành động (Action & Stance)**: [Mô tả chi tiết dáng điệu (pose), độ nghiêng đầu, vị trí đặt tay chân, ngôn ngữ cơ thể, tương tác không gian]
- **💇‍♀️ Chi tiết Tóc, Mắt & Nét vẽ (Hair, Eye & Linework)**: [DÀNH THẬT NHIỀU TOKEN ĐỂ ĐẶC TẢ CỰC KỲ CHI TIẾT DỰA TRÊN "HAIR DESIGN KNOWLEDGE TREE" ĐƯỢC RÚT RA TỪ ẢNH THAM CHIẾU: Cấu trúc tầng layer, thể tích khối đặc/rỗng, hệ thống cụm lọn tóc tơ mỏng manh, hướng luồng chảy (hair flow), chất liệu bề mặt, kiểu mái, hairline, độ tơi xốp, vòng sáng đỉnh đầu (angel ring), rim light. Kỹ thuật vẽ mắt (đồng tử sâu, ánh sáng catchlight lấp lánh). Kỹ thuật đi lineart và lên màu. TẤT CẢ PHẢI MÔ PHỎNG CHÍNH XÁC TỪ ẢNH THAM CHIẾU!]
- **👗 Trang phục & Sáng tạo (Outfit & Creative Adaptation)**: [MÔ TẢ CỰC KỲ CHI TIẾT trang phục. SÁNG TẠO TRONG HỌC HỎI: Học hỏi từ ảnh tham chiếu nhưng BẮT BUỘC phải tinh chỉnh, biến tấu sáng tạo cho hoàn toàn phù hợp với tính cách, bối cảnh và câu chuyện của nhân vật. Không sao chép cứng nhắc.]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [Miêu tả chi tiết thần thái: ánh mắt, cơ mặt, môi, nếp nhăn...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: 
  + **Lời thoại (Tiếng Việt & English)**: "[Nhân vật A nói gì / suy nghĩ gì trong bong bóng chat]"
  + **Hiệu ứng âm thanh (SFX)**: [Ví dụ: Thump thump, Whoosh, Doki doki...]
- **🌌 Bối cảnh & Không gian (Environment & Depth)**: [Mô tả chi tiết Độ gần xa (Depth of Field), Tiền cảnh (Foreground), Trung cảnh (Midground), Hậu cảnh (Background). Bối cảnh xung quanh nhân vật]
- **💡 Ánh sáng & Màu sắc (Lighting & Color)**: [Hướng ánh sáng, Rim light, cách đánh khối, độ bão hòa (saturation), bảng màu chủ đạo, độ tương phản]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 1 (Production-ready AI Image Prompt)**: 
  `[Đoạn prompt tiếng Anh chuẩn, DÀI VÀ SIÊU CHI TIẾT (Highly Dense) cho Khung 1 để sử dụng trực tiếp trong AI tạo ảnh. Bắt buộc chứa TẤT CẢ các chi tiết vừa phân tích phía trên!]`

---

### 🖼️ KHUNG 2: [TÊN TÌNH HUỐNG / SCENE FOCUS]
- **🎬 Bố cục Khung & Góc Máy (Panel Framing & Camera)**: [...]
- **🧑 Tình huống & Hành động (Action & Stance)**: [...]
- **💇‍♀️ Chi tiết Tóc, Mắt & Nét vẽ (Hair, Eye & Linework)**: [...]
- **👗 Trang phục & Sáng tạo (Outfit & Creative Adaptation)**: [...]
- **😍 Biểu cảm khuôn mặt (Facial Expression & Emotion)**: [...]
- **💬 Lời thoại & Chữ trong tranh (Dialogue / Speech Bubble / SFX)**: [...]
- **🌌 Bối cảnh & Không gian (Environment & Depth)**: [...]
- **💡 Ánh sáng & Màu sắc (Lighting & Color)**: [...]
- **✨ PROMPT TẠO ẢNH CHO KHUNG 2 (Production-ready AI Image Prompt)**: 
  `[...]`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến câu chuyện)*

---

### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all panels into a sequential comic/webtoon page layout AND explicitly enforcing the Full-Util 100% reference visual DNA (art style, character features, panel framing, lighting, line of sight, hair rendering). Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece comic/webtoon layout strictly imitating the exact art style, line art, brush strokes, color saturation, and visual DNA from the reference source materials. You MUST override default generic AI art styles! Force the rendering to precisely match the provided aesthetic. Absolutely NO generic rendering. Highest cinematic quality, hyper-detailed..." Ready for 1-click copy & paste!]`

---

### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
` : `[FINAL PROMPT]
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
`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining ALL 120 modules into a unified prompt string. Explicitly enforce the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece illustration strictly imitating the exact art style, brush strokes, line art, color saturation, and visual DNA from the reference source materials. Absolutely NO generic or ordinary AI rendering. Do NOT default to standard styles..." followed by the detailed prompt. Ready for 1-click copy & paste into Midjourney, Niji, or DALL-E!]`

---

### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)
"""

content = content[:start_idx] + original_comic + content[end_idx:]

with open('src/screens/lipstick-prompt/RoomView.tsx', 'w') as f:
    f.write(content)

print("Fixed")
