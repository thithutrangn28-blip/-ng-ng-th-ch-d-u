with open('src/screens/lipstick-prompt/RoomView.tsx', 'r') as f:
    content = f.read()

idx = content.rfind('  );\n}')
if idx != -1:
    content = content[:idx + 6] + '\n'
    with open('src/screens/lipstick-prompt/RoomView.tsx', 'w') as f:
        f.write(content)
    print("Fixed EOF")
