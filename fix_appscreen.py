import re

with open('src/screens/lipstick-prompt/LipstickAppScreen.tsx', 'r') as f:
    content = f.read()

# Gallery
content = content.replace(
    '{currentView === "gallery" && (\n          <>\n            <section className="hero">',
    '<div style={{ display: currentView === "gallery" ? \'block\' : \'none\' }}>\n            <section className="hero">'
)

content = content.replace(
    '            </section>\n          </>\n        )}\n        {currentView === "drawer" && currentStory && (\n          <>\n            <section className="hero">',
    '            </section>\n          </div>\n\n        <div style={{ display: currentView === "drawer" ? \'block\' : \'none\' }}>\n          {currentStory && (\n          <>\n            <section className="hero">'
)

content = content.replace(
    '            </section>\n          </>\n        )}\n        {currentView === "room" && currentRoomId && roomDef && currentRoomState && (\n          <RoomView ',
    '            </section>\n          </>\n          )}\n        </div>\n\n        <div style={{ display: currentView === "room" ? \'block\' : \'none\' }}>\n        {currentRoomId && roomDef && currentRoomState && (\n          <RoomView '
)

content = content.replace(
    '          />\n        )}',
    '          />\n        )}\n        </div>'
)


with open('src/screens/lipstick-prompt/LipstickAppScreen.tsx', 'w') as f:
    f.write(content)

print("done python appscreen")
