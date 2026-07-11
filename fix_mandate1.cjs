const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const target1 = `"🚨 SUPREME MANDATE #1: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and apply the 'ROOM DEFINITION & APP CONTEXT' provided in the context window. Do NOT generate generic prompts. You MUST know exactly what room you are in, the specific goal of this room, and apply the highly specialized vocabulary (Art, Photography, Cinematography, Styling) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\\n\\n" +`;

const replace1 = `"🚨 SUPREME MANDATE #1: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and perfectly remember the entire Context Window! You must clearly know the room's setup rules, the room's name, the working card's purpose, the system prompt's instructions, the feature's requirements, the goal of the current item, the category of this item, what the app needs, how it works, what exact content to return, which room you are currently in, and what this specific item requires! Do NOT generate generic prompts. Apply highly specialized, advanced vocabulary (Art, Photography, Cinematography, Styling) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\\n\\n" +`;

const comicTarget1 = `"🚨 MANDATE #1: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and apply the 'ROOM DEFINITION & APP CONTEXT' provided in the context window. Do NOT generate generic prompts. You MUST know exactly what room you are in, the specific goal of this room, and apply the highly specialized vocabulary (Manga, Webtoon, Comic Framing, Cinematic Angles) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\\n\\n" +`;

const comicReplace1 = `"🚨 MANDATE #1: CONTEXT WINDOW & ROOM MEMORY (QUY TẮC NHỚ RÕ TÊN PHÒNG VÀ YÊU CẦU CỦA APP) 🚨: You MUST actively read and perfectly remember the entire Context Window! You must clearly know the room's setup rules, the room's name, the working card's purpose, the system prompt's instructions, the feature's requirements, the goal of the current item, the category of this item, what the app needs, how it works, what exact content to return, which room you are currently in, and what this specific item requires! Do NOT generate generic prompts. Apply highly specialized, advanced vocabulary (Manga, Webtoon, Comic Framing, Cinematic Angles) required for this specific room's theme. Use the Context Window to its absolute fullest potential!\\n\\n" +`;


if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    console.log("Replaced target1");
} else {
    console.log("Could not find target1");
}

if (content.includes(comicTarget1)) {
    content = content.replace(comicTarget1, comicReplace1);
    console.log("Replaced comicTarget1");
} else {
    console.log("Could not find comicTarget1");
}

fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content, 'utf-8');
console.log("Fixed mandate 1");
