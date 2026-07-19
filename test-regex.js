let val = `95. Length & Silhouette: Extreme length (calf-level), massive spread.
Mô tả: Đen nhánh, dài vô tận tản rộng.
Tác dụng: Đặc điểm nhận dạng cốt lõi.
Liên hệ: Vãn Ninh profile + Tóc floating (Img 4).

Another test:
12. Pose: Sitting on the chair (Img 1, 4)
Mô tả: Ngồi thư giãn. (Image 2)
Tác dụng: Tạo dáng.
Liên hệ: Ảnh 2, Image 1`;

val = val.replace(/^[ \t]*Liên hệ:.*(?:\r?\n|$)/gmi, "");
val = val.replace(/\s*\(?(?:Img|Image|Reference Image|Ảnh|Reference)\s*[\d,\s]+\)?/gi, "");

console.log(JSON.stringify(val));
