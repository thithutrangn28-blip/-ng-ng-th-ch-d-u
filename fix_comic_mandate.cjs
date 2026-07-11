const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const comicTarget = `"🚨 MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨:`;

const comicReplace = `"🚨 SUPREME MANDATE #0: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and perfectly remember the entire Context Window! You must clearly know the room's setup rules, the room's name, the working card's purpose, the system prompt's instructions, the feature's requirements, the goal of the current item, the category of this item, what the app needs, how it works, what exact content to return, which room you are currently in, and what this specific item requires! Do NOT generate generic prompts. Apply highly specialized, advanced vocabulary (Manga, Webtoon, Comic Framing, Cinematic Angles) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\\n\\n" +
            "🚨 MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨:`;

if (content.includes(comicTarget)) {
    content = content.replace(comicTarget, comicReplace);
    console.log("Replaced comicTarget");
} else {
    console.log("Could not find comicTarget");
}

fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content, 'utf-8');
console.log("Fixed comic mandate 0");
