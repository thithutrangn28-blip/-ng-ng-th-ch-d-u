import os
import re

file_path = "src/screens/lipstick-prompt/RoomView.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Pattern to match the updateRefStatus function and its calls
pattern = r"""\s*// Khi gửi vào Context Windows, cập nhật toàn bộ ảnh sang trạng thái đã đọc thành công trên cả roomState, styleAnalyzer, workCards và botCharacters\s*const updateRefStatus = \(img: any\) => \{\s*if \(\!img\) return;\s*img\.analysisStatus = 'analyzed';\s*if \(\!img\.imageAnalysisText \|\| img\.imageAnalysisText === 'Chưa phân tích'\) \{\s*img\.imageAnalysisText = 'Đã đọc trực tiếp trong Context Windows';\s*\}\s*\};\s*allRefsList\.forEach\(updateRefStatus\);\s*orderedVisionRefs\.forEach\(updateRefStatus\);\s*allOutfitRefs\.forEach\(updateRefStatus\);"""

content = re.sub(pattern, "", content)

# Also fix the `baseAnalysisText` and `analysisText` that check for it
content = content.replace("r.imageAnalysisText === 'Đã đọc trực tiếp trong Context Windows' || ", "")

with open(file_path, "w") as f:
    f.write(content)

print("Removed updateRefStatus from RoomView.tsx")
