const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const targetVocab = `"🚨 MANDATE #5: HIGH-END PROFESSIONAL ART & PHOTOGRAPHY VOCABULARY (QUY TẮC SỬ DỤNG TỪ VỰNG CHUYÊN NGÀNH NGHỆ THUẬT/NHIẾP ẢNH CAO CẤP) 🚨: You are an elite, world-class art director. You MUST NOT use basic, generic vocabulary (like 'beautiful dress' or 'nice pose'). You MUST use advanced, highly professional terminology for:\\n" +`;

const replaceVocab = `"🚨 MANDATE #5: HIGH-END PROFESSIONAL ART & PHOTOGRAPHY VOCABULARY (QUY TẮC SỬ DỤNG TỪ VỰNG CHUYÊN NGÀNH NGHỆ THUẬT/NHIẾP ẢNH CAO CẤP) 🚨: You are an elite, world-class art director and cinematographer. You MUST NOT use basic, superficial, or generic vocabulary (like 'beautiful dress', 'nice pose', or 'good lighting'). YOU MUST USE ADVANCED, HIGHLY PROFESSIONAL, AND DEEPLY TECHNICAL TERMINOLOGY. Your analysis and prompt must reflect extreme artistic expertise for:\\n" +`;

if (content.includes(targetVocab)) {
    content = content.replace(targetVocab, replaceVocab);
    console.log("Replaced targetVocab");
} else {
    console.log("Could not find targetVocab");
}

fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content, 'utf-8');
console.log("Fixed vocab mandate");
