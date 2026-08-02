const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

// Update extraction logic
const extractRegex = /const negConstraints = extractBlock\(cardContent, "\[NEGATIVE_CONSTRAINTS\]", "\[\/NEGATIVE_CONSTRAINTS\]"\);/;
if (extractRegex.test(code)) {
    code = code.replace(extractRegex, `const negConstraints = extractBlock(cardContent, "[NEGATIVE_CONSTRAINTS]", "[/NEGATIVE_CONSTRAINTS]");
          const finalValidation = extractBlock(cardContent, "[FINAL_VALIDATION]", "[/FINAL_VALIDATION]");`);
}

const combinedReportRegex = /negConstraints \? \`\\[NEGATIVE_CONSTRAINTS\\]\\n\$\{negConstraints\}\` : ""\n\s*\]\.filter\(Boolean\)\.join\("\\n\\n"\);/;
if (combinedReportRegex.test(code)) {
    code = code.replace(combinedReportRegex, `negConstraints ? \`[NEGATIVE_CONSTRAINTS]\\n\${negConstraints}\` : "",
              finalValidation ? \`[FINAL_VALIDATION]\\n\${finalValidation}\` : ""
          ].filter(Boolean).join("\\n\\n");`);
}

const fieldsRegex = /negativeConstraints: negConstraints,\n\s*isValidated: isComplete/;
if (fieldsRegex.test(code)) {
    code = code.replace(fieldsRegex, `negativeConstraints: negConstraints,
                finalValidation: finalValidation,
                isValidated: isComplete`);
}

