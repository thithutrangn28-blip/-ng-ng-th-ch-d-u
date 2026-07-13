import re

file_path = "src/screens/lipstick-prompt/RoomView.tsx"

with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "into exactly 5 STANDALONE PARTS (### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC, followed by ### 🧑 PART 1 to ### 📸 PART 5), and end with '### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all 5 parts",
    "into exactly 10 STANDALONE EXHAUSTIVE SECTIONS (### 👑 TƯ LIỆU THAM CHIẾU & AESTHETIC DNA BẮT BUỘC, followed by ### 🧑 SECTION 1 to ### 📸 SECTION 10), and end with '### 🎨 PROMPT TẠO ẢNH TỔNG HỢP HOÀN CHỈNH (MASTER PRODUCTION-READY ENGLISH PROMPT)' combining all 10 sections"
)

with open(file_path, "w") as f:
    f.write(content)
