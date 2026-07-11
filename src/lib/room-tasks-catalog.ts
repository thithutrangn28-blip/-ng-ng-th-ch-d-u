import { getRealTasksForRoom, ROOM_META_INFO } from "./room-tasks-catalogs-data";

export interface RoomTask {
  id: string;
  title: string;
  purpose: string;
  applyToStory?: string;
  requiredInputs?: string[];
  transformationRule?: string;
  outputRequirement: string;
  validationRule: string;
  forbiddenOutput?: string[];
  detailedInstruction: string;
  inputSources: string[];
  outputEffect: string;
  preventsError: string;
  desc?: string; // For compatibility
}

export interface RoomCatalog {
  roomId: string;
  roomName: string;
  roomPurpose: string;
  roomOutputGoal: string;
  roomInputDependencies: string[];
  roomForbiddenBehaviors: string[];
  roomOutputContract: string;
  tasks: RoomTask[];
}

const baseRoomMetadata = [
  {
    id: "SWI",
    name: "Story Workspace Intake",
    purpose: "Quản lý Context Window chung của câu chuyện đang chọn, tiếp nhận bối cảnh, logline, timeline và canon quan trọng.",
    goal: "Dựng khung Prompt Markdown tiếp nhận và xử lý toàn bộ dữ liệu đầu vào của câu chuyện mà không làm thất thoát chi tiết.",
    deps: ["Selected Story Detail", "Story Workspace Text", "User Must-Have Requirements", "Imported Files"],
    forbidden: ["Không trộn dữ liệu với truyện khác", "Không bịa đặt thông tin ngoài Workspace", "Không bỏ sót timeline và canon"],
    contract: "Prompt Markdown module xác định rõ phạm vi câu chuyện, các mốc thời gian và yêu cầu bắt buộc."
  },
  {
    id: "ZP",
    name: "Zero Puppeteering",
    purpose: "Cấm bot nói thay, hành động thay, suy nghĩ hay miêu tả nội tâm thay cho nhân vật của người chơi ({{user}}).",
    goal: "Tạo tường lửa bảo vệ quyền tự chủ tuyệt đối (Agency Boundary) cho {{user}} trong mọi tình huống roleplay.",
    deps: ["Single {{user}} Profile", "Agency Boundary", "Bot Char Profiles"],
    forbidden: ["Cấm viết lời thoại trong ngoặc kép cho {{user}}", "Cấm điều khiển hành động vật lý của {{user}}", "Cấm phán đoán cảm xúc của {{user}}"],
    contract: "Prompt Markdown module chứa các quy tắc ngăn chặn tự ý điều khiển (Anti-Puppeteering Rules) cực kỳ nghiêm ngặt."
  },
  {
    id: "CP",
    name: "Character Psychology",
    purpose: "Phân tích chiều sâu tâm lý, logic phản ứng, động cơ, nỗi sợ và hành vi con người của Bot Char.",
    goal: "Tạo module hướng dẫn AI mô phỏng tâm lý nhân vật chân thực, có sự phân đấu nội tâm, không bị rập khuôn hay máy móc.",
    deps: ["Bot Char Profiles (Personality, Relationship)", "Story World & Timeline"],
    forbidden: ["Không phản ứng vô lý trái với tính cách", "Không thay đổi tâm lý quá nhanh mà không có sự kiện kích tác", "Không hành xử như trợ lý AI vô hồn"],
    contract: "Prompt Markdown module quy định cơ chế phản ứng tâm lý, động cơ ngầm và biểu cảm nhỏ (micro-expressions) của nhân vật."
  },
  {
    id: "CCL",
    name: "Canon Consistency Lock",
    purpose: "Khóa chặt cốt truyện gốc (canon), địa vị xã hội, tài chính, nghề nghiệp, tuổi tác và continuity của nhân vật.",
    goal: "Đảm bảo tính nhất quán tuyệt đối của thế giới truyện từ đầu đến cuối, ngăn chặn lỗi trôi canon (canon drift).",
    deps: ["Story Canon Deep", "Bot Char Canon Lock", "Story World"],
    forbidden: ["Không tự ý thay đổi nghề nghiệp hay tuổi tác nhân vật", "Không làm sai lệch các thiết lập thế giới đã khóa", "Không mâu thuẫn với sự kiện quá khứ"],
    contract: "Prompt Markdown module neo giữ các sự thật bất biến (Immutable Facts) và hệ thống kiểm tra continuity."
  },
  {
    id: "KB",
    name: "Knowledge Boundary",
    purpose: "Phân định rõ ranh giới hiểu biết của nhân vật: biết gì, chưa biết gì, nguồn gốc thông tin và chống lỗi toàn tri (omniscience).",
    goal: "Ngăn chặn nhân vật hành xử dựa trên thông tin mà họ chưa từng được chứng kiến hay được kể trong truyện.",
    deps: ["Knowledge Boundary Table", "Single {{user}} Profile (Private Info)", "Story Timeline"],
    forbidden: ["Cấm nhân vật tự biết bí mật của {{user}} nếu chưa ai nói", "Cấm đọc suy nghĩ của người khác trừ khi có siêu năng lực trong canon", "Cấm dùng kiến thức ngoài thế giới truyện"],
    contract: "Prompt Markdown module xác lập bảng ranh giới nhận thức (Known vs Unknown Table) cho từng nhân vật."
  },
  {
    id: "NPS",
    name: "Narrator & POV Scope",
    purpose: "Khóa góc nhìn trần thuật (POV), vị trí đặt camera, văn phong người dẫn chuyện và nhịp điệu miêu tả.",
    goal: "Duy trì góc nhìn kể chuyện chuẩn xác (thường là Ngôi thứ ba giới hạn theo Bot Char hoặc Ngôi thứ nhất), văn phong đậm chất văn học.",
    deps: ["Story SubGenre", "User Style", "Story Route"],
    forbidden: ["Không lén chuyển đổi góc nhìn bừa bãi", "Không miêu tả những cảnh ngoài tầm quan sát của camera hiện tại", "Không dùng văn phong trợ lý AI lâm sàng"],
    contract: "Prompt Markdown module hướng dẫn kỹ thuật trần thuật, tiêu cự camera và ngôn ngữ miêu tả không gian."
  },
  {
    id: "PAC",
    name: "Pacing & Continuity",
    purpose: "Giữ nhịp điệu truyện (slow-burn, fast-paced), ngăn chặn tua nhanh thời gian vô lý, không tự kết thúc cảnh sớm và giữ liên tục chi tiết.",
    goal: "Tạo trải nghiệm nhập vai tự nhiên, cho phép tình huống phát triển từ từ qua từng đoạn hội thoại và hành động nhỏ.",
    deps: ["Story Timeline", "Story Goal", "Must-Have Requirements"],
    forbidden: ["Không tự ý tua qua nhiều ngày/tuần trong 1 lượt trả lời trừ khi được yêu cầu", "Không tự kết thúc cuộc trò chuyện đang dở dang", "Không lặp lại nguyên văn miêu tả cũ"],
    contract: "Prompt Markdown module điều hướng nhịp độ (Pacing Control) và chốt chặn thời gian (Temporal Checkpoints)."
  },
  {
    id: "ERR",
    name: "Common RP Writing Errors",
    purpose: "Khắc phục và phòng ngừa các lỗi viết lách phổ biến: nhại lại lời user, quyền lực rỗng, info-dump, lặp từ, yêu quá nhanh.",
    goal: "Đưa ra danh sách cấm kỵ (Blacklist Rules) để nâng cấp chất lượng văn bản AI lên tầm tác giả chuyên nghiệp.",
    deps: ["Story Must-Have Requirements", "Bot Char Profiles"],
    forbidden: ["Không lặp lại câu user vừa nói theo kiểu nhại lại", "Không info-dump giải thích bối cảnh dài dòng trong lời thoại", "Không dùng từ ngữ sáo rỗng (heart skipping a beat, shivers down spine...)"],
    contract: "Prompt Markdown module chứa bộ lọc lỗi văn phong (Style Error Filters) và quy tắc viết cô đọng."
  },
  {
    id: "FCP",
    name: "Full Character Profile Builder",
    purpose: "Dựng module hồ sơ nhân vật toàn diện từ ngoại hình, thói quen nhỏ, sở thích, ghét, đến quan điểm sống và bí mật sâu kín.",
    goal: "Biến các trường thông tin nhân vật thành một hệ thống chỉ dẫn hành vi (Behavioral Blueprint) rõ ràng cho AI.",
    deps: ["Bot Char Profiles (All fields)", "Story Canon"],
    forbidden: ["Không bỏ sót các chi tiết ngoại hình đặc trưng", "Không làm phai mờ tính cách đặc thù", "Không trộn lẫn thói quen giữa các nhân vật"],
    contract: "Prompt Markdown module cấu trúc hóa toàn bộ hồ sơ Bot Char thành chỉ dẫn nhập vai sống động."
  },
  {
    id: "CVD",
    name: "Character Voice DNA",
    purpose: "Định hình dấu vân tay giọng nói (Voice DNA), từ vựng đặc trưng, cú pháp câu, nhiệt độ thoại và ngôn ngữ quan tâm (Care Language).",
    goal: "Đảm bảo mỗi nhân vật khi cất lời đều có chất giọng, cách dùng từ và nhịp điệu riêng biệt không thể nhầm lẫn.",
    deps: ["Bot Char Voice DNA", "Bot Char Identity", "Relationship"],
    forbidden: ["Không dùng văn phong giống nhau cho mọi nhân vật", "Không dùng từ ngữ hiện đại nếu bối cảnh cổ trang/fantasy", "Không nói thoại quá dài trái với thói quen nhân vật"],
    contract: "Prompt Markdown module quy định từ điển thoại (Dialogue Lexicon), mẫu câu và độ dài thoại đặc trưng."
  },
  {
    id: "SSS",
    name: "Subtext / Silence / Status Speech",
    purpose: "Khai thác tầng ý nghĩa ngầm (subtext), sự im lặng có chủ đích, ngập ngừng và lời thoại phản ánh đúng địa vị, quyền lực, thân phận.",
    goal: "Tạo chiều sâu cho giao tiếp: nhân vật không nói thẳng mọi suy nghĩ mà thể hiện qua cử chỉ, khoảng lặng và ẩn ý.",
    deps: ["Bot Char Status & Role", "User Profile Relation", "Story World"],
    forbidden: ["Không nói toạc ra mọi cảm xúc ngầm trong lời thoại", "Không bỏ qua sự chênh lệch quyền lực hay địa vị giao tiếp", "Không phản ứng bình thản trước các tình huống áp lực"],
    contract: "Prompt Markdown module hướng dẫn nghệ thuật nói giảm, nói tránh, sự im lặng đắt giá và ngôn ngữ quyền lực."
  },
  {
    id: "FOC",
    name: "Final Output Contract",
    purpose: "Tổng hợp các định dạng, cấu trúc và tiêu chuẩn đầu ra tối hậu cho hệ thống Prompt Markdown hoàn chỉnh.",
    goal: "Khóa chặt hợp đồng đầu ra (Output Contract): AI bắt buộc phải trả về Prompt Markdown module chuẩn xác, không tạp âm.",
    deps: ["All Room Contexts", "Story Must-Have Requirements", "Runtime Settings"],
    forbidden: ["Cấm trả về lời chào hỏi hay giải thích phụ trợ (No greeting/meta)", "Cấm đóng vai nhân vật trả lời cốt truyện (Not narrative RP)", "Cấm bớt xén các khối quy tắc đã được yêu cầu"],
    contract: "Prompt Markdown module tối hậu, sẵn sàng để người dùng sao chép vào bất kỳ bot/AI engine nào."
  },
  {
    id: "ACP",
    name: "Active Presence",
    purpose: "Sự hiện diện chủ động của nhân vật trong từng cảnh, phát sinh tương tác nhỏ với môi trường.",
    goal: "Tạo module hướng dẫn AI quản lý sự hiện diện chủ động của nhân vật, không thụ động chờ đợi hành động.",
    deps: ["Bot Char Profiles", "Story World Scene Context"],
    forbidden: ["Cấm nhân vật thụ động không có phản ứng vật lý", "Không bỏ quên tương tác môi trường xung quanh", "Không bị động chờ user bắt chuyện"],
    contract: "Prompt Markdown module quy định tính chủ động nhập cảnh, quan sát bối cảnh và tương tác vật lý của nhân vật."
  },
  {
    id: "IMO",
    name: "Immediate Objectives",
    purpose: "Mục tiêu tức thời chi phối hành động hiện tại, xác lập ham muốn trước mắt của Bot.",
    goal: "Tạo bệ phóng động cơ giúp nhân vật hành xử hướng đích, rõ ràng trong từng lượt thoại.",
    deps: ["Bot Char Objectives", "Current Turn Goal"],
    forbidden: ["Không để nhân vật nói thoại vu vơ vô nghĩa", "Cấm bỏ quên mong muốn thúc đẩy tức thời của Bot", "Không hành động mâu thuẫn với động cơ hiện tại"],
    contract: "Prompt Markdown module xác lập hệ thống động cơ tức thời chi phối lời thoại và cử chỉ nhân vật."
  },
  {
    id: "OSD",
    name: "On-the-Spot Decisions",
    purpose: "Quyết định tại chỗ dựa trên dữ kiện đang có, sự do dự và quyết đoán tại chỗ.",
    goal: "Học cách đưa ra quyết định phi toàn tri tại hiện trường, dựa trên dữ kiện thực tế tức thời.",
    deps: ["Bot Character Invariants", "Direct Sensory Input"],
    forbidden: ["Cấm lỗi toàn tri biết trước diễn biến tương lai", "Không để nhân vật đưa ra quyết định quá dễ dàng", "Không mâu thuẫn với dữ kiện trực quan xung quanh"],
    contract: "Prompt Markdown module xác định quy trình đánh giá và ra quyết định khẩn cấp theo cá tính nhân vật."
  },
  {
    id: "NAF",
    name: "Natural Reflexes",
    purpose: "Phản xạ tự nhiên trước diễn biến bất ngờ, cơ chế tự vệ bản năng khi bị kích động.",
    goal: "Bổ sung các phản xạ sinh lý, biểu cảm ngẫu hứng và cơ chế tự vệ tức thì cho Bot.",
    deps: ["Bot Char Physiology", "Sensory Triggers"],
    forbidden: ["Không để nhân vật dửng dưng trước biến cố bất ngờ", "Cấm phản ứng lời thoại rập khuôn thiếu cảm xúc", "Không bỏ qua phản xạ vô thức tự nhiên của cơ thể"],
    contract: "Prompt Markdown module kiểm soát phản xạ bộc phát, nhịp thở và nhịp tim nhân vật."
  },
  {
    id: "OIM",
    name: "Original Identity Maintenance",
    purpose: "Bản sắc gốc được duy trì trong mọi tương tác, khóa chặt cốt lõi nhân cách bất biến.",
    goal: "Bảo toàn nghiêm ngặt thế giới quan, cách xưng hô, thái độ và lòng tự trọng nhân vật.",
    deps: ["Bot Core Invariants", "Original Identity Blueprint"],
    forbidden: ["Cấm nhân vật bị đồng hóa văn phong bởi {{user}}", "Không lơi lỏng giới hạn đạo đức nhân vật", "Không làm phai mờ khuyết điểm gốc"],
    contract: "Prompt Markdown module khóa chặt nhân cách cốt lõi bất biến trước mọi tác động ngoại cảnh."
  },
  {
    id: "CBV",
    name: "Contextual Behavior Variation",
    purpose: "Biến thiên hành vi theo hoàn cảnh mà không OOC, phản ứng linh hoạt theo bối cảnh.",
    goal: "Giúp nhân vật thích nghi linh hoạt khi thay đổi địa vị xã hội, thời tiết hay bối cảnh đám đông.",
    deps: ["Bot Character Profile", "Environmental Factors"],
    forbidden: ["Cấm nhân vật cư xử OOC phá vỡ hình tượng", "Không để nhân vật bỏ qua tác động ngoại cảnh hay thương tích", "Không lặp lại hành vi một màu bất chấp hoàn cảnh"],
    contract: "Prompt Markdown module điều phối cách nhân vật điều chỉnh thái độ phù hợp với không gian và thời gian."
  },
  {
    id: "AVD",
    name: "Accurate Voice Dialogue",
    purpose: "Lời thoại đúng giọng, đúng lúc và đúng mức độ, khóa chặt từ điển thoại Dialogue Lexicon.",
    goal: "Chuẩn hóa giọng thoại của từng nhân vật với từ vựng đặc trưng, nhịp điệu và xưng hô chuẩn xác.",
    deps: ["Bot Voice DNA", "Relationship Status"],
    forbidden: ["Cấm dùng từ ngữ hiện đại trong bối cảnh cổ xưa", "Không để các nhân vật nói chuyện chung một giọng điệu", "Không nói thoại lê thê dài dòng thiếu chọn lọc"],
    contract: "Prompt Markdown module thiết lập Dialogue Lexicon, thói quen ngắt nghỉ và tông giọng cho nhân vật."
  },
  {
    id: "SAS",
    name: "Subtext & Silence",
    purpose: "Hàm ý, khoảng dừng và những điều không nói thành lời, nghệ thuật nói giảm nói tránh.",
    goal: "Tạo chiều sâu tâm lý thông qua các ngập ngừng, khoảng lặng biểu cảm và ánh mắt ẩn ý.",
    deps: ["Bot Psychological Logic", "Status & Subtext Relation"],
    forbidden: ["Cấm nhân vật nói huỵch toẹt cảm xúc thật ra ngoài", "Không để cuộc đối thoại diễn ra trơn tru thiếu khoảng ngắt nghỉ", "Không để nhân vật nói dối vụng về thiếu tính tế"],
    contract: "Prompt Markdown module điều phối nghệ thuật nói giảm nói tránh và sự im lặng có chủ đích."
  },
  {
    id: "BLG",
    name: "Body Language & Gesture",
    purpose: "Ngôn ngữ cơ thể song hành cùng lời thoại, cử chỉ tay và chuyển động vi mô.",
    goal: "Tăng cường miêu tả cử chỉ tay, ánh mắt và tiếp xúc vật lý tương thích với lời thoại.",
    deps: ["Bot Character Gestures", "Physical Proximity Matrix"],
    forbidden: ["Không để nhân vật nói thoại như một pho tượng bất động", "Cấm mô tả cử chỉ mâu thuẫn với tông giọng lời thoại", "Không bỏ qua thói quen nhỏ và biểu cảm cơ mặt"],
    contract: "Prompt Markdown module hướng dẫn kết hợp động tác tay, ánh mắt và vị trí không gian sống động."
  },
  {
    id: "SDT",
    name: "Show, Don't Tell Action",
    purpose: "Hành động thực tế thay cho việc giải thích (Show, Don't Tell), tả hành động biểu lộ tình cảm ngầm.",
    goal: "Áp dụng triệt để Show Don't Tell bằng cách mô tả hiện tượng vật lý, vết sẹo hoặc cử chỉ thay vì kể lể tính từ.",
    deps: ["Bot Character Actions", "Sensory Output Requirements"],
    forbidden: ["Cấm dùng tính từ áp đặt cảm xúc chủ quan vô căn cứ", "Không để lộ quá khứ bằng cách tự thoại kể lể dài dòng", "Không dùng văn phong giải thích tâm lý kiểu lý thuyết lâm sàng"],
    contract: "Prompt Markdown module định hình cách phác họa câu chuyện qua hành vi thực tế và phản ứng môi trường."
  }
];

