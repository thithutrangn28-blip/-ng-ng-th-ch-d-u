import re

with open("src/screens/lipstick-prompt/RoomView.tsx", "r") as f:
    content = f.read()

# Replace the broken join
# The broken string is `.length} images.`).join("\n") : "Chưa thiết lập."}` where it broke into two lines.

content = re.sub(r'images\.`\)\.join\("\\n"\)"\)\s*:\s*"Chưa thiết lập\."}', r'images.`).join("\\n") : "Chưa thiết lập."}', content)
content = re.sub(r'images\.`\)\.join\(".*?\)\s*:\s*"Chưa thiết lập\."}', r'images.`).join("\\n") : "Chưa thiết lập."}', content, flags=re.DOTALL)


with open("src/screens/lipstick-prompt/RoomView.tsx", "w") as f:
    f.write(content)