// Update beautiful_hair_art template
const hairCardRegex = /\} else if \(c\.id === 'beautiful_hair_art'\) \{[\s\S]*?\[CARD_END\]\`;\n  \} else if \(c\.id === 'cinematic_visual_art'\) \{/;
if (hairCardRegex.test(code)) {
    code = code.replace(hairCardRegex, `} else if (c.id === 'beautiful_hair_art') {
    return \`[CARD_START]
[CARD_ID: beautiful_hair_art]
[CARD_TITLE: TÓC XINH ĐẸP ♥︎]

[CARD_CONTENT]
[01. CHARACTER CANON & HAIR IDENTITY]
(Phải xác định đầy đủ: Tên nhân vật, Tuổi, Chiều cao, Mức độ trưởng thành, Dáng người, Hình dạng khuôn mặt, Trán, Gò má, Hàm, Cằm, Màu da, Tính cách, Trạng thái cảm xúc hiện tại, Màu tóc Canon, Độ dài tóc Canon, Mật độ tóc Canon, Chất tóc Canon, Kiểu mái, Kiểu ngôi, Phụ kiện tóc, Những đặc điểm không được thay đổi. Không lặp hồ sơ, giải thích ảnh hưởng đến thiết kế tóc)

[02. HAIR BEAUTY CONCEPT]
(Phải xác định: Mái tóc đẹp theo ngôn ngữ nào, Vẻ đẹp thanh lịch/tự nhiên/lãng mạn/mạnh mẽ/sắc sảo, Mức độ cách điệu, Mức độ trưởng thành, Mức độ mềm mại, Mức độ chuyển động, Ấn tượng khi nhìn xa/gần, Cách hỗ trợ thần thái/tính cách)

[03. SKULL CONSTRUCTION]
(Phải mô tả: Hình khối hộp sọ, Đỉnh đầu, Xương trán, Vùng thái dương, Sau đầu, Gáy, Vị trí tai, Cách tóc bọc quanh hộp sọ, Khoảng cách da đầu và khối tóc, Vùng ép sát/có volume)

[04. HAIRLINE DESIGN]
(Phải mô tả: Độ cao chân tóc, Đường cong chân tóc, Điểm giữa trán, Góc thái dương, Sideburn, Chân tóc gần tai/gáy, Mật độ tóc con, Mức độ bất đối xứng, Cách thay đổi theo góc camera)

[05. PARTING & ROOT DIRECTION]
(Phải xác định: Vị trí ngôi tóc, Độ rộng ngôi, Hướng tóc mọc, Vị trí xoáy tóc, Hướng rẽ mái, Độ nâng chân tóc, Vùng root lift, Vùng tóc nằm sát, Cách chân tóc chuyển khối, Cách giữ ngôi khi có gió)

[06. PRIMARY HAIR MASS ARCHITECTURE]
(Phải chia rõ: Khối mái, Khối tóc trái/phải, Khối sau đầu, Khối phủ vai, Khối rơi trước ngực/sau lưng, Khối gần/xa camera, Trọng lượng từng khối, Điểm bắt/kết thúc, Quan hệ overlap. Đừng nói chung chung)

[07. SECONDARY CLUMP DESIGN]
(Phải xác định: Số lượng nhóm tóc trung bình, Kích thước, Hướng cong, Độ xoắn, Độ taper, Overlap, Khoảng âm giữa các mảng, Điểm phá nhịp, Mảng đơn giản/chi tiết)

[08. SILHOUETTE DESIGN]
(Phải xác định: Silhouette tổng, Điểm rộng/hẹp nhất, Nhịp phồng và thu, Đường cong chính/phụ, Vùng tóc phá silhouette, Vùng giữ sạch, Quan hệ với khuôn mặt/vai/cổ/negative space)

[09. FACE-FRAMING HAIR]
(Phải xác định: Mái che trán bao nhiêu, Tóc che mắt hay không, Lọn tóc ôm má/hàm, Khoảng hở quanh mặt, Cách làm nổi bật mắt/hỗ trợ mặt, Vùng tuyệt đối không che biểu cảm)

[10. HAIR FLOW & PHYSICS]
(Phải xác định: Trọng lực, Hướng chuyển động, Ảnh hưởng pose/tốc độ/gió, Độ trễ tóc, Quán tính khối nặng, Chuyển động lọn nhẹ/tóc con, Vùng giữ bởi vai/trang phục, Phản ứng môi trường. Không mặc định tóc bay)

[11. AGE-APPROPRIATE HAIR DESIGN]
(Phải kiểm tra: Đúng tuổi không, Tỉ lệ tóc/đầu, Độ phồng, Mức trưởng thành/trẻ con, Phụ kiện, Kiểu mái, Độ bóng, Mức độ cầu kỳ)

[12. PERSONALITY-BASED HAIR DIRECTION]
(Tính cách chuyển thành: Độ gọn gàng/tự nhiên, Mức độ chủ động tạo kiểu, Cách chăm sóc, Phản ứng tình huống, Mức che mặt, Kiểm soát/buông lỏng)

[13. EMOTIONAL HAIR BEHAVIOR]
(Tóc hỗ trợ cảm xúc bằng: Nhịp đường cong, Độ căng/rơi, Mức che mặt/chuyển động, Silhouette, Ánh sáng)

[14. HAIR LINE-ART DNA]
(Mô tả: Loại/màu nét, Độ dày silhouette/nét trong/phía sáng/tối, Nét gần/xa camera, Taper đầu/cuối, Độ rung, Texture, Stroke rhythm, Cách line ôm form, Lost edge, Tránh outline đen toàn bộ)

[15. HAIR SKETCH TECHNIQUE]
(Mô tả: Brush sketch, Kích thước, Opacity, Flow, Pressure, Smoothing, Cách dựng hộp sọ/khối tóc, Sửa trước khi clean line)

[16. HAIR CLEAN-LINE TECHNIQUE]
(Mô tả: Đầu/ngòi bút, Pressure-size/opacity, Stabilization, Stroke dài/ngắn, Cách vẽ đường cong/tách khối/tóc con/giữ sống động)

[17. HAIR BRUSH SYSTEM]
(Xác định: Brush dựng khối/line-art/flat color/shadow/blending/highlight/texture/tóc con. Mỗi brush cần: Hình dạng, Độ cứng, Flow, Opacity, Pressure, Texture, Stabilization, Vùng dùng/không dùng)

[18. BASE COLOR STRUCTURE]
(Xác định: Hue/Value/Saturation chính, Nhiệt độ màu, Màu chân/thân/ngọn tóc, Variation nhỏ, Giữ Canon dưới ánh sáng)

[19. VALUE ARCHITECTURE]
(Xác định: Vùng tối/sáng nhất, Mid-tone chính, Core shadow, Cast shadow, Ambient occlusion, Bóng giữa khối/gần chân tóc/dưới mái/lên mặt/cổ/trang phục, Tách value với background)

[20. HAIR SHADING METHOD]
(Chọn/giải thích: Cel-shading/Painterly/Watercolor/Graphic/Mixed. Rõ: Mảng bóng bắt đầu ở đâu, Cạnh cứng/mềm, Màu bóng, Cách ôm form, Vùng blur/detail/giản lược)

[21. HAIR COLOR TRANSITIONS]
(Mô tả: Chuyển base sang shadow, Shadow sang reflected light, Mid-tone sang highlight, Nhiệt độ sáng/tối, Color variation môi trường)

[22. HIGHLIGHT DESIGN]
(Xác định: Nguồn sáng, Loại, Vị trí, Hướng, Độ rộng/dài, Độ đứt đoạn, Màu, Opacity, Hard/Soft edge, Highlight mảng trước/sau/theo độ cong. Không mặc định angel-ring)

[23. RIM LIGHT & BACKLIGHT]
(Xác định: Cần không, Nguồn sáng, Màu, Độ dày, Vùng xuất hiện/ngắt)

[24. ENVIRONMENTAL COLOR RESPONSE]
(Tóc nhận màu từ: Bầu trời, Tường, Nền, Trang phục, Ánh sáng phụ, Không khí. Giới hạn contamination)

[25. HAIR MATERIAL]
(Mô tả: Độ mềm/nặng/mượt/khô/ẩm, Matte/glossy, Cạnh tóc thay đổi, Phản ứng ánh sáng, Phân biệt với da/vải)

[26. STRAND-LEVEL DETAIL]
(Xác định: Vùng phép có sợi đơn, Số lượng, Độ dài/dày/tương phản/hướng/màu, Vùng cấm)

[27. FLYAWAYS CONTROL]
(Xác định: Cần không, Lý do, Vị trí, Số lượng, Hướng, Độ sáng, Mức độ nét. Không mặc định ethereal flyaways)

[28. HAIR & CAMERA]
(Xác định: Góc camera, Khối gần/xa camera, Foreshortening, Overlap, Vùng nét/mềm nhất, Thay đổi theo cỡ cảnh, Tránh che mắt)

[29. HAIR & COMPOSITION]
(Xác định: Vai trò eye path, Tóc dẫn mắt về đâu, Cân bằng nhân vật/background, Chiếm negative space, Tương tác typography, Vùng không che chữ/mặt/vượt frame)

[30. HAIR & UI INTEGRATION]
(Xác định: Vùng UI an toàn, Khoảng cách với chữ, Tóc phá frame không, Nằm dưới/trên graphic, Shadow giữa tóc/UI)

[31. REFERENCE TECHNIQUE ASSIMILATION]
(Xác định: Kỹ thuật học từ ảnh tham chiếu, Cách áp dụng)
[/CARD_CONTENT]

[POSITIVE_CONSTRAINTS]
(Bắt buộc tối thiểu 30 ràng buộc - Positive constraints)
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
(Bắt buộc tối thiểu 40 lỗi cấm - Negative constraints)
[/NEGATIVE_CONSTRAINTS]

[FINAL_VALIDATION]
(Bắt buộc tối thiểu 30 tiêu chí kiểm tra - Final validation criteria)
[/FINAL_VALIDATION]

[FINAL_PROMPT]
(Một Final Hair Prompt hoàn chỉnh, độ dài tối thiểu 1.200 từ, thống nhất và có thể sao chép sử dụng ngay)
[/FINAL_PROMPT]
[CARD_END]\`;
  } else if (c.id === 'cinematic_visual_art') {`);
}

// Add instructions for standard cards to also include structure mandate for beautiful_hair_art
const instructionRegex = /Note: For the specialized cards 'beautiful_hair_art', 'cinematic_visual_art', and 'mistake_prevention_card', DO NOT use these 18 parts, but strictly use the specific structures \[CARD_START\], \[CARD_CONTENT\], \[POSITIVE_CONSTRAINTS\], \[NEGATIVE_CONSTRAINTS\], \[FINAL_PROMPT\], \[CARD_END\] defined for them earlier/g;
if (instructionRegex.test(code)) {
    code = code.replace(instructionRegex, `Note: For the specialized cards 'beautiful_hair_art', 'cinematic_visual_art', and 'mistake_prevention_card', DO NOT use these 18 parts, but strictly use the specific structures [CARD_START], [CARD_CONTENT], [POSITIVE_CONSTRAINTS], [NEGATIVE_CONSTRAINTS], [FINAL_VALIDATION] (if applicable), [FINAL_PROMPT], [CARD_END] defined for them earlier`);
}


fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', code);
console.log("Updated hair card structure");