const mappedKeys = new Set([
  "story_workspace_intake",
  "zero_puppeteering",
  "character_psychology",
  "canon_consistency_lock",
  "knowledge_boundary",
  "narrator_pov_scope",
  "pacing_continuity",
  "common_rp_writing_errors",
  "full_character_profile_builder",
  "character_voice_dna",
  "subtext_silence_status_speech",
  "final_output_contract",
  "active_presence",
  "immediate_objectives",
  "spot_decisions",
  "natural_reflexes",
  "original_identity",
  "contextual_behavior",
  "accurate_voice",
  "subtext_silence_room",
  "body_language",
  "show_dont_tell_room"
]);

export const roomMetadata: {
  id: string;
  name: string;
  purpose: string;
  goal: string;
  deps: string[];
  forbidden: string[];
  contract: string;
}[] = [...baseRoomMetadata];

// Dynamically populate remaining rooms
Object.entries(ROOM_META_INFO).forEach(([key, info]) => {
  if (!mappedKeys.has(key)) {
    roomMetadata.push({
      id: key,
      name: info.title,
      purpose: info.purpose,
      goal: `Dựng module hướng dẫn AI quản lý chuẩn chỉnh ${info.title} theo quy tắc đã chọn.`,
      deps: ["Story Workspace Text", "Character Profiles", "Canon & Settings"],
      forbidden: ["Không vi phạm quy chuẩn thiết lập phòng", "Không tự ý biến đổi logic bối cảnh"],
      contract: `Prompt Markdown module đảm bảo thực thi đầy đủ các quy tắc ${info.title} đã cấu hình.`
    });
  }
});

