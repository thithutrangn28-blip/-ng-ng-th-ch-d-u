const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf8');

const targetStr = "${isComicMode ? `[FINAL PROMPT](Write the final production-ready COMIC / WEBTOON PAGE SCRIPT & PROMPT for \"${c.title}\" here.";

// I will just use regex to replace from "isComicMode" to "ANTI-GLITCH PROTOCOL"
