const fs = require('fs');
let code = fs.readFileSync('src/screens/lipstick-prompt/LipstickAppScreen.tsx', 'utf8');

// Undo the partial python script
code = code.replace(
  `<div style={{ display: currentView === "gallery" ? 'block' : 'none' }}>\n            <section className="hero">`,
  `{currentView === "gallery" && (\n          <>\n            <section className="hero">`
);
code = code.replace(
  `          />\n        )}</div>`,
  `          />\n        )}`
);

// Now apply proper changes for display:none
// Replace gallery opening
code = code.replace(
  `{currentView === "gallery" && (\n          <>`,
  `<div style={{ display: currentView === "gallery" ? "block" : "none" }}>`
);
// Replace gallery closing / drawer opening
code = code.replace(
  `            </section>\n          </>\n        )}\n        {currentView === "drawer" && currentStory && (\n          <>`,
  `            </section>\n        </div>\n        <div style={{ display: currentView === "drawer" ? "block" : "none" }}>`
);
// Replace drawer closing / room opening
code = code.replace(
  `            </section>\n          </>\n        )}\n        {currentView === "room" && currentRoomId && roomDef && currentRoomState && (\n`,
  `            </section>\n        </div>\n        <div style={{ display: currentView === "room" ? "block" : "none" }}>\n`
);
// Replace room closing
code = code.replace(
  `          />\n        )}`,
  `          />\n        </div>`
);

fs.writeFileSync('src/screens/lipstick-prompt/LipstickAppScreen.tsx', code);
console.log("Done");