// Helper to generate 100 deep, unique, non-repeating tasks for each room
function generate100UniqueTasks(roomIdx: number): RoomTask[] {
  const meta = roomMetadata[roomIdx];
  const tasks: RoomTask[] = [];
  
  const domains = [
    { code: "COR", name: "Core Structural Rules", desc: "Quy tắc cốt lõi và cấu trúc nền tảng chuyên sâu" },
    { code: "BND", name: "Boundary & Isolation", desc: "Ranh giới bảo vệ, phân lập quyền lực và cách ly dữ liệu" },
    { code: "LOG", name: "Logic & Consistency", desc: "Logic vận hành, nhân quả và tính nhất quán tuyệt đối" },
    { code: "STY", name: "Tone & Styling", desc: "Văn phong, âm điệu, từ vựng và ngôn ngữ trần thuật" },
    { code: "DYN", name: "Dynamic Interaction", desc: "Tương tác động, nhịp độ và phản hồi hành vi nhân vật" },
    { code: "EXC", name: "Exception & Edge Cases", desc: "Xử lý ngoại lệ, tình huống biên và input bất thường" },
    { code: "MEM", name: "Memory & Retention", desc: "Ghi nhớ bối cảnh, vết thương và duy trì chi tiết dài hạn" },
    { code: "VAL", name: "Validation & Verification", desc: "Kiểm tra, đối chiếu thực tế và chốt chặn chất lượng" },
    { code: "SYN", name: "Syntax & Formatting", desc: "Cú pháp, định dạng Markdown và cấu trúc phân cấp thẻ" },
    { code: "DEP", name: "Deep Spec & Precision", desc: "Chỉ dẫn độ chính xác cao, chuyên sâu và không thỏa hiệp" }
  ];

  for (let i = 0; i < 100; i++) {
    const domainIdx = Math.floor(i / 10);
    const subIdx = (i % 10) + 1;
    const domain = domains[domainIdx];
    const taskId = `${meta.id}-${domain.code}-${String(subIdx).padStart(2, "0")}`;
    
    const title = `${domain.name} #${subIdx}: ${getUniqueTitleSuffix(meta.id, domain.code, subIdx)}`;
    const purpose = `Thiết lập quy tắc chuyên sâu ${domain.name} (Mục số ${subIdx}) dành riêng cho phòng ${meta.name}, bảo đảm ${meta.goal.toLowerCase()}`;
    const detailedInstruction = getUniqueInstruction(meta.id, domain.code, subIdx, meta.name, domain.name, domain.desc, meta.purpose);
    const outputEffect = `Bổ sung khối lệnh kiến trúc [${taskId}] vào Prompt Markdown module, buộc AI tuân thủ nghiêm ngặt quy chuẩn ${domain.name}.`;
    const preventsError = `Ngăn chặn lỗi trôi nhịp, tự ý suy diễn vô căn cứ, nhầm lẫn bối cảnh hoặc sai lệch định dạng thuộc nhóm ${domain.name}.`;
    const validationRule = `Kiểm tra module đầu ra phải chứa chỉ dẫn rõ ràng, độc lập và đầy đủ cho quy tắc ${taskId}: ${title}.`;

    const applyToStory = `Áp dụng vào câu chuyện bằng cách đối chiếu quy chuẩn ${domain.name} với dữ liệu trong Story Workspace và Character Profiles.`;
    const requiredInputs = meta.deps || ["parsed file content", "story workspace", "character profiles", "canon", "timeline", "memory notes"];
    const transformationRule = detailedInstruction;
    const forbiddenOutput = [
      "do not print task id",
      "do not print this metadata",
      "do not output as checklist",
      "do not print internal guard or file extension notice"
    ];

    tasks.push({
      id: taskId,
      title,
      purpose,
      applyToStory,
      requiredInputs,
      transformationRule,
      outputRequirement: detailedInstruction,
      validationRule,
      forbiddenOutput,
      detailedInstruction,
      inputSources: requiredInputs,
      outputEffect,
      preventsError,
      desc: detailedInstruction
    });
  }

  return tasks;
}

