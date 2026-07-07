const fs = require('fs');
const file = 'src/screens/lipstick-prompt/RoomView.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const out = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('<textarea') && lines[i+1]?.includes('value={cs.note}') && lines[i+7]?.includes('forceUpdate();')) {
    out.push(`                    <CardNoteInput cs={cs} c={c} roomState={roomState} state={state} save={save} />`);
    i += 10; // skip the textarea definition
  } else {
    out.push(lines[i]);
    i++;
  }
}
fs.writeFileSync(file, out.join('\n'));
console.log("Patched");
