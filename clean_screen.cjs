const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/LipstickAppScreen.tsx', 'utf8');

// The file might be in a broken state. Let's find `<ErrorBoundary>` and `</ErrorBoundary>` and replace everything inside.
const startIdx = code.indexOf('<ErrorBoundary>') + '<ErrorBoundary>'.length;
const endIdx = code.lastIndexOf('</ErrorBoundary>');

let content = code.substring(startIdx, endIdx);

// Remove existing `{currentView === "..." && (` wrappers if any
content = content.replace(/\{currentView === "gallery" && \(\s*<>\s*/g, '<div style={{ display: currentView === "gallery" ? "block" : "none" }}>\n');
content = content.replace(/\{currentView === "gallery" && \(\s*<div/g, '<div'); // if already there

// find end of gallery
content = content.replace(/<\/section>\s*<\/>\s*\)\}/g, '</section>\n</div>');

// drawer
content = content.replace(/\{currentView === "drawer" && currentStory && \(\s*<>\s*/g, '<div style={{ display: currentView === "drawer" ? "block" : "none" }}>\n{currentStory && (\n<>\n');
// end of drawer
// Note: it is followed by `{currentView === "room"`

content = content.replace(/<\/section>\s*<\/>\s*\)\}\s*\{currentView === "room" && currentRoomId && roomDef && currentRoomState && \(/g, 
`</section>\n</>\n)}\n</div>\n<div style={{ display: currentView === "room" ? "block" : "none" }}>\n{currentRoomId && roomDef && currentRoomState ? (`);

content = content.replace(/onOpenStoryForm=\{\(\) => setShowStoryForm\(currentStory\?\.id \|\| state\.stories\.find\(s => s\.active\)\?\.id\)\}\s*\/>\s*\)\}/g,
`onOpenStoryForm={() => setShowStoryForm(currentStory?.id || state.stories.find(s => s.active)?.id)}\n/>\n) : null}\n</div>`);

// wait, the previous python script made it look like:
// `</div>` `</div>` `</ErrorBoundary>`

fs.writeFileSync('clean_screen.txt', content);
console.log("Extracted");
