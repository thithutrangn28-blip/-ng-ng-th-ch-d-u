const fs = require('fs');
const html = fs.readFileSync('data.html', 'utf8');
const regex = /<span class="badge">PHÒNG (\d+)<\/span>([^<]+)<\/h2>[\s\S]*?data-copy="([^"]+)"/g;
let match;
const rooms = [];
while ((match = regex.exec(html)) !== null) {
  const roomNum = match[1];
  const title = match[2];
  const copyData = match[3];
  
  // Unescape unicode and newlines
  let unescaped = copyData.replace(/\\u([0-9a-fA-F]{4})/g, (m, c) => String.fromCharCode(parseInt(c, 16))).replace(/\\n/g, '\n');
  const parts = unescaped.split('\n\n');
  const purpose = parts[1] ? parts[1].replace(/\n/g, ' ') : '';
  
  // generate short code
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 30);
  const words = title.split(' ');
  const shortCode = 'RM' + roomNum;
  
  rooms.push({ roomNum, key, title, purpose, shortCode });
}

console.log("MAP_SHORT_TO_LONG additions:");
rooms.forEach(r => {
  console.log(`  ${r.shortCode}: "${r.key}",`);
});

console.log("\nROOM_META_INFO additions:");
rooms.forEach(r => {
  console.log(`  ${r.key}: { title: "${r.title}", purpose: "${r.purpose.substring(0, 150)}..." },`);
});
