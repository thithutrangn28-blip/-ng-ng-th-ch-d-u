const fs = require('fs');
const file = 'src/screens/lipstick-prompt/RoomView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex2 = /<textarea\s+value=\{cs\.note\}\s+onChange=\{\(e\)\s*=>\s*\{\s*if\s*\(!roomState\.cards\[c\.id\]\)\s*\{\s*roomState\.cards\[c\.id\]\s*=\s*\{\s*note:\s*"",\s*refs:\s*\[\],\s*output:\s*""\s*\};\s*\}\s*roomState\.cards\[c\.id\]\.note\s*=\s*e\.target\.value;\s*forceUpdate\(\);\s*\}\}\s+placeholder=\{`Ví dụ yêu cầu cho \$\{c\.title\}\.\.\.`\}\s*\/>/s;

const replace2 = `<CardNoteInput cs={cs} c={c} roomState={roomState} state={state} save={save} />`;

if (regex2.test(content)) {
  content = content.replace(regex2, replace2);
  console.log("Replaced target2 with regex");
  fs.writeFileSync(file, content);
} else {
  console.log("Could not find target2 with regex");
}
