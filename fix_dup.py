with open('src/screens/lipstick-prompt/RoomView.tsx', 'r') as f:
    content = f.read()
content = content.replace("analysisStatus: 'in_context',\n        storyId: currentStory.id,\n        id: imgId,", "analysisStatus: 'in_context',\n        id: imgId,")
with open('src/screens/lipstick-prompt/RoomView.tsx', 'w') as f:
    f.write(content)
