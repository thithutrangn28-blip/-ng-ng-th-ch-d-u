const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf8');

const anchor1 = '"Structure your output EXACTLY like this, with 10 cards:\\n\\n" +';
const anchor2 = '"[prompt slide 10]" : isComicMode';

const start = content.indexOf(anchor1);
const end = content.indexOf(anchor2, start);

if (start !== -1 && end !== -1) {
  const toReplace = content.substring(start + anchor1.length, end + '"[prompt slide 10]"'.length);
  const newStr = `"[CARD_ID: slide-1]\\n### THẺ 01 — [Chủ đề Slide 1]\\n[FINAL PROMPT]\\n[Nội dung prompt slide 1]\\n\\n" +
"[CARD_ID: slide-2]\\n### THẺ 02 — [Chủ đề Slide 2]\\n[FINAL PROMPT]\\n[Nội dung prompt slide 2]\\n\\n" +
"...\\n\\n" +
"[CARD_ID: slide-10]\\n### THẺ 10 — [Chủ đề Slide 10]\\n[FINAL PROMPT]\\n[Nội dung prompt slide 10]"`;
  
  content = content.replace(toReplace, newStr);
  fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content);
  console.log("Patched successfully!");
} else {
  console.log("Not found anchors");
}
