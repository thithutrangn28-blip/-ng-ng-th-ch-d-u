const fs = require('fs');

let content = fs.readFileSync('src/lib/room-tasks-catalogs-data.ts', 'utf8');

const roomNamesMatch = content.match(/const ROOM_NAMES: Record<string, string> = {([\s\S]*?)};\n/);
if (!roomNamesMatch) {
    console.log("Could not find ROOM_NAMES");
    process.exit(1);
}
const roomNamesStr = roomNamesMatch[1];
const roomNames = {};
roomNamesStr.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts[1].trim().replace(/,$/, '').replace(/^"|"$/g, '');
        roomNames[key] = value;
    }
});

const metaInfoMatch = content.match(/const ROOM_META_INFO: Record<string, { title: string; purpose: string }> = {([\s\S]*?)};\n/);
if (!metaInfoMatch) {
    console.log("Could not find ROOM_META_INFO");
    process.exit(1);
}
const metaInfoStr = metaInfoMatch[1];

let newMetaInfoStr = metaInfoStr;
if (newMetaInfoStr.trim().endsWith(',')) {
    // it already has a trailing comma, fine
} else {
    // add a trailing comma to the last entry
    newMetaInfoStr = newMetaInfoStr.trimEnd() + ',\n';
}

let modified = false;

for (const key in roomNames) {
    if (!newMetaInfoStr.includes(`  ${key}: {`)) {
        const title = roomNames[key];
        const purpose = `Chuyên môn hóa về ${title}`;
        newMetaInfoStr += `  ${key}: { title: "${title}", purpose: "${purpose}" },\n`;
        modified = true;
    }
}

if (modified) {
    // Remove trailing comma from last line
    newMetaInfoStr = newMetaInfoStr.replace(/,\n$/, '\n');
    let newContent = content.replace(metaInfoMatch[1], newMetaInfoStr);
    
    fs.writeFileSync('src/lib/room-tasks-catalogs-data.ts', newContent);
    console.log("Added missing META_INFO entries.");
} else {
    console.log("No missing META_INFO entries.");
}

