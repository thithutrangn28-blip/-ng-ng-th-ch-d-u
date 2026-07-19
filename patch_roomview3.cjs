const fs = require('fs');
const content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf8');

const regex = /"### THẺ 01 — \[Chủ đề Slide 1\]\\n".*"\[prompt slide 10\]"/g;
const newStr = `"[CARD_ID: slide-1]\\n### THẺ 01 — [Chủ đề Slide 1]\\n[FINAL PROMPT]\\n[Nội dung prompt slide 1]\\n\\n" +
"..." +
"[CARD_ID: slide-10]\\n### THẺ 10 — [Chủ đề Slide 10]\\n[FINAL PROMPT]\\n[Nội dung prompt slide 10]"`;

const modifiedContent = content.replace(
  '"### THẺ 01 — [Chủ đề Slide 1]\\n" +"[prompt slide 1]\\n\\n" +"### THẺ 02 — [Chủ đề Slide 2]\\n" +"[prompt slide 2]\\n\\n" +"...\\n\\n" +"### THẺ 10 — [Chủ đề Slide 10]\\n" +"[prompt slide 10]"',
  newStr
);

fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', modifiedContent);
console.log("Patched RoomView.tsx with CARD_ID");
