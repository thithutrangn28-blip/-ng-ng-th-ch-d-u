import re

file_path = "src/screens/lipstick-prompt/RoomView.tsx"

with open(file_path, "r") as f:
    content = f.read()

new_log = """    const pendingRefs = orderedVisionRefs.filter(
      r => !r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed'
    );
    
    if (orderedVisionRefs.length - pendingRefs.length > 0) {
      setApiSignals(prev => ({
        ...prev,
        stageDetail: `✅ Đã khôi phục thành công Context Windows của ${orderedVisionRefs.length - pendingRefs.length} ảnh tham chiếu cũ từ bộ nhớ!`
      }));
      await new Promise(resolve => setTimeout(resolve, 600));
    }
"""

content = content.replace("    const pendingRefs = orderedVisionRefs.filter(\n      r => !r.imageAnalysisText || r.imageAnalysisText === 'Chưa phân tích' || r.analysisStatus !== 'analyzed'\n    );", new_log)

with open(file_path, "w") as f:
    f.write(content)
