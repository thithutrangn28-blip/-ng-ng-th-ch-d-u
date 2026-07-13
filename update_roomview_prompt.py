import re

file_path = "src/screens/lipstick-prompt/RoomView.tsx"

with open(file_path, "r") as f:
    content = f.read()

# We need to replace the MANDATE #11 and add MANDATE #12
new_prompt_additions = """🚨 MANDATE #11: 100% REF-STEALTH & ANONYMOUS GEOMETRY RECONSTRUCTION (BẢO MẬT TUYỆT ĐỐI ẢNH THAM CHIẾU - BÁM CHẶT BỐ CỤC/GÓC MÁY/NÉT VẼ NHƯNG PHÁT TRIỂN PROMPT SÁNG TẠO KHÔNG LỘ BẢN GỐC) 🚨:\\n" +
            "  - No Identity/Literal Leak (Không rò rỉ danh tính/đặc trưng bản gốc): You are STRICTLY FORBIDDEN from copying or naming specific copyrighted props, unique weapons, specific tools, character names, or literal metadata of the reference image. Translate these elements into fully customized props matching the user's characters/story.\\n" +
            "  - Stealth Professional Art Formulation (Mô tả nghệ thuật ẩn danh chuyên nghiệp): Describe the camera angles, visual path/lines (đường thị giác, điểm nhìn, tầm nhìn), light source vectors, perspective depth, and artistic brushstrokes with 100% precision using professional visual art terminology, while keeping the prompt itself beautifully original. No reader should ever be able to guess or trace back the original reference image from the prompt text alone, yet the generative AI reading the prompt will reproduce the exact same composition framework, line-weight DNA, perspective structure, and color theory as the reference image, matching 100% the story characters!\\n\\n" +
            "🚨 MANDATE #12: ULTRA-DETAILED PROMPT EXPANSION (BẮT BUỘC MÔ TẢ CHI TIẾT TỪ 5000 ĐẾN 7000 KÝ TỰ, CHI TIẾT NÉT VẼ, TÓC, ÁNH SÁNG) 🚨:\\n" +
            "You MUST generate incredibly long, comprehensive, and exhaustive prompts. The total prompt length MUST be between 5000 and 7000 characters. You must include EXTREMELY detailed descriptions of the following:\\n" +
            "1. LINE DETAILS (Chi tiết Nét Vẽ): Describe the exact line weight, ink density, stroke dynamics, pencil/brush texture, hatching/cross-hatching techniques, and edge crispness. The structural line work MUST be explicitly prompted to guarantee structural integrity before coloring. \\n" +
            "2. HAIR ARCHITECTURE (Cấu trúc Tóc): Describe the hair flow, clumping, strands, volume, and gravity with precise physical geometry. AVOID 'splitting/clumping' AI artifacts. The character's specific hairstyle comes from the Story Profile, but the DRAWING STYLE/NÉT VẼ of the hair MUST be an exact match to the Reference Image's artistic technique.\\n" +
            "3. LIGHTING, COLOR, AND QUALITY CORRECTION (Ánh sáng, Màu sắc & Sửa lỗi chất lượng): Detail the exact color grading, light source origin, volumetric rays, shadow depth, chromatic aberration (or lack thereof), and material light interactions. Actively prompt to PREVENT 'washed out', 'generic', or 'plastic' AI-generated lighting. The output must be breathtaking, rivaling master-level human artwork.\\n" +
            "4. CAMERA & GEOMETRY (Góc máy & Hình học): Explicitly describe camera placement, viewing distance, arcs, geometry, visual recognition forms, and leading lines (đường thị giác).\\n\\n" +
            "🚨 SUPREME COMMAND FOR HIGH-FIDELITY DETAILS"""

content = content.replace("🚨 MANDATE #11: 100% REF-STEALTH & ANONYMOUS GEOMETRY RECONSTRUCTION (BẢO MẬT TUYỆT ĐỐI ẢNH THAM CHIẾU - BÁM CHẶT BỐ CỤC/GÓC MÁY/NÉT VẼ NHƯNG PHÁT TRIỂN PROMPT SÁNG TẠO KHÔNG LỘ BẢN GỐC) 🚨:\\n\" +\n            \"  - No Identity/Literal Leak (Không rò rỉ danh tính/đặc trưng bản gốc): You are STRICTLY FORBIDDEN from copying or naming specific copyrighted props, unique weapons, specific tools, character names, or literal metadata of the reference image. Translate these elements into fully customized props matching the user's characters/story.\\n\" +\n            \"  - Stealth Professional Art Formulation (Mô tả nghệ thuật ẩn danh chuyên nghiệp): Describe the camera angles, visual path/lines (đường thị giác, điểm nhìn, tầm nhìn), light source vectors, perspective depth, and artistic brushstrokes with 100% precision using professional visual art terminology, while keeping the prompt itself beautifully original. No reader should ever be able to guess or trace back the original reference image from the prompt text alone, yet the generative AI reading the prompt will reproduce the exact same composition framework, line-weight DNA, perspective structure, and color theory as the reference image, matching 100% the story characters!\\n\\n\" +\n            \"🚨 SUPREME COMMAND FOR HIGH-FIDELITY DETAILS", new_prompt_additions)

with open(file_path, "w") as f:
    f.write(content)
