import re

with open('src/screens/lipstick-prompt/RoomView.tsx', 'r') as f:
    content = f.read()

# I want to modify the comic mode to also mention 80-120 modules for each frame.
target_comic = """${isComicMode ? `[FINAL PROMPT]
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
  `[Đoạn prompt tiếng Anh DÀI VÀ SIÊU CHI TIẾT cho Khung 1 sử dụng trực tiếp trong AI tạo ảnh. Bắt buộc chứa TẤT CẢ các chi tiết AAA vừa phân tích!]`

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
  `[...]`

---
*(Tiếp tục cho các Khung tiếp theo: Khung 3, Khung 4... tùy diễn biến)*

---
### 🎨 PROMPT TẠO ẢNH TỔNG HỢP TOÀN TRANG (FULL PAGE COMIC PROMPT)
`[MUST BE EXCLUSIVELY IN ENGLISH: A single, cohesive, HIGHLY DENSE master English prompt combining all panels into a sequential comic page layout AND explicitly enforcing the Full-Util 100% reference visual DNA. Prepend with: "MANDATORY AESTHETIC DIRECTIVE: Create a masterpiece comic/webtoon layout strictly imitating the exact art style..."]`

---
### 🚫 BẢN PHÒNG CHỐNG LỖI TẠO ẢNH CHUYÊN SÂU & CAM KẾT CHẤT LƯỢNG (ANTI-GLITCH PROTOCOL & QUALITY GUARANTEE)"""

start_idx = content.find('${isComicMode ? `[FINAL PROMPT](Write the final production-ready COMIC')
end_idx = content.find('- **TỔNG HỢP TOÀN BỘ CÁC LỖI CẤM PHÉP XẢY RA', start_idx)

content = content[:start_idx] + target_comic + '\n' + content[end_idx:]

with open('src/screens/lipstick-prompt/RoomView.tsx', 'w') as f:
    f.write(content)

print("Fixed comic mode")
