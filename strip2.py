import re

with open("src/screens/lipstick-prompt/RoomView.tsx", "r") as f:
    content = f.read()

pattern = re.compile(r'### 🚨 MỆNH LỆNH TỔNG HỢP VÀ ĐIỀU PHỐI THỊ GIÁC \(VISUAL SYNTHESIS MANDATE\).*?### MANDATORY OUTPUT STRUCTURE & RULES', re.DOTALL)

if pattern.search(content):
    content = pattern.sub('### MANDATORY OUTPUT STRUCTURE & RULES', content)
    with open("src/screens/lipstick-prompt/RoomView.tsx", "w") as f:
        f.write(content)
    print("Done")
else:
    print("Not found")

