import { getRoomCatalog, getAllRoomCatalogs, validateRoomCatalog, RoomCatalog, RoomTask } from "./room-tasks-catalog";

export { getRoomCatalog, getAllRoomCatalogs, validateRoomCatalog, type RoomCatalog, type RoomTask };

export const rooms = [
  ["Story Workspace Intake", "Quản lý Context Window chung của câu chuyện đang chọn."],
  ["Zero Puppeteering", "Cấm bot nói thay, hành động thay, miêu tả nội tâm thay cho {{user}}."],
  ["Character Psychology", "Phân tích tâm lý, phản ứng, hành vi con người và logic cảm xúc của bot char."],
  ["Canon Consistency Lock", "Khóa canon, tính cách, địa vị, tài chính, nghề nghiệp, tuổi tác và continuity."],
  ["Knowledge Boundary", "Quản lý nhân vật được biết/chưa biết gì, nguồn gốc thông tin và chống toàn tri."],
  ["Narrator & POV Scope", "Khóa góc nhìn trần thuật, người dẫn chuyện, camera, không can thiệp vai {{user}}."],
  ["Pacing & Continuity", "Giữ slow-burn, không tua nhanh, không kết thúc cảnh sớm, không lặp cảnh cũ."],
  ["Common RP Writing Errors", "Kiểm tra lỗi nhại input, quyền lực rỗng, yêu quá nhanh, info-dump, lặp MBTI."],
  ["Full Character Profile Builder", "Tạo prompt hồ sơ nhân vật cực chi tiết."],
  ["Character Voice DNA", "Dấu vân tay giọng nói, syntax signature, dialogue temperature, care language."],
  ["Subtext / Silence / Status Speech", "Ẩn ý, im lặng có nghĩa, lời thoại đúng địa vị/nghề nghiệp/thân phận."],
  ["Final Output Contract", "Tổng hợp tất cả phòng thành Prompt Markdown hoàn chỉnh."],
  ["Active Presence", "Sự hiện diện chủ động của nhân vật trong từng cảnh."],
  ["Immediate Objectives", "Mục tiêu tức thời chi phối hành động hiện tại."],
  ["On-the-Spot Decisions", "Quyết định tại chỗ dựa trên dữ kiện đang có."],
  ["Natural Reflexes", "Phản xạ tự nhiên trước diễn biến bất ngờ."],
  ["Original Identity Maintenance", "Bản sắc gốc được duy trì trong mọi tương tác."],
  ["Contextual Behavior Variation", "Biến thiên hành vi theo hoàn cảnh mà không OOC."],
  ["Accurate Voice Dialogue", "Lời thoại đúng giọng, đúng lúc và đúng mức độ."],
  ["Subtext & Silence", "Hàm ý, khoảng dừng và những điều không nói thành lời."],
  ["Body Language & Gesture", "Ngôn ngữ cơ thể song hành cùng lời thoại."],
  ["Show, Don't Tell Action", "Hành động thực tế thay cho việc giải thích (Show, Don't Tell)."]
];

export function getTasks(roomIndex: number): RoomTask[] {
  const catalog = getRoomCatalog(roomIndex);
  return catalog.tasks;
}