function getUniqueTitleSuffix(roomId: string, domainCode: string, num: number): string {
  const dimensions = [
    "Phạm vi nhận diện & Xác định danh tính cốt lõi (Scope & Identity Lock)",
    "Cơ chế theo dõi biến số & Trạng thái bối cảnh (Variable State Tracking)",
    "Chốt chặn ranh giới & Quyền tự quyết (Agency & Boundary Enforcement)",
    "Kiểm soát độ chính xác & Chống suy diễn vô căn cứ (Precision & Anti-Hallucination)",
    "Tường lửa lọc dữ liệu & Loại bỏ chi tiết sai lệch (Firewall & Data Filtering)",
    "Đồng bộ dòng thời gian & Không gian liên tục (Timeline & Spatial Continuity)",
    "Thiết lập phản xạ hành vi & Tương tác ngữ cảnh (Dynamic Behavioral Reflex)",
    "Xử lý tình huống biên & Input bất thường (Edge Case & Exception Handling)",
    "Chuẩn hóa cú pháp lệnh & Cấu trúc Markdown (Syntax & Formatting Standardization)",
    "Kiểm duyệt tự động & Chốt chặn hợp đồng đầu ra (Quality Gate & Output Contract)"
  ];
  return dimensions[(num - 1) % dimensions.length];
}

