const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const regex = /terminology for:\n" \+/g;
content = content.replace(regex, 'terminology for:\\n" +');
fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content, 'utf-8');
console.log("Fixed string literal");
