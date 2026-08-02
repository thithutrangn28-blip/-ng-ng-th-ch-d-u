const fs = require('fs');
const content = fs.readFileSync('src/lib/room-tasks-catalog.ts', 'utf8');
const match = content.match(/roomMetadata\.push/g);
console.log(match ? match.length : 0);
