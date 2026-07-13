import os
file_path = "src/screens/lipstick-prompt/RoomView.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Fix for Style Analyzer images
old_style_analysis = """const analysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳')) 
     ? r.imageAnalysisText 
     : `👉 [IN-CONTEXT VISION MANDATE]: Ảnh tham chiếu phong cách này được đính kèm tại vị trí [ATTACHED IMAGE #${gIdx}] trong request! AI HÃY TỰ NHÌN TRỰC TIẾP vào ảnh đính kèm #${gIdx} bên dưới để học hỏi bảng màu, nét vẽ và chất liệu!`;"""

new_style_analysis = """const isPlaceholderStyle = r.imageAnalysisText === 'Đã đọc trực tiếp trong Context Windows' || r.imageAnalysisText === 'Chưa phân tích' || r.imageAnalysisText?.startsWith('⏳');
  const analysisText = (!isPlaceholderStyle && r.imageAnalysisText) 
     ? r.imageAnalysisText 
     : `👉 [IN-CONTEXT VISION MANDATE]: Ảnh tham chiếu phong cách này được đính kèm tại vị trí [ATTACHED IMAGE #${gIdx}] trong request! AI HÃY TỰ NHÌN TRỰC TIẾP vào ảnh đính kèm #${gIdx} bên dưới để học hỏi bảng màu, nét vẽ và chất liệu!`;"""

if old_style_analysis in content:
    content = content.replace(old_style_analysis, new_style_analysis)
else:
    print("Could not find old_style_analysis")

# Fix for Room Cards
old_card_analysis = """const baseAnalysisText = (r.imageAnalysisText && r.imageAnalysisText !== 'Chưa phân tích' && !r.imageAnalysisText.startsWith('⏳'))
      ? r.imageAnalysisText
      : `AI có khả năng quan sát hình ảnh, hãy phân tích trực tiếp [ATTACHED IMAGE #${gIdx}] và trích xuất các yếu tố thuộc phạm vi chức năng của thẻ "${c.title}"!`;"""

new_card_analysis = """const isPlaceholderCard = r.imageAnalysisText === 'Đã đọc trực tiếp trong Context Windows' || r.imageAnalysisText === 'Chưa phân tích' || r.imageAnalysisText?.startsWith('⏳');
    const baseAnalysisText = (!isPlaceholderCard && r.imageAnalysisText)
      ? r.imageAnalysisText
      : `AI có khả năng quan sát hình ảnh, hãy phân tích trực tiếp [ATTACHED IMAGE #${gIdx}] và trích xuất các yếu tố thuộc phạm vi chức năng của thẻ "${c.title}"!`;"""

if old_card_analysis in content:
    content = content.replace(old_card_analysis, new_card_analysis)
else:
    print("Could not find old_card_analysis")

with open(file_path, "w") as f:
    f.write(content)

print("Updated RoomView.tsx")