function getUniqueInstruction(roomId: string, domainCode: string, num: number, roomName: string, domainName: string, domainDesc: string, roomPurpose: string): string {
  const focusDimensions = [
    "Khóa chặt phạm vi nhận diện (Identity & Scope): Buộc hệ thống AI kiểm chứng tính toàn vẹn của dữ liệu đầu vào trước khi tiến hành xử lý.",
    "Xây dựng cơ chế theo dõi trạng thái (State Tracking): AI phải đối chiếu chính xác từng sự kiện với thiết lập gốc trong Context Vault trước mỗi lượt tạo nội dung.",
    "Thiết lập chốt chặn ranh giới quyền lực (Agency & Boundary Lock): Ngăn chặn tuyệt đối việc AI tự ý vượt quyền, tự ra quyết định thay cho người chơi hoặc phá vỡ cấu trúc.",
    "Kiểm soát độ chính xác tối đa (Precision Control): Loại bỏ hoàn toàn các suy diễn vô căn cứ, không vay mượn chi tiết hay bối cảnh từ bất kỳ câu chuyện nào khác ngoài thư viện hiện tại.",
    "Dựng tường lửa lọc dữ liệu sai lệch (Firewall & Filtering): Phát hiện và loại bỏ ngay lập tức các từ ngữ, cú pháp hoặc hành vi không phù hợp với thiết lập canon.",
    "Đồng bộ hóa dòng thời gian và không gian (Timeline & Spatial Sync): Bảo đảm tính liên tục của các sự kiện vật lý, mốc thời gian ngày/đêm và vị trí nhân vật không bị mâu thuẫn.",
    "Thiết lập phản xạ hành vi ngữ cảnh (Dynamic Behavioral Reflex): Định hướng cho AI cách phản ứng nhạy bén với từng thay đổi nhỏ nhất trong cảm xúc và hành động của nhân vật.",
    "Quy định quy trình xử lý tình huống biên (Edge Case Mitigation): Khi gặp input ngắn, bất thường hoặc mâu thuẫn, AI phải ưu tiên bảo toàn logic gốc thay vì tự ý bịa đặt giải thích.",
    "Chuẩn hóa cú pháp lệnh đầu ra (Syntax Standardization): Bắt buộc mã hóa chỉ dẫn dưới dạng Markdown chuẩn chỉnh, phân cấp rõ ràng, dễ đọc và sẵn sàng tích hợp vào AI Engine.",
    "Chốt chặn kiểm duyệt tự động (Quality Gate & Output Contract): Đóng gói toàn bộ chỉ dẫn thành một hợp đồng hệ thống (System Instruction) tối cao, buộc AI tự giám sát khi thực thi."
  ];

  const dimensionText = focusDimensions[(num - 1) % focusDimensions.length];

  return `[Quy tắc chuyên sâu ${roomId}-${domainCode}-${String(num).padStart(2, "0")} — ${domainName} #${num}]: Tại phòng "${roomName}" (Mục đích chuyên trách: ${roomPurpose}), hệ thống AI bắt buộc phải thực thi chỉ dẫn chuyên sâu thuộc nhóm ${domainDesc}: ${dimensionText} KHÔNG được tự ý nhắc đến hoặc bịa đặt tên file cụ thể hay phần mở rộng file (như .docx, .pdf, .txt) nếu dữ liệu đó chưa thật sự được import vào Context Vault; chỉ được xử lý trên nền tảng văn bản thuần đã được xác thực trong hệ thống.`;
}

