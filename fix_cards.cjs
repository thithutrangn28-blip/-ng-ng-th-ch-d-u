const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const regexCards = /\} else if \(c\.id === 'beautiful_hair_art'\) \{[\s\S]*?\[NEGATIVE_CONSTRAINTS\]\[CARD_END\]`;\n  \}/;

const replacement = `} else if (c.id === 'beautiful_hair_art') {
    return \`[CARD_START]
[CARD_ID: beautiful_hair_art]
[CARD_TITLE: TÓC XINH ĐẸP ♥︎]

[CARD_CONTENT]
[CHARACTER & HAIR IDENTITY]
Phân tích nhận diện tóc nhân vật.

[BEAUTY DIRECTION]
Định hướng thẩm mỹ.

[SKULL & HAIRLINE]
Hộp sọ và đường chân tóc.

[PARTING & ROOT DIRECTION]
Ngôi tóc và hướng chân tóc.

[PRIMARY HAIR MASSES]
Các khối tóc chính.

[HAIR SILHOUETTE]
Hình dáng tổng thể.

[CLUMP DESIGN]
Thiết kế lọn tóc.

[HAIR FLOW & MOVEMENT]
Độ chảy và chuyển động.

[FACE-FRAMING HAIR]
Tóc mái và phần ôm mặt.

[HAIR LINE-ART]
Nét vẽ tóc.

[HAIR DIGITAL BRUSH]
Cọ vẽ tóc kỹ thuật số.

[HAIR COLOR]
Màu sắc tóc.

[HAIR SHADING]
Đổ bóng tóc.

[HAIR HIGHLIGHT]
Phần sáng của tóc.

[HAIR MATERIAL]
Chất liệu tóc.

[HAIR & CAMERA]
Tóc và góc máy.

[HAIR & COMPOSITION]
Tóc và bố cục.

[REFERENCE ADAPTATION]
Áp dụng reference.
[/CARD_CONTENT]

[POSITIVE_CONSTRAINTS]
Danh sách bắt buộc phải có.
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
Danh sách lỗi và nội dung cấm.
[/NEGATIVE_CONSTRAINTS]

[FINAL_PROMPT]
Một Final Hair Prompt hoàn chỉnh, dài, thống nhất và có thể sao chép sử dụng ngay.
[/FINAL_PROMPT]
[CARD_END]\`;
  } else if (c.id === 'cinematic_visual_art') {
    return \`[CARD_START]
[CARD_ID: cinematic_visual_art]
[CARD_TITLE: GÓC CHỤP / KỸ THUẬT SỐ / CAMERA / MÀU SẮC / TỈ LỆ / ĐIỆN ẢNH / THỊ GIÁC / BỐ CỤC / HỘI HỌA]

[CARD_CONTENT]
[VISUAL INTENT]
Nội dung cụ thể.

[PAINTING LANGUAGE]
Nội dung cụ thể.

[DIGITAL TECHNIQUE]
Nội dung cụ thể.

[CAMERA PURPOSE]
Nội dung cụ thể.

[CAMERA ANGLE]
Nội dung cụ thể.

[SHOT TYPE]
Nội dung cụ thể.

[LENS & FOCAL IMPRESSION]
Nội dung cụ thể.

[CAMERA DISTANCE]
Nội dung cụ thể.

[PERSPECTIVE]
Nội dung cụ thể.

[BODY SCALE & PROPORTION]
Nội dung cụ thể.

[POSE & GESTURE]
Nội dung cụ thể.

[CHARACTER PLACEMENT]
Nội dung cụ thể.

[COMPOSITION SYSTEM]
Nội dung cụ thể.

[VISUAL HIERARCHY & EYE PATH]
Nội dung cụ thể.

[NEGATIVE SPACE]
Nội dung cụ thể.

[SPATIAL LAYERS]
Nội dung cụ thể.

[CINEMATIC BLOCKING]
Nội dung cụ thể.

[LIGHTING DESIGN]
Nội dung cụ thể.

[CINEMATIC CONTRAST]
Nội dung cụ thể.

[COLOR SCRIPT]
Nội dung cụ thể.

[HUE HIERARCHY]
Nội dung cụ thể.

[VALUE HIERARCHY]
Nội dung cụ thể.

[SATURATION HIERARCHY]
Nội dung cụ thể.

[COLOR GRADING]
Nội dung cụ thể.

[MATERIAL RESPONSE]
Nội dung cụ thể.

[UI & GRAPHIC COMPOSITION]
Nội dung cụ thể.

[VISUAL STORYTELLING]
Nội dung cụ thể.
[/CARD_CONTENT]

[POSITIVE_CONSTRAINTS]
Danh sách bắt buộc phải có.
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
Danh sách lỗi và nội dung cấm.
[/NEGATIVE_CONSTRAINTS]

[FINAL_PROMPT]
Một Final Cinematic Visual Prompt hoàn chỉnh, dài, thống nhất và có thể sao chép sử dụng ngay.
[/FINAL_PROMPT]
[CARD_END]\`;
  } else if (c.id === 'mistake_prevention_card' || c.id === 'error_prevention') {
    return \`[CARD_START]
[CARD_ID: mistake_prevention_card]
[CARD_TITLE: PHÒNG TRÁNH LỖI]

[CARD_CONTENT]
[ERROR ANALYSIS]
Phân tích lỗi.

[ROOT CAUSE]
Nguyên nhân.

[CORRECTION STRATEGY]
Cách sửa.
[/CARD_CONTENT]

[POSITIVE_CONSTRAINTS]
Danh sách Positive Defense.
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
Danh sách Negative Defense.
[/NEGATIVE_CONSTRAINTS]

[FINAL_PROMPT]
Một Final Error-Prevention Prompt hoàn chỉnh, dài, thống nhất và có thể sao chép sử dụng ngay.
[/FINAL_PROMPT]
[CARD_END]\`;
  }`;

if (regexCards.test(code)) {
    code = code.replace(regexCards, replacement);
    fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', code);
    console.log('Patched successfully!');
} else {
    console.log('Regex did not match!');
}
