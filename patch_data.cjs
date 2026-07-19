const fs = require('fs');
const content = fs.readFileSync('src/lib/lipstick-rooms-data.ts', 'utf8');

const newRoom = `,{
  id: "canva_presentation",
  icon: "📊",
  title: "CANVA PRESENTATION",
  subtitle: "10 Slide Canva Nối Tiếp",
  seed: 30,
  cards: [
    card("slide-1", "Slide 1: Mở Đầu (Title/Hook)", "Slide đầu tiên giới thiệu chủ đề mạnh mẽ", "slide 1 title hook opening intro"),
    card("slide-2", "Slide 2: Đặt Vấn Đề (Problem/Context)", "Trình bày vấn đề hoặc bối cảnh", "slide 2 context problem setting"),
    card("slide-3", "Slide 3: Giới Thiệu Nhân Vật (Character/Subject)", "Nhân vật chính", "slide 3 character introduction focus"),
    card("slide-4", "Slide 4: Diễn Biến 1 (Development A)", "Điểm phát triển đầu tiên", "slide 4 plot development action"),
    card("slide-5", "Slide 5: Cao Trào/Xung Đột (Climax/Conflict)", "Điểm nhấn trung tâm của câu chuyện", "slide 5 conflict climax turning point"),
    card("slide-6", "Slide 6: Phân Tích Chi Tiết (Deep Dive)", "Slide đi sâu vào một khía cạnh", "slide 6 detail analysis deep dive"),
    card("slide-7", "Slide 7: Thông Điệp/Ý Nghĩa (Message/Quote)", "Trích dẫn đắt giá, thông điệp lõi", "slide 7 quote message core value"),
    card("slide-8", "Slide 8: Diễn Biến 2 (Development B)", "Phần sau cao trào", "slide 8 aftermath resolution flow"),
    card("slide-9", "Slide 9: Tổng Kết (Summary/Vision)", "Tóm tắt lại hành trình", "slide 9 summary wrap up vision"),
    card("slide-10", "Slide 10: Call to Action (Outro)", "Kết thúc và kêu gọi hành động", "slide 10 outro call to action end")
  ]
}`;

const modifiedContent = content.replace(/\]\s*\}\s*\]\s*;\s*$/, ']}' + newRoom + '];\n');
fs.writeFileSync('src/lib/lipstick-rooms-data.ts', modifiedContent);
console.log("Patched lipstick-rooms-data.ts");
