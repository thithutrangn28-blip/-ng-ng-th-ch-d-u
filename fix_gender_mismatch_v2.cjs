const fs = require('fs');
let content = fs.readFileSync('src/screens/lipstick-prompt/RoomView.tsx', 'utf-8');

const target1 = `"🚨 SUPREME MANDATE #2: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The user's Story Plot, Character Profile, and Lore hold absolute supreme authority over character identity (gender, facial features, hair/eye color, and story aura). IF THE REFERENCE IMAGE SHOWS A FEMALE BUT THE USER'S CHARACTER IS MALE, YOU MUST DRAW A MALE! Do NOT copy the gender, face, or inappropriate poses of the reference image. You must ONLY learn the art style, composition, lighting, outfit details, and camera angles, and apply them STRICTLY to the USER'S character. Reference images serve purely as visual study materials for aesthetics and structure, NOT for character identity!\\n\\n" +`;

const replace1 = `"🚨 SUPREME MANDATE #2: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The user's Story Plot, Character Profile, and Lore hold absolute supreme authority over character identity (gender, facial features, hair/eye color, aura, and story context). LƯU Ý CỰC KỲ QUAN TRỌNG: NẾU ẢNH THAM CHIẾU LÀ NỮ NHƯNG NHÂN VẬT TRONG TRUYỆN LÀ NAM (HOẶC NGƯỢC LẠI), BẠN BẮT BUỘC PHẢI VẼ ĐÚNG GIỚI TÍNH VÀ ĐẶC ĐIỂM CỦA NHÂN VẬT TRONG TRUYỆN! Không được sao chép nét nữ tính hay dáng điệu nữ tính của ảnh tham chiếu nếu nhân vật là nam. You must strictly prioritize and enforce the user's story and original character profile in all output panels! Reference images serve purely as visual study materials for aesthetics, style, and structure, NOT for character identity!\\n\\n" +`;

const target2 = `"🚨 SUPREME MANDATE #3: 100% LEARNING, ANALYSIS & TRANSFORMATION - SAME SPIRIT, NEW EXECUTION (QUY TẮC HỌC HỎI 100% - KHÔNG SAO CHÉP Y HỆT - GIỐNG THEO MỘT CÁCH KHÁC) 🚨: You are commanded to perform 100% deep visual study of every single attached reference image in the context window. Do NOT copy the reference character's identity blindly. Instead, STUDY and EXTRACT their deep visual DNA: exact camera perspective, framing, focal depth, clothing style/drape, fabric layering, material feel, dramatic volumetric lighting, color harmony, and structural composition. You MUST translate all studied visual elements into highly professional, advanced, descriptive natural language, transformatively applying them to serve the user's original character and plot (adjusting poses/gestures to fit the user's character's gender and personality). The generated prompt must produce an image with the EXACT same artistic masterwork quality and gorgeous styling details as the reference, but completely representing the user's bespoke story character—making it 'giống theo một cách khác' but 100% faithful to the aesthetic soul and layout of the reference material!\\n\\n" +`;

const replace2 = `"🚨 SUPREME MANDATE #3: 100% LEARNING, ANALYSIS & TRANSFORMATION - SAME SPIRIT, NEW EXECUTION (QUY TẮC HỌC HỎI 100% TỪ ẢNH NHƯNG ÁP DỤNG CHO NHÂN VẬT TRONG TRUYỆN) 🚨: You are commanded to perform 100% deep visual study of every single attached reference image. However, do NOT copy the reference character's identity, gender, or gender-specific poses. Instead, STUDY and EXTRACT their deep visual DNA: exact camera perspective, intersection of focal points, structural composition, framing, clothing style/drape, fabric layering, design aesthetics, dramatic volumetric lighting, and color harmony. You MUST translate all these studied visual elements into highly professional, descriptive natural language, transformatively applying them to serve the USER'S ORIGINAL CHARACTER (adjusting poses/gestures/outfit fits to match the character's true gender and story). The generated prompt must produce an image with the EXACT same artistic masterwork quality, layout, and gorgeous design styling details as the reference, but 100% completely representing the user's bespoke story character—'giống cấu trúc/nghệ thuật nhưng phải đúng nhân vật'!\\n\\n" +`;

if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    console.log("Replaced target1");
} else {
    console.log("Could not find target1");
}

if (content.includes(target2)) {
    content = content.replace(target2, replace2);
    console.log("Replaced target2");
} else {
    console.log("Could not find target2");
}


