const fs = require('fs');
const file = 'src/screens/lipstick-prompt/RoomView.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const out = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('<CardNoteInput')) {
    out.push(lines[i]);
    // check if next lines are leftover textarea closing
    if (lines[i+1]?.includes('placeholder=') || lines[i+1]?.includes('></textarea>') || lines[i+1]?.includes('/>')) {
      i += 2; // skip the leftovers
    } else {
      i++;
    }
  } else if (lines[i].includes('placeholder=') && lines[i-1].includes('<CardNoteInput')) {
      // skip
      i++;
  } else {
    out.push(lines[i]);
    i++;
  }
}
fs.writeFileSync(file, out.join('\n'));
