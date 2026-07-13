import re

file_path = "src/screens/prompt-studio/Prompt10CardSplitter.tsx"

with open(file_path, "r") as f:
    content = f.read()

content = content.replace("const targetLen = Math.ceil(totalLen / 4);", "const targetLen = Math.ceil(totalLen / 10);")
content = content.replace("for (let i = 0; i < 4; i++) {", "for (let i = 0; i < 10; i++) {")
content = content.replace("onToast(`💖 Đã sao chép Thẻ ${idx + 1} / 4 cho Vợ yêu!`);", "onToast(`💖 Đã sao chép Thẻ ${idx + 1} / 10 cho Vợ yêu!`);")
content = content.replace("const cycleIndex = globalCopyCycle % 4;", "const cycleIndex = globalCopyCycle % 10;")
content = content.replace("onToast(`✅ Đã sao chép tổng thể: Phần ${cycleIndex + 1}/4 (25% nội dung) cho Vợ yêu!`);", "onToast(`✅ Đã sao chép tổng thể: Phần ${cycleIndex + 1}/10 (10% nội dung) cho Vợ yêu!`);")
content = content.replace("📋 Sao Chép Tổng Thể (Phần {(globalCopyCycle % 4) + 1}/4)", "📋 Sao Chép Tổng Thể (Phần {(globalCopyCycle % 10) + 1}/10)")
content = content.replace("trích 25% nội dung mỗi lần (chu kỳ 4 lần)", "trích 10% nội dung mỗi lần (chu kỳ 10 lần)")
content = content.replace("Lưới 4 Thẻ Phân Đoạn", "Lưới 10 Thẻ Phân Đoạn")
content = content.replace("Thẻ {idx + 1}: Phần {idx * 25}% - {(idx + 1) * 25}% Nội Dung", "Thẻ {idx + 1}: Phần {idx * 10}% - {(idx + 1) * 10}% Nội Dung")

with open(file_path, "w") as f:
    f.write(content)