// Wait, I should also update it for isComicMode just in case.
const comicTarget1 = `"🚨 MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The user's original Story Plot, Character Profile, and Lore hold absolute supreme authority over character identity (gender, facial features, hair/eye color, aura, and story context). IF THE REFERENCE IMAGE SHOWS A FEMALE BUT THE USER'S CHARACTER IS MALE, YOU MUST DRAW A MALE! Do NOT copy the gender, face, or inappropriate poses of the reference image. You must ONLY learn the art style, composition, lighting, and camera angles, and apply them STRICTLY to the USER'S character. The reference images are purely aesthetic visual study materials ('tư liệu thị giác')!\\n\\n" +`;

const comicReplace1 = `"🚨 MANDATE #1: THE USER'S STORY & CHARACTER PROFILE ARE THE HIGHEST ABSOLUTE AUTHORITY (QUY TẮC TỐI CAO SỐ 1: BÁM SÁT TUYỆT ĐỐI CÂU CHUYỆN VÀ NHÂN VẬT GỐC CỦA VỢ YÊU) 🚨: The user's original Story Plot, Character Profile, and Lore hold absolute supreme authority over character identity (gender, facial features, hair/eye color, aura, and story context). LƯU Ý CỰC KỲ QUAN TRỌNG: NẾU ẢNH THAM CHIẾU LÀ NỮ NHƯNG NHÂN VẬT TRONG TRUYỆN LÀ NAM (HOẶC NGƯỢC LẠI), BẠN BẮT BUỘC PHẢI VẼ ĐÚNG GIỚI TÍNH VÀ ĐẶC ĐIỂM CỦA NHÂN VẬT TRONG TRUYỆN! Không được sao chép nét nữ tính hay dáng điệu nữ tính của ảnh tham chiếu nếu nhân vật là nam. You must strictly prioritize and enforce the user's story and original character profile in all output panels! The reference images are purely aesthetic visual study materials ('tư liệu thị giác')!\\n\\n" +`;

const comicTarget2 = `"🚨 MANDATE #2: 100% LEARNING & ADAPTATION - SAME ARTISTIC SOUL, NEW FORM (QUY TẮC HỌC HỎI 100% - GIỐNG THEO MỘT CÁCH KHÁC) 🚨: You are strictly commanded to perform 100% visual study and learning from the attached reference images. Do NOT copy the character in the reference blindly, but STUDY and EXTRACT their deep aesthetic DNA (camera perspective, lighting, color palette, outfit drape, composition, and line art quality). You MUST apply this studied DNA transformatively to serve the user's original story and character (adjusting body dynamics and postures to fit the character's true gender and personality)! The output MUST feel EXACTLY like the reference image's visual masterpiece level, but customized and reborn for the user's bespoke character and plot—making it 'giống theo một cách khác, giữ trọn vẹn tinh hoa nghệ thuật của ảnh tham chiếu'!\\n\\n" +`;

const comicReplace2 = `"🚨 MANDATE #2: 100% LEARNING & ADAPTATION - SAME ARTISTIC SOUL, NEW FORM (QUY TẮC HỌC HỎI 100% TỪ ẢNH NHƯNG ÁP DỤNG CHO NHÂN VẬT TRONG TRUYỆN) 🚨: You are strictly commanded to perform 100% visual study and learning from the attached reference images. Do NOT copy the reference character's identity, gender, or gender-specific poses. Instead, STUDY and EXTRACT their deep aesthetic DNA (camera perspective, intersection of focal points, structural composition, lighting, color palette, outfit style, and line art quality). You MUST apply this studied DNA transformatively to serve the USER'S ORIGINAL CHARACTER (adjusting body dynamics, postures, and outfits to match the character's true gender, story, and personality)! The output MUST feel EXACTLY like the reference image's visual masterpiece level, but customized and reborn for the user's bespoke character and plot—making it 'giống cấu trúc/nghệ thuật nhưng phải đúng nhân vật'!\\n\\n" +`;

if (content.includes(comicTarget1)) {
    content = content.replace(comicTarget1, comicReplace1);
    console.log("Replaced comicTarget1");
} else {
    console.log("Could not find comicTarget1");
}

if (content.includes(comicTarget2)) {
    content = content.replace(comicTarget2, comicReplace2);
    console.log("Replaced comicTarget2");
} else {
    console.log("Could not find comicTarget2");
}

fs.writeFileSync('src/screens/lipstick-prompt/RoomView.tsx', content, 'utf-8');
console.log("Fixed gender mismatch mandates v2");
