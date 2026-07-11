const fs = require('fs');
let content = fs.readFileSync('src/lib/room-tasks-catalogs-data.ts', 'utf8');

// The issue is that I keep deleting from 400 instead of 500.
// Let's just find the bad string at the end of the file.
let match = content.indexOf('};\uFFFD",');
if (match !== -1) {
    let start = match;
    let nextComment = content.indexOf('// Generate 100 unique tasks for each remaining room', start);
    if (nextComment !== -1) {
        let newContent = content.slice(0, start) + '};\n\n' + content.slice(nextComment);
        fs.writeFileSync('src/lib/room-tasks-catalogs-data.ts', newContent);
        console.log("Fixed!");
    } else {
        console.log("Could not find next comment");
    }
} else {
    console.log("Could not find bad string");
}
