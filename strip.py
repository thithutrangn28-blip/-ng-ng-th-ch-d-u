import re

with open("src/screens/lipstick-prompt/RoomView.tsx", "r") as f:
    content = f.read()

# We want to remove everything from `hetic styling` up to `### MANDATORY OUTPUT STRUCTURE & RULES`
pattern = re.compile(r'hetic styling.*?### MANDATORY OUTPUT STRUCTURE & RULES', re.DOTALL)

if pattern.search(content):
    content = pattern.sub('### MANDATORY OUTPUT STRUCTURE & RULES', content)
    with open("src/screens/lipstick-prompt/RoomView.tsx", "w") as f:
        f.write(content)
    print("Done")
else:
    print("Not found")

