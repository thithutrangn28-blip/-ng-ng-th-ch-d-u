const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const regex1 = /\} else if \(c\.id === 'beautiful_hair_art'\) \{[\s\S]*?\} else if \(c\.id === 'mistake_prevention_card'\) \{[\s\S]*?return `\[CARD_ID: mistake_prevention_card\][\s\S]*?`;\n  \}/;

const replacement = `} else if (c.id === 'beautiful_hair_art') {
    return \`[CARD_START]
[CARD_ID: beautiful_hair_art]
[CARD_TITLE: Tóc xinh đẹp ♥︎]

[CARD_CONTENT]
(Write the deep analysis of hair here following the specific categories: CHARACTER & HAIR IDENTITY, BEAUTY DIRECTION, SKULL & HAIRLINE, PARTING & ROOT DIRECTION, PRIMARY HAIR MASSES, HAIR SILHOUETTE, CLUMP DESIGN, HAIR FLOW & MOVEMENT, FACE-FRAMING HAIR, HAIR LINE-ART, HAIR DIGITAL BRUSH, HAIR COLOR, HAIR SHADING, HAIR HIGHLIGHT, HAIR MATERIAL, HAIR & CAMERA, HAIR & COMPOSITION, REFERENCE ADAPTATION)
[/CARD_CONTENT]

[FINAL_PROMPT]
(Write the highly detailed, production-ready English prompt for generating the hair based on the above analysis. Do NOT leave this empty! Must be a long, complete description!)
[/FINAL_PROMPT]

[POSITIVE_CONSTRAINTS]
(List the mandatory positive features)
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
(List the forbidden errors and mistakes to avoid)
[/NEGATIVE_CONSTRAINTS]
[CARD_END]\`;
  } else if (c.id === 'cinematic_visual_art') {
    return \`[CARD_START]
[CARD_ID: cinematic_visual_art]
[CARD_TITLE: Góc chụp Điện ảnh]

[CARD_CONTENT]
(Write the deep analysis of cinematic direction here, including camera angle, lighting, framing, lens, visual flow, color grading, perspective, and composition)
[/CARD_CONTENT]

[FINAL_PROMPT]
(Write the highly detailed, production-ready English prompt for the cinematic visual direction. Do NOT leave this empty!)
[/FINAL_PROMPT]

[POSITIVE_CONSTRAINTS]
(List the mandatory positive visual features)
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
(List the forbidden visual errors to avoid)
[/NEGATIVE_CONSTRAINTS]
[CARD_END]\`;
  } else if (c.id === 'mistake_prevention_card') {
    return \`[CARD_START]
[CARD_ID: mistake_prevention_card]
[CARD_TITLE: Phòng tránh lỗi]

[CARD_CONTENT]
(Write the deep analysis of mistake prevention here, including anatomy errors, hand mutation, dead eyes, plastic skin, stiff poses, messy backgrounds, and how to strictly prevent them)
[/CARD_CONTENT]

[FINAL_PROMPT]
(Write the highly detailed, production-ready English negative prompt and guardrails. Do NOT leave this empty!)
[/FINAL_PROMPT]

[POSITIVE_CONSTRAINTS]
(List the mandatory positive structural defenses)
[/POSITIVE_CONSTRAINTS]

[NEGATIVE_CONSTRAINTS]
(List the absolute forbidden AI generation errors)
[/NEGATIVE_CONSTRAINTS]
[CARD_END]\`;
  }`;

if (regex1.test(code)) {
    code = code.replace(regex1, replacement);
    fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', code);
    console.log('Patched successfully!');
} else {
    console.log('Regex did not match!');
}