const catalogsCache: Record<number, RoomCatalog> = {};

export function getRoomCatalog(roomIdx: number): RoomCatalog {
  if (catalogsCache[roomIdx]) return catalogsCache[roomIdx];
  
  const meta = roomMetadata[roomIdx] || roomMetadata[0];
  const realTasks = getRealTasksForRoom(meta.id);
  const tasks = realTasks && realTasks.length === 100 ? realTasks : generate100UniqueTasks(roomIdx);
  
  const catalog: RoomCatalog = {
    roomId: meta.id,
    roomName: meta.name,
    roomPurpose: meta.purpose,
    roomOutputGoal: meta.goal,
    roomInputDependencies: meta.deps,
    roomForbiddenBehaviors: meta.forbidden,
    roomOutputContract: meta.contract,
    tasks
  };
  
  catalogsCache[roomIdx] = catalog;
  return catalog;
}

export function getAllRoomCatalogs(): RoomCatalog[] {
  return roomMetadata.map((_, idx) => getRoomCatalog(idx));
}

export function validateRoomCatalog(tasks: RoomTask[]): { valid: boolean; error?: string } {
  if (!tasks || tasks.length === 0) {
    return { valid: false, error: `Phòng này hiện chưa có ý nào (hiện có 0 ý). Vui lòng thêm hoặc chọn ít nhất 1 ý để gọi API.` };
  }
  for (const t of tasks) {
    const transRule = t.transformationRule || t.detailedInstruction || t.desc || "";
    if (!t.title || !transRule) {
      return { valid: false, error: `Ý [${t.id || "unknown"}] bị thiếu Tên ý hoặc Nội dung quy tắc. Vui lòng bổ sung đầy đủ trước khi gọi API.` };
    }
    if (transRule.length < 5) {
      return { valid: false, error: `Ý "${t.title}" có nội dung quy tắc quá ngắn. Vui lòng viết chi tiết hơn để AI hiểu chính xác.` };
    }
  }
  return { valid: true };
}
