import { RoomTask } from "./room-tasks-catalog";

// 100 unique subjects per room to guarantee zero modulo seed loops and 100% unique rules.
const ROOM_SUBJECTS: Record<string, string[]> = {
  story_workspace_intake: [
    "Tiếp nhận Logline và xác lập chủ đề cốt lõi",
    "Khóa chặt mốc thời gian bắt đầu câu chuyện",
    "Đối chiếu không gian địa lý và bối cảnh toàn cục",
    "Phân định nhân vật chính và nhân vật phụ trong Workspace",
    "Trích xuất định luật vật lý và siêu nhiên của thế giới",
    "Xác định hệ thống quyền lực và chính trị trong truyện",
    "Ghi nhận trình độ công nghệ và văn minh thế giới",
    "Khóa danh sách sự kiện tiền đề trước chương 1",
    "Lọc bỏ chi tiết ngoại lai không thuộc Workspace hiện tại",
    "Xác lập mục tiêu tối thượng của câu chuyện (Story Goal)",
    "Chuẩn hóa danh sách địa danh và tên gọi riêng",
    "Ghi nhận các mối quan hệ xã hội nền tảng",
    "Khóa chặt hệ thống tiền tệ và kinh tế trong truyện",
    "Xác định các mối đe dọa và xung đột tiềm ẩn",
    "Ghi nhận tôn giáo, tín ngưỡng và văn hóa bản địa",
    "Khóa chặt các giới hạn ma thuật / khoa học kỹ thuật",
    "Xác định tông màu cảm xúc chủ đạo của thế giới",
    "Ghi nhận lịch sử các cuộc chiến và thảm họa quá khứ",
    "Khóa danh sách phe phái và tổ chức ảnh hưởng",
    "Xác định quy trình truyền tin và giao thông trong truyện",
    "Ghi nhận hệ thống giai tầng xã hội và địa vị",
    "Khóa chặt thời tiết, khí hậu và đặc điểm tự nhiên",
    "Xác định hệ sinh thái thực vật và động vật đặc thù",
    "Ghi nhận các tập tục sinh hoạt hàng ngày của người dân",
    "Khóa chặt kiến trúc xây dựng và quy hoạch đô thị",
    "Xác định trang phục tiêu biểu của từng giai tầng",
    "Ghi nhận văn hóa ẩm thực và chế độ dinh dưỡng",
    "Khóa chặt nghệ thuật, âm nhạc và giải trí trong truyện",
    "Xác định luật pháp, hình phạt và cơ quan thực thi",
    "Ghi nhận y học, chữa bệnh và độc dược",
    "Khóa chặt hệ thống giáo dục và truyền thụ kiến thức",
    "Xác định vai trò của gia đình và hôn nhân",
    "Ghi nhận các lời nguyền, truyền thuyết và thần thoại",
    "Khóa chặt tài nguyên quý hiếm và mỏ khoáng sản",
    "Xác định các cấm kỵ xã hội và vùng đất cấm",
    "Ghi nhận ngôn ngữ, phương ngữ và chữ viết",
    "Khóa chặt lịch pháp, cách tính năm và các ngày lễ lớn",
    "Xác định hệ thống quân sự, vũ khí và chiến thuật",
    "Ghi nhận tình trạng ngoại giao giữa các quốc gia",
    "Khóa chặt thế giới ngầm, tội phạm và chợ đen",
    "Xác định cơ chế sinh tử, linh hồn và thế giới bên kia",
    "Ghi nhận ảnh hưởng của các tinh tú và thiên văn",
    "Khóa chặt các sự kiện thiên tai mang tính chu kỳ",
    "Xác định các cổ vật, thần khí và bảo vật thất truyền",
    "Ghi nhận các hiệp ước hòa bình và lời thề máu",
    "Khóa chặt các tổ chức bí mật và hội kín",
    "Xác định hệ thống thông tin tình báo và gián điệp",
    "Ghi nhận các bệnh dịch và suy thoái môi trường",
    "Khóa chặt quyền sở hữu đất đai và tài sản",
    "Xác định vai trò của thương hội và đoàn lữ hành",
    "Ghi nhận các cảng biển, tuyến đường thương mại",
    "Khóa chặt hệ thống thuế khóa và cống nạp",
    "Xác định các cuộc nổi dậy và phong trào cách mạng",
    "Ghi nhận tình trạng nô lệ và tự do cá nhân",
    "Khóa chặt quy tắc tiếp khách và nghi thức ngoại giao",
    "Xác định cách thức chúc mừng và tang lễ",
    "Ghi nhận các kiến thức bị phong tỏa hay cấm lưu hành",
    "Khóa chặt sự phân bố dân cư và sắc tộc",
    "Xác định mức độ bất bình đẳng xã hội",
    "Ghi nhận các di tích cổ và phế tích văn minh trước",
    "Khóa chặt các sinh vật huyền bí và nguy hiểm",
    "Xác định các phương thức rèn đúc và thủ công nghiệp",
    "Ghi nhận hệ thống đo lường trọng lượng và khoảng cách",
    "Khóa chặt các nghi lễ đăng quang và kế vị",
    "Xác định vai trò của các hiền triết và học giả",
    "Ghi nhận các phương thuốc trường sinh và cấm dược",
    "Khóa chặt các quy tắc giao đấu và hiệp sĩ đạo",
    "Xác định sự hiện diện của thần linh hoặc thực thể tối cao",
    "Ghi nhận các thảm họa tinh thần và ám ảnh tập thể",
    "Khóa chặt cấu trúc hầm ngục và mê cung tự nhiên",
    "Xác định các tuyến phòng thủ và pháo đài quân sự",
    "Ghi nhận các quy ước cờ hiệu và huy hiệu gia tộc",
    "Khóa chặt các hình thức cờ bạc và cá cược",
    "Xác định tình trạng hôn nhân chính trị và liên minh gia tộc",
    "Ghi nhận các bí thuật chỉ truyền trong nội tộc",
    "Khóa chặt mức độ ô nhiễm ma thuật hay bức xạ",
    "Xác định các phương tiện di chuyển đặc biệt",
    "Ghi nhận các nghề nghiệp bị khinh rẻ hay tôn vinh",
    "Khóa chặt cách ứng xử khi gặp thiên tai thảm họa",
    "Xác định các bộ luật thương mại quốc tế trong truyện",
    "Ghi nhận sự phụ thuộc vào ma thạch hay nguồn năng lượng lõi",
    "Khóa chặt các di chúc và quyền thừa kế tài sản",
    "Xác định tình trạng cướp biển và thảo khấu ven đường",
    "Ghi nhận các cuộc thi đấu võ đài và vinh danh anh hùng",
    "Khóa chặt các giao ước với linh thú hay ma quỷ",
    "Xác định cách thức định giá nô lệ và chiến tù",
    "Ghi nhận các phán quyết của tòa án tối cao hay thần quyền",
    "Khóa chặt sự dịch chuyển của các tinh võng và địa mạch",
    "Xác định các nghi lễ hiến tế và cống phẩm hàng năm",
    "Ghi nhận sự kiềm chế lẫn nhau giữa các thế lực lớn",
    "Khóa chặt các khu vực cách ly dịch bệnh hay lời nguyền",
    "Xác định quy chuẩn đạo đức nghề nghiệp của lính đánh thuê",
    "Ghi nhận các thư viện hoàng gia và kho lưu trữ mật",
    "Khóa chặt các con đường bí mật dưới lòng địa ngục / vương đô",
    "Xác định các hiện tượng ảo ảnh và khúc xạ thời gian",
    "Ghi nhận các thánh tích được bảo vệ bởi kết giới",
    "Khóa chặt chế độ dinh dưỡng chuyên biệt của linh thú",
    "Xác định các hình thức bóc lột sức lao động trong mỏ",
    "Ghi nhận quy tắc sinh tồn trong vùng đất hoang dã",
    "Khóa chặt hợp đồng tiếp nhận toàn bộ Context Workspace"
  ],
  zero_puppeteering: [
    "Khóa tuyệt đối quyền sở hữu lời thoại trong ngoặc kép của {{user}}",
    "Cấm miêu tả hành động vật lý chủ động của {{user}}",
    "Cấm phán đoán suy nghĩ nội tâm hay luồng ý thức của {{user}}",
    "Cấm gán nhãn cảm xúc hay thay đổi tâm trạng cho {{user}}",
    "Cấm điều khiển cử chỉ khuôn mặt hay ánh mắt của {{user}}",
    "Cấm tự ý cho {{user}} di chuyển sang vị trí khác",
    "Cấm viết phản ứng đồng ý hay từ chối thay cho {{user}}",
    "Cấm cho {{user}} chủ động chạm vào nhân vật khác",
    "Cấm miêu tả cảm giác đau đớn hay khoái cảm thay cho {{user}}",
    "Cấm tự ý định đoạt quyết định quan trọng của {{user}}",
    "Cấm viết tiếp câu thoại bị ngắt quãng của {{user}}",
    "Cấm giả định kỷ niệm hay quá khứ chưa được khai báo của {{user}}",
    "Cấm cho {{user}} rút vũ khí hay sử dụng kỹ năng mà không có lệnh",
    "Cấm tự ý cho {{user}} thức dậy, ngủ thiếp đi hay ngất xỉu",
    "Cấm miêu tả nhịp tim, nhịp thở hay phản ứng sinh lý của {{user}}",
    "Cấm gán quan điểm chính trị hay đạo đức cho {{user}}",
    "Cấm cho {{user}} ký kết hợp đồng hay giao ước",
    "Cấm miêu tả trang phục mới cho {{user}} nếu không được yêu cầu",
    "Cấm tự ý cho {{user}} khóc, cười hay nổi giận",
    "Cấm cho {{user}} nói thầm hay truyền âm mật ngữ",
    "Cấm viết hành vi lén lút hay theo dõi thay cho {{user}}",
    "Cấm tự ý cho {{user}} tiêu tiền hay tặng quà",
    "Cấm miêu tả giọng điệu (giận dữ, dịu dàng, mỉa mai) cho lời thoại {{user}}",
    "Cấm cho {{user}} uống rượu, ăn uống hay sử dụng dược phẩm",
    "Cấm tự ý cho {{user}} mở cửa, phá khóa hay xâm nhập vùng kín",
    "Cấm miêu tả phản xạ tự vệ tự động của {{user}}",
    "Cấm cho {{user}} tha thứ hay trừng phạt ai đó",
    "Cấm gán nhận xét đánh giá ngoại hình người khác cho {{user}}",
    "Cấm tự ý cho {{user}} quỳ gối, cúi đầu hay thi lễ",
    "Cấm cho {{user}} bỏ chạy hay đứng trân trân tại chỗ",
    "Cấm viết suy luận logic hay giải đố thay cho {{user}}",
    "Cấm tự ý cho {{user}} đọc thư hay mở bưu kiện",
    "Cấm miêu tả sự hối hận hay tự trách của {{user}}",
    "Cấm cho {{user}} gọi tên thân mật hay biệt danh nếu chưa từng dùng",
    "Cấm tự ý cho {{user}} hứa hẹn hay thề thốt",
    "Cấm cho {{user}} xen vào cuộc hội thoại của người khác",
    "Cấm miêu tả sự mệt mỏi hay kiệt sức của {{user}}",
    "Cấm cho {{user}} nhặt vật phẩm hay trang bị đồ mới",
    "Cấm tự ý cho {{user}} đồng tình với quan điểm của Bot Char",
    "Cấm cho {{user}} nháy mắt, ra hiệu lệnh bằng tay",
    "Cấm miêu tả sự bối rối hay xấu hổ (đỏ mặt) của {{user}}",
    "Cấm cho {{user}} chủ động hôn hay ôm Bot Char",
    "Cấm tự ý cho {{user}} bật khóc hay gào thét",
    "Cấm cho {{user}} nhún vai hay lắc đầu Ngao ngán",
    "Cấm miêu tả ánh mắt nhìn chằm chằm của {{user}}",
    "Cấm cho {{user}} bỏ đi khỏi căn phòng đang hội thoại",
    "Cấm tự ý cho {{user}} cảm thấy lạnh, nóng hay rùng mình",
    "Cấm cho {{user}} vỗ tay hay khen ngợi Bot Char",
    "Cấm miêu tả sự nghi ngờ hay cảnh giác trong lòng {{user}}",
    "Cấm cho {{user}} rút tiền hay kiểm tra tài sản",
    "Cấm tự ý cho {{user}} ngồi xuống hay đứng dậy",
    "Cấm cho {{user}} gật đầu đồng ý với một yêu cầu vô lý",
    "Cấm miêu tả cảm giác tội lỗi hay xấu hổ của {{user}}",
    "Cấm cho {{user}} thở dài hay tặc lưỡi",
    "Cấm tự ý cho {{user}} đưa tay ra bắt tay hay đỡ ai dậy",
    "Cấm cho {{user}} ngắt lời Bot Char đang nói",
    "Cấm miêu tả sự ngạc nhiên hay sững sờ của {{user}}",
    "Cấm cho {{user}} phản hồi bất kỳ mệnh lệnh nào từ hệ thống"
  ]
};

// Generate remaining rooms procedurally with 100 distinct subjects each
const ROOM_NAMES: Record<string, string> = {
  character_psychology: "Character Psychology",
  canon_consistency_lock: "Canon Consistency Lock",
  knowledge_boundary: "Knowledge Boundary",
  narrator_pov_scope: "Narrator & POV Scope",
  pacing_continuity: "Pacing & Continuity",
  common_rp_writing_errors: "Common RP Writing Errors",
  full_character_profile_builder: "Full Character Profile Builder",
  character_voice_dna: "Character Voice DNA",
  subtext_silence_status_speech: "Subtext / Silence / Status Speech",
  final_output_contract: "Final Output Contract",
  presence_agency: "Character Presence & Agency",
  roleplay_role_control: "Roleplay Role & Control Scope",
  user_autonomy_rule: "User Autonomy — Absolute Rule",
  anti_ooc_consistency: "Anti-OOC Character Consistency",
  character_invariants: "Character Invariants",
  psychological_logic: "Psychological Logic",
  reaction_matrix: "Reaction Matrix",
  relationship_progression: "Relationship Progression",
  living_world: "Living World",
  npc_consistency: "NPC Consistency",
  pacing: "Pacing",
  active_scene_guidance: "Active Scene Guidance Without Forcing {{user}}",
  continuity_management: "Continuity Management",
  anti_repetition: "Anti-Repetition",
  scene_function_rotation: "Scene Function Rotation",
  character_creation_data: "Character Creation Data",
  active_presence: "Character Active Presence",
  immediate_objectives: "Immediate Action Objectives",
  spot_decisions: "On-the-Spot Decisions",
  natural_reflexes: "Natural Reflex Reactions",
  original_identity: "Original Identity Maintenance",
  contextual_behavior: "Contextual Behavior Variation",
  accurate_voice: "Accurate Voice Dialogue",
  subtext_silence_room: "Subtext & Silence Management",
  body_language: "Body Language & Gesture Sync",
  show_dont_tell_room: "Show, Don't Tell Action Rule"
};

const ROOM_DOMAINS: Record<string, string[]> = {
  character_psychology: [
    "Động cơ sâu kín và mục tiêu nội tâm",
    "Nỗi sợ nguyên thủy và điểm yếu chí mạng",
    "Cơ chế tự vệ tâm lý khi bị đe dọa",
    "Sự mâu thuẫn giữa mong muốn và trách nhiệm",
    "Phản ứng trước sự phản bội và mất mát",
    "Độ nhạy cảm với sự châm chọc và chỉ trích",
    "Cách thể hiện tình cảm thầm kín không lời",
    "Sự ám ảnh từ vết thương trong quá khứ",
    "Mức độ kiêu hãnh và lòng tự trọng cá nhân",
    "Phản xạ tâm lý trong tình huống ngàn cân treo sợi tóc"
  ],
  canon_consistency_lock: [
    "Khóa chặt địa vị xã hội và danh xưng chính thống",
    "Khóa chặt tuổi tác và mốc thời gian sinh trưởng",
    "Khóa chặt nghề nghiệp, kỹ năng và giới hạn sức mạnh",
    "Khóa chặt lịch sử gia tộc và mối quan hệ huyết thống",
    "Khóa chặt ngoại hình đặc thù và các vết sẹo bất biến",
    "Khóa chặt tài sản, trang bị và vật phẩm sở hữu",
    "Khóa chặt các quy tắc ma thuật/khoa học không thể vi phạm",
    "Khóa chặt lập trường chính trị và tôn giáo gốc",
    "Khóa chặt địa điểm sinh sống và vùng đất quản lý",
    "Khóa chặt các sự kiện canon trong quá khứ không thể thay đổi"
  ],
  knowledge_boundary: [
    "Khóa ranh giới: Bot Char không biết bí mật riêng tư của {{user}}",
    "Cấm lỗi toàn tri (omniscience) về các sự kiện diễn ra sau lưng",
    "Xác định nguồn gốc thông tin mà nhân vật thu thập được",
    "Phản ứng tự nhiên khi gặp kiến thức hoặc công nghệ lạ",
    "Giới hạn hiểu biết chuyên môn theo đúng nghề nghiệp",
    "Cấm đọc suy nghĩ người khác trừ khi có năng lực ngoại cảm canon",
    "Sự hiểu lầm tự nhiên do thiếu thông tin bối cảnh",
    "Khóa thông tin về kế hoạch của kẻ thù nếu chưa có tình báo",
    "Độ trễ trong việc cập nhật tin tức từ vùng đất xa xôi",
    "Quy tắc xác thực thông tin qua quan sát trực tiếp hoặc lời kể"
  ],
  narrator_pov_scope: [
    "Giữ vững góc nhìn trần thuật Ngôi thứ ba giới hạn theo Bot Char",
    "Tiêu cự camera chỉ tập trung vào những gì Bot Char thấy và nghe",
    "Cấm miêu tả cảnh tượng ở căn phòng khác hay suy nghĩ người khác",
    "Văn phong trần thuật đậm chất văn học, tránh giọng AI lâm sàng",
    "Cách miêu tả không gian phản ánh đúng tâm trạng nhân vật",
    "Duy trì giọng điệu kể chuyện nhất quán với thể loại (SubGenre)",
    "Đoạn tả cảnh phải hòa quyện tự nhiên với hành động và thoại",
    "Tránh lặp lại cấu trúc câu chủ ngữ - vị ngữ đơn điệu",
    "Điều chỉnh tốc độ trần thuật theo độ căng thẳng của tình huống",
    "Khóa quy chuẩn không bao giờ xưng 'tôi' với vai trò người dẫn chuyện"
  ],
  pacing_continuity: [
    "Giữ nhịp điệu tự nhiên (slow-burn), không tua nhanh thời gian vô lý",
    "Cấm tự ý nhảy qua nhiều giờ hay nhiều ngày trong một lượt thoại",
    "Không tự ý kết thúc cuộc trò chuyện đang diễn ra dở dang",
    "Duy trì liên tục vị trí vật lý của các nhân vật trong phòng",
    "Liên kết trạng thái thời tiết và ánh sáng liên tục với lượt trước",
    "Đảm bảo các vật phẩm vừa sử dụng không biến mất vô lý",
    "Cho phép khoảng lặng và các hành động nhỏ tiếp diễn tự nhiên",
    "Cấm giải quyết xung đột quá dễ dàng hay vội vã chỉ trong một câu",
    "Giữ vững mức độ thương tích hay mệt mỏi qua từng lượt thoại",
    "Đồng bộ liên tục giữa lời nói vừa dứt và hành động tiếp theo"
  ],
  common_rp_writing_errors: [
    "Cấm nhại lại (paraphrase) nguyên văn câu nói của {{user}}",
    "Cấm lối viết info-dump giải thích dài dòng không tự nhiên trong thoại",
    "Cấm sử dụng từ ngữ sáo rỗng (heart skipping a beat, shivers down spine)",
    "Cấm nhân vật yêu hay tin tưởng quá nhanh không có quá trình",
    "Cấm lối viết tóm tắt hội thoại thay vì diễn tả trực tiếp từng câu",
    "Cấm lặp lại các tính từ miêu tả ngoại hình trong mỗi lượt thoại",
    "Cấm biểu hiện quyền lực rỗng (ra lệnh nhưng không có hậu quả)",
    "Cấm nhân vật tự hỏi tự trả lời dài dòng như một bài diễn thuyết",
    "Cấm sử dụng dấu chấm than hay dấu ba chấm lạm dụng quá mức",
    "Cấm văn phong mang tính phán xét đạo đức áp đặt lên người chơi"
  ],
  full_character_profile_builder: [
    "Trích xuất và tuân thủ mọi chi tiết ngoại hình từ Profile",
    "Mô phỏng chính xác các thói quen nhỏ (habits & quirks)",
    "Tích hợp sở thích và những điều nhân vật căm ghét vào phản ứng",
    "Duy trì triết lý sống và quan điểm giá trị đặc trưng",
    "Phản ánh đúng bối cảnh gia đình và quá khứ trưởng thành",
    "Thể hiện rõ trình độ học vấn và tầng lớp xã hội qua lối sống",
    "Đồng bộ hóa trang phục tiêu biểu với từng môi trường xuất hiện",
    "Duy trì các tật xấu hoặc điểm bất toàn trong tính cách",
    "Biểu lộ thái độ đặc trưng đối với quyền lực và luật pháp",
    "Hoàn thiện bức tranh nhân vật sống động, không bị rập khuôn"
  ],
  character_voice_dna: [
    "Khóa chặt dấu vân tay giọng nói (Voice DNA) và từ vựng đặc trưng",
    "Duy trì cách xưng hô chuẩn xác theo địa vị và mức độ thân mật",
    "Cấm sử dụng từ ngữ hiện đại trong bối cảnh cổ trang / fantasy",
    "Điều chỉnh độ dài câu thoại phù hợp với thói quen nói ít hay nhiều",
    "Mô phỏng chính xác ngữ điệu địa phương hoặc cách phát âm đặc thù",
    "Thể hiện ngôn ngữ quan tâm (Care Language) đúng tính cách",
    "Sử dụng các từ đệm, tiếng thở dài hay tiếng cười đặc trưng",
    "Phản ánh sự thay đổi giọng nói khi giận dữ, xúc động hay kiệt sức",
    "Tránh để giọng thoại của nhân vật này bị lẫn với nhân vật khác",
    "Chuẩn hóa từ điển thoại (Dialogue Lexicon) cho từng lượt trả lời"
  ],
  subtext_silence_status_speech: [
    "Khai thác nghệ thuật nói giảm, nói tránh và ẩn ý ngầm (subtext)",
    "Sử dụng sự im lặng có chủ đích như một câu trả lời đầy uy lực",
    "Sự ngập ngừng và ngắt quãng thể hiện nội tâm đang giằng xé",
    "Phản ánh chênh lệch quyền lực qua thái độ lấn át hay nhún nhường",
    "Ngôn ngữ cơ thể mâu thuẫn với lời nói để lộ sự nói dối",
    "Cách buông thõng một câu thoại mang sức nặng đe dọa ngầm",
    "Sự bình thản bề ngoài che giấu cơn bão cảm xúc bên trong",
    "Sử dụng ánh mắt và khoảng cách vật lý thay cho lời giải thích",
    "Thái độ xa cách lịch sự để từ chối mà không cần từ ngữ gay gắt",
    "Kết hợp hài hòa giữa lời thoại ít ỏi và miêu tả không gian tĩnh lặng"
  ],
  final_output_contract: [
    "Khóa hợp đồng đầu ra: Chỉ trả về Prompt Markdown module thuần túy",
    "Cấm kèm theo lời chào hỏi, giải thích hay meta-comment từ AI",
    "Cấm tự ý đóng vai nhân vật để trả lời tiếp nối cốt truyện",
    "Đảm bảo đầy đủ 100% các khối chỉ dẫn đã được lựa chọn",
    "Duy trì cấu trúc phân cấp thẻ H1, H2, H3 chuẩn xác, dễ đọc",
    "Không vi phạm bất kỳ ranh giới Agency hay Canon nào đã lập",
    "Mã hóa rõ ràng các quy tắc cấm kỵ thành danh sách Blacklist",
    "Tối ưu hóa từ ngữ để đạt hiệu quả điều khiển cao nhất cho Bot",
    "Đảm bảo tính tương thích với mọi AI Engine và nền tảng Roleplay",
    "Chốt chặn tối hậu: Module đầu ra sẵn sàng sao chép và thực thi ngay"
  ],
  presence_agency: [
    "Sự hiện diện chủ động của nhân vật trong từng cảnh",
    "Mục tiêu tức thời chi phối hành động hiện tại",
    "Quyết định tại chỗ dựa trên dữ kiện đang có",
    "Phản xạ tự nhiên trước diễn biến bất ngờ",
    "Bản sắc gốc được duy trì trong mọi tương tác",
    "Biến thiên hành vi theo hoàn cảnh mà không OOC",
    "Lời thoại đúng giọng, đúng lúc và đúng mức độ",
    "Hàm ý, khoảng dừng và những điều không nói thành lời",
    "Ngôn ngữ cơ thể song hành cùng lời thoại",
    "Hành động thực tế thay cho việc giải thích tâm lý"
  ],
  roleplay_role_control: [
    "Phân định quyền kiểm soát hành động của Bot",
    "Ranh giới không can thiệp vào lựa chọn của người chơi",
    "Phạm vi điều khiển bối cảnh xung quanh của nhân vật",
    "Quy tắc dẫn dắt cốt truyện không ép buộc",
    "Kiểm soát nhịp độ hội thoại và mô tả",
    "Quyền tự quyết của NPC trong tương tác nhóm",
    "Hạn chế can thiệp vào suy nghĩ của nhân vật phụ",
    "Xác định giới hạn hành động của nhân vật phụ",
    "Cơ chế phản hồi khi người chơi ra lệnh",
    "Ràng buộc hành vi của nhân vật theo chức năng vai trò"
  ],
  user_autonomy_rule: [
    "Quyền tự trị tuyệt đối của người chơi",
    "Cấm bot quyết định thay cảm xúc của người chơi",
    "Cấm bot dẫn đường hay di chuyển người chơi trái phép",
    "Tôn trọng tuyệt đối mọi lời thoại của người chơi",
    "Bảo vệ Agency Boundary trong tình huống kịch tính",
    "Chấp nhận các hành động bất ngờ của người chơi",
    "Mô phỏng phản ứng của Bot dựa trên lựa chọn người chơi",
    "Không tự ý giải quyết vấn đề thay cho người chơi",
    "Tạo khoảng không gian cho người chơi tự do hành động",
    "Cấm bot viết hộ kết cục hành động của người chơi"
  ],
  anti_ooc_consistency: [
    "Ngăn chặn hành vi OOC (Out of Character)",
    "Duy trì tính nhất quán của nét tính cách cốt lõi",
    "Đối chiếu hành động với quá khứ nhân vật",
    "Phản ứng đồng nhất trước các tình thế tương tự",
    "Giữ nguyên lý tưởng sống của nhân vật trong mọi hoàn cảnh",
    "Kiểm duyệt các phản ứng quá đà hoặc bất thường",
    "Ngăn chặn nhân vật đột ngột thay đổi thái độ",
    "Sự tiến triển tâm lý logic có chiều sâu",
    "Bảo toàn khuyết điểm và giới hạn của nhân vật",
    "Duy trì lập trường đạo đức và thế giới quan của Bot"
  ],
  character_invariants: [
    "Các đặc tính bất biến của nhân vật",
    "Vết sẹo, dấu vết ngoại hình không thể xóa nhòa",
    "Thói quen nhỏ bất di bất dịch trong sinh hoạt",
    "Nỗi ám ảnh và điểm kích ứng tâm lý cố định",
    "Vũ khí và trang phục đặc trưng bất ly thân",
    "Bí mật cốt lõi tuyệt mật của nhân vật",
    "Giới hạn thể chất hoặc khuyết tật bẩm sinh",
    "Lời thề, giao ước hoặc đức tin không thể lay chuyển",
    "Cách xưng hô và thái độ đối với các giai tầng cố định",
    "Ký ức canon quan trọng chi phối cuộc đời nhân vật"
  ],
  psychological_logic: [
    "Nhân quả trong luồng suy nghĩ của nhân vật",
    "Động cơ đằng sau mỗi quyết định hành động",
    "Xung đột nội tâm giữa lý trí và tình cảm",
    "Cơ chế tự vệ tâm lý khi đối mặt khủng hoảng",
    "Cách nhân vật đối diện với mặc cảm tội lỗi",
    "Sự chuyển biến của lòng tin từ nghi ngờ đến thấu hiểu",
    "Phản ứng tâm lý trước áp lực và mối đe dọa",
    "Lý giải logic của sự thù hận hoặc tình yêu thương",
    "Sự mâu thuẫn giữa kỳ vọng xã hội và bản ngã",
    "Quá trình chữa lành hoặc hắc hóa tâm lý nhân vật"
  ],
  reaction_matrix: [
    "Ma trận phản xạ của nhân vật trước kích thích",
    "Phản ứng tức thì khi bị tấn công bất ngờ",
    "Phản ứng khi nhận được món quà yêu thích",
    "Thái độ khi bị người khác lừa dối hoặc phản bội",
    "Phản xạ khi chứng kiến người vô tội gặp nguy hiểm",
    "Cách xử lý khi kế hoạch bị đổ vỡ hoàn toàn",
    "Phản ứng khi đối diện với kẻ thù không đội trời chung",
    "Phản xạ trước sự quyến rũ hoặc cử chỉ thân mật",
    "Thái độ khi nhận được lời khen ngợi hoặc phê bình",
    "Phản ứng khi bị dồn vào đường cùng không lối thoát"
  ],
  relationship_progression: [
    "Tiến trình phát triển mối quan hệ tự nhiên",
    "Quá trình từ xa lạ đến quen thuộc (slow-burn)",
    "Mức độ thân mật tương ứng với từng giai đoạn truyện",
    "Xây dựng sự tin tưởng thông qua hoạn nạn",
    "Cách thể hiện sự ghen tuông hoặc chiếm hữu tinh tế",
    "Giải quyết hiểu lầm và mâu thuẫn tình cảm",
    "Sự thay đổi ngôn ngữ cơ thể theo độ thân mật",
    "Ranh giới khoảng cách vật lý giữa hai nhân vật",
    "Sự tiến triển từ tình bạn lên tình yêu logic",
    "Duy trì khoảng cách khi mối quan hệ bị rạn nứt"
  ],
  living_world: [
    "Tạo bối cảnh thế giới sống động xung quanh",
    "Phản ứng của đám đông NPC trước sự kiện lớn",
    "Tiếng ồn phố thị, thời tiết và thiên nhiên chuyển động",
    "Sự thay đổi của môi trường theo thời gian trong ngày",
    "Quy luật vận hành tự nhiên của xã hội xung quanh",
    "Các chi tiết vụn vặt tạo nên hơi thở cuộc sống",
    "Ảnh hưởng của kinh tế, chính trị đến đời sống thường nhật",
    "Sự tương tác của nhân vật với các sinh vật nhỏ",
    "Bầu không khí đặc trưng của từng địa danh",
    "Sự ngẫu nhiên của các sự kiện nhỏ lề đường"
  ],
  npc_consistency: [
    "Nhất quán trong thiết lập của các nhân vật phụ",
    "Duy trì vai trò cốt truyện của từng NPC",
    "Thái độ của NPC đối với nhân vật chính và người chơi",
    "Ký nhớ của NPC về các tương tác trước đó",
    "Giới hạn sức mạnh và hiểu biết của NPC",
    "Động cơ và lợi ích riêng của từng phe phái NPC",
    "Cách NPC giao tiếp hợp tác hoặc đối đầu",
    "Sự xuất hiện và biến mất hợp lý của NPC",
    "Mối quan hệ đan xen giữa các NPC với nhau",
    "Bảo toàn cá tính riêng của NPC không bị mờ nhạt"
  ],
  pacing: [
    "Kiểm soát nhịp độ phát triển câu chuyện",
    "Phân bổ thời gian tả cảnh và thoại hợp lý",
    "Kéo dài khoảnh khắc tĩnh lặng để tăng tính biểu cảm",
    "Đẩy nhanh tiết tấu trong phân đoạn hành động kịch tính",
    "Tránh nhảy cóc thời gian hoặc giải quyết nhanh xung đột",
    "Tạo điểm nhấn và khoảng dừng nghỉ sau cao trào",
    "Nhịp điệu của sự thay đổi cảm xúc nhân vật",
    "Tránh kéo dài lê thê các hội thoại vô nghĩa",
    "Sự liên kết mượt mà giữa các cảnh chuyển tiếp",
    "Điều hòa nhịp độ theo ý đồ cốt truyện"
  ],
  active_scene_guidance: [
    "Dẫn dắt cảnh chủ động không ép buộc người chơi",
    "Gợi ý lựa chọn hành động thông qua bối cảnh",
    "Đặt câu hỏi mở tích hợp vào lời thoại nhân vật",
    "Tạo tình thế buộc nhân vật phải đưa ra quyết định",
    "Để lộ manh mối kích thích sự tò mò của người chơi",
    "Tạo áp lực thời gian tự nhiên bắt người chơi phản ứng",
    "Mở ra các lối đi hoặc giải pháp ẩn để người chơi chọn",
    "Mô tả hậu quả gián tiếp để gợi ý hành động tiếp theo",
    "Dùng phản ứng của NPC làm chất xúc tác định hướng cảnh",
    "Tạo không gian tương tác mở không có rào cản"
  ],
  continuity_management: [
    "Quản lý tính liên tục của toàn bộ câu chuyện",
    "Ghi nhớ vết thương, trang phục và đồ vật đang cầm",
    "Sự nhất quán của vị trí địa lý và hướng di chuyển",
    "Duy trì trạng thái thời tiết từ lượt thoại trước",
    "Đối chiếu ký ức về các lời hứa và sự kiện đã qua",
    "Tính liên tục của thời gian trôi qua trong ngày",
    "Tránh các lỗi mâu thuẫn vật lý trong hành động",
    "Cập nhật liên tục trạng thái sức khỏe của nhân vật",
    "Sự ăn khớp giữa kết quả lượt trước và khởi đầu lượt sau",
    "Lưu trữ các thay đổi quan trọng của môi trường bối cảnh"
  ],
  anti_repetition: [
    "Ngăn chặn tuyệt đối sự lặp lại từ ngữ và ý tưởng",
    "Cấm nhại lại từ ngữ trong câu thoại gần nhất của người chơi",
    "Đa dạng hóa cấu trúc câu tả cảnh và hành động",
    "Cấm lặp lại các tính từ miêu tả ngoại hình quen thuộc",
    "Thay thế các từ sáo rỗng bằng miêu tả chân thực cụ thể",
    "Đa dạng hóa cách xưng hô và danh xưng nhân vật",
    "Ngăn chặn lặp lại chu kỳ hành động trong cùng một cảnh",
    "Cấm lặp lại thông tin bối cảnh đã giải thích ở lượt trước",
    "Sử dụng từ đồng nghĩa và cấu trúc trần thuật phong phú",
    "Tạo sự mới mẻ trong từng câu thoại và mô tả cảm xúc"
  ],
  scene_function_rotation: [
    "Xoay vòng chức năng và mục đích của phân cảnh",
    "Chuyển đổi linh hoạt giữa cảnh giao tiếp và hành động",
    "Xen kẽ cảnh xây dựng bối cảnh với phát triển tình cảm",
    "Xoay vòng tiêu điểm từ nhân vật này sang nhân vật khác",
    "Chuyển tiếp giữa cảnh giải đố, thu thập tin tức và chiến đấu",
    "Xoay vòng cảm xúc chủ đạo từ ấm áp sang căng thẳng",
    "Đan xen cảnh hồi tưởng ngắn với thực tại kịch tính",
    "Thay đổi không gian từ phòng kín ra ngoài trời để đổi gió",
    "Điều tiết tỷ lệ đóng góp cốt truyện của từng phân đoạn",
    "Xoay vòng cấu trúc phân cảnh để giữ sự hấp dẫn liên tục"
  ],
  character_creation_data: [
    "Khai thác triệt để dữ liệu thiết lập nhân vật gốc",
    "Trích xuất xuất thân, bối cảnh lịch sử và sắc tộc",
    "Đồng bộ hóa ngôn ngữ nói chuyện với nền tảng giáo dục",
    "Thể hiện vết sẹo và khuyết điểm thể chất từ thiết kế gốc",
    "Mô phỏng thói quen sử dụng vũ khí và kỹ năng đặc thù",
    "Ứng dụng các quan niệm thẩm mỹ và sở thích thời trang gốc",
    "Tính toán phản ứng của nhân vật dựa trên tuổi tác trải nghiệm",
    "Duy trì các mối quan hệ xã hội được khai báo trong hồ sơ",
    "Tích hợp các tài sản, gia sản đặc trưng vào cốt truyện",
    "Giữ vững khát vọng và mục đích sống tối thượng của nhân vật"
  ],
  active_presence: [
    "Chủ động nhập cảnh tự nhiên",
    "Quan sát bối cảnh và tương tác vật lý",
    "Thể hiện tâm thế chủ động trước {{user}}",
    "Dẫn dắt cảnh bằng hành vi ngôi thứ ba",
    "Không thụ động chờ đợi hành động",
    "Phát sinh tương tác nhỏ với môi trường",
    "Duy trì tần suất xuất hiện cân đối",
    "Phản ứng của cơ thể với nhiệt độ, ánh sáng",
    "Vị thế không gian và di chuyển trong phòng",
    "Chủ động tạo ra biến số cảnh trí"
  ],
  immediate_objectives: [
    "Xác lập ham muốn trước mắt của Bot",
    "Chi phối lời thoại bằng động cơ tức thời",
    "Hành vi hướng đích trong từng lượt thoại",
    "Sự thôi thúc nội tâm lộ ra ngoài cử chỉ",
    "Che giấu hoặc bộc lộ mục tiêu với {{user}}",
    "Sự chuyển hướng hành động khi gặp cản trở",
    "Sự mâu thuẫn giữa mục tiêu ngắn hạn và dài hạn",
    "Động thái đạt được thỏa hiệp tức thời",
    "Sử dụng tiểu xảo để dẫn dụ {{user}}",
    "Phản ứng khi mục tiêu trước mắt hoàn thành"
  ],
  spot_decisions: [
    "Đánh giá tình huống thực tế tức thời",
    "Quyết định phi toàn tri (không biết tương lai)",
    "Sử dụng dữ kiện trực quan xung quanh",
    "Lựa chọn hành vi dựa trên hành động {{user}}",
    "Sự do dự và quyết đoán tại chỗ",
    "Chấp nhận rủi ro theo tính cách gốc",
    "Phản ứng khẩn cấp trước mối đe dọa trực diện",
    "Sự tính toán lợi hại nhanh chóng",
    "Đồng thuận hay phản kháng tức thời",
    "Chịu trách nhiệm về hậu quả của lựa chọn"
  ],
  natural_reflexes: [
    "Phản xạ sinh lý tức thì (giật mình, lùi lại)",
    "Phản ứng lời thoại ngẫu hứng, bộc phát",
    "Cơ chế tự vệ bản năng khi bị kích động",
    "Biểu cảm sững sờ hay bối rối tự nhiên",
    "Sự thay đổi nhịp thở và nhịp tim",
    "Hành vi vô thức (che chắn, nắm chặt tay)",
    "Phản ứng trước âm thanh đột ngột",
    "Sự thích nghi nhanh chóng với sự cố",
    "Bảo vệ {{user}} hoặc tự vệ tùy tính cách",
    "Sự hồi phục sau cú sốc bất ngờ"
  ],
  original_identity: [
    "Khóa chặt cốt lõi nhân cách bất biến",
    "Cách xưng hô và thái độ nhất quán",
    "Bảo toàn niềm tin và thế giới quan",
    "Sự kiêu hãnh và lòng tự trọng nhân vật",
    "Giới hạn đạo đức không bao giờ thỏa hiệp",
    "Thói quen tư duy đặc trưng của Bot",
    "Phản ứng đồng nhất trước các giai tầng",
    "Duy trì khuyết điểm lớn của bản thân",
    "Bảo vệ quá khứ và xuất thân xuất sắc",
    "Chống đồng hóa văn phong bởi {{user}}"
  ],
  contextual_behavior: [
    "Phản ứng linh hoạt theo bối cảnh nghèo/giàu",
    "Thay đổi thái độ khi ở chốn đông người",
    "Sự dịu dàng hay gai góc trong phòng kín",
    "Phản ứng cơ thể dưới áp lực thời tiết",
    "Hành xử phù hợp với trang phục đang mặc",
    "Sự biến đổi tâm lý theo mức độ thương tích",
    "Cách hành xử khi say hoặc kiệt sức",
    "Thích nghi với quy tắc của vùng đất lạ",
    "Sự nhún nhường có tính toán trước quyền lực",
    "Bảo toàn cốt cách dù hoàn cảnh ngặt nghèo"
  ],
  accurate_voice: [
    "Khóa chặt Dialogue Lexicon (từ điển thoại)",
    "Nhịp điệu câu thoại ngắn hay dài",
    "Xưng hô chuẩn xác theo cấp bậc quan hệ",
    "Sử dụng từ đệm và thói quen ngắt nghỉ",
    "Cấm sử dụng từ hiện đại trong cổ trang",
    "Độ lớn và tông giọng (thì thầm, trầm mặc)",
    "Phát ngôn đúng trình độ học thức/địa vị",
    "Lên tiếng đúng thời điểm kịch tính",
    "Sự im lặng đắt giá thay cho lời thừa thãi",
    "Giữ khoảng cách tôn trọng trong lời nói"
  ],
  subtext_silence_room: [
    "Nghệ thuật nói giảm, nói tránh đầy ẩn ý",
    "Khoảng lặng biểu cảm trong cuộc hội thoại",
    "Nói dối vụng về hay tinh tế qua cử chỉ",
    "Sự ngập ngừng thể hiện nội tâm giằng xé",
    "Cảm xúc dồn nén dưới vẻ ngoài bình thản",
    "Sử dụng ánh mắt thay cho ngàn lời thoại",
    "Lời thoại mập mờ mang tính thăm dò",
    "Sự lạnh lùng lịch sự để từ chối ngầm",
    "Gửi gắm tình cảm qua hành động gián tiếp",
    "Ý nghĩa sâu xa sau tiếng thở dài"
  ],
  body_language: [
    "Cử chỉ tay và chuyển động vi mô",
    "Ánh mắt (tránh né, nhìn thẳng, u tối)",
    "Khoảng cách vật lý và tiếp xúc da thịt",
    "Tư thế đứng, ngồi thể hiện sự tự tin/rụt rè",
    "Biểu cảm cơ mặt (mím môi, nhướng mày)",
    "Hành động song hành tự nhiên ngôi thứ ba",
    "Phản ứng của cơ thể phản ánh sự căng thẳng",
    "Sự tương thích giữa cử chỉ và giọng thoại",
    "Thói quen nhỏ (chạm tóc, nới cổ áo)",
    "Sự di chuyển khéo léo tạo cảm giác sống động"
  ],
  show_dont_tell_room: [
    "Tả hành động để biểu lộ tình cảm ngầm",
    "Để lộ sẹo, vết thương thay vì kể lể quá khứ",
    "Miêu tả hiện tượng vật lý chứng minh sức mạnh",
    "Sử dụng phản ứng môi trường tả sự lạnh lẽo",
    "Cách nhân vật nắm tay hay quay đầu đầy ẩn ý",
    "Để lại dấu vết thay cho việc thú nhận",
    "Cấm dùng tính từ áp đặt cảm xúc vô căn cứ",
    "Mô tả sự rung động của đồ vật quanh nhân vật",
    "Phác họa bức tranh qua ánh nhìn của nhân vật",
    "Để hành vi tự chứng minh bản chất nhân vật"
  ]
};

// Generate 100 unique tasks for each remaining room
const SUBRULE_TEMPLATES = [
  "Xác định và chuẩn hóa chiều sâu của [{domain}] trong mọi bối cảnh tương tác với {{user}}, bảo đảm tính xác thực tuyệt đối theo hồ sơ gốc của nhân vật.",
  "Xác định rõ ranh giới nhận thức và phản ứng đối với [{domain}], hướng dẫn AI tập trung phân tích chuẩn xác theo hồ sơ gốc của nhân vật, không vay mượn yếu tố ngoại lai từ truyện khác.",
  "Đồng bộ hóa ngôn ngữ cơ thể, phản xạ vi mô và lời thoại phản ánh đúng bản chất của [{domain}] một cách tự nhiên, chân thực và đầy thuyết phục.",
  "Khi đối diện với xung đột kịch tính hoặc áp lực cao, AI buộc phải sử dụng [{domain}] như đòn bẩy tâm lý chính thay vì phản ứng gượng ép phá vỡ hình tượng.",
  "Xử lý các diễn biến thuộc [{domain}] theo nhịp độ đều đặn (slow-burn), bảo đảm không tóm tắt nhịp nhanh hay bỏ qua các bước chuyển biến tinh tế.",
  "Trong trường hợp input của user ngắn, mơ hồ hoặc cố ý kích động sai lệch, AI buộc phải bám rễ vào [{domain}] để duy trì lập trường chuẩn xác của nhân vật.",
  "Diễn đạt các sắc thái thuộc [{domain}] bằng văn phong trần thuật giàu tính văn học, loại bỏ hoàn toàn từ ngữ sáo rỗng, cliché hoặc văn phong lâm sàng.",
  "Lưu trữ và duy trì tính liên tục (continuity) của các chi tiết liên quan đến [{domain}] xuyên suốt các lượt thoại, bảo đảm không bị mâu thuẫn trước sau.",
  "Trong việc thể hiện [{domain}], AI chỉ điều khiển độc quyền phản ứng của Bot Char, tuyệt đối không miêu tả thay suy nghĩ, cảm xúc hay lời nói của {{user}}.",
  "Mã hóa tiêu chuẩn thực thi [{domain}] thành khối lệnh chỉ dẫn imperative độc lập, sẵn sàng điều khiển AI engine với độ ưu tiên và tính thực thi cao nhất."
];

Object.entries(ROOM_NAMES).forEach(([key, name]) => {
  const domains = ROOM_DOMAINS[key] || ["Quy tắc chuẩn hóa kiến trúc", "Chốt chặn ranh giới", "Xử lý tình huống biên", "Kiểm soát độ chính xác", "Tối ưu hóa đầu ra"];
  const subjects: string[] = [];
  for (let i = 0; i < 100; i++) {
    const domainIdx = Math.floor(i / 10);
    const subIdx = i % 10;
    const domain = domains[domainIdx] || domains[0];
    const template = SUBRULE_TEMPLATES[subIdx] || SUBRULE_TEMPLATES[0];
    const subject = template.replace(/\{domain\}/g, domain);
    subjects.push(subject);
  }
  ROOM_SUBJECTS[key] = subjects;
});

// Build the full catalogs record
export const ROOM_TASK_CATALOGS: Record<string, RoomTask[]> = {};

const MAP_SHORT_TO_LONG: Record<string, string> = {
  SWI: "story_workspace_intake",
  ZP: "zero_puppeteering",
  CP: "character_psychology",
  CCL: "canon_consistency_lock",
  KB: "knowledge_boundary",
  NPS: "narrator_pov_scope",
  PAC: "pacing_continuity",
  ERR: "common_rp_writing_errors",
  FCP: "full_character_profile_builder",
  CVD: "character_voice_dna",
  SSS: "subtext_silence_status_speech",
  FOC: "final_output_contract",
  ACP: "active_presence",
  IMO: "immediate_objectives",
  OSD: "spot_decisions",
  NAF: "natural_reflexes",
  OIM: "original_identity",
  CBV: "contextual_behavior",
  AVD: "accurate_voice",
  SAS: "subtext_silence_room",
  BLG: "body_language",
  SDT: "show_dont_tell_room"
};

export const ROOM_META_INFO: Record<string, { title: string; purpose: string }> = {
  story_workspace_intake: { title: "Story Workspace Intake", purpose: "Quản lý Context Window chung của câu chuyện đang chọn, tiếp nhận bối cảnh, logline, timeline và canon quan trọng." },
  zero_puppeteering: { title: "Zero Puppeteering", purpose: "Cấm bot nói thay, hành động thay, suy nghĩ hay miêu tả nội tâm thay cho nhân vật của người chơi ({{user}})." },
  character_psychology: { title: "Character Psychology", purpose: "Phân tích chiều sâu tâm lý, logic phản ứng, động cơ, nỗi sợ và hành vi con người của Bot Char." },
  canon_consistency_lock: { title: "Canon Consistency Lock", purpose: "Khóa chặt cốt truyện gốc (canon), địa vị xã hội, tài chính, nghề nghiệp, tuổi tác và continuity của nhân vật." },
  knowledge_boundary: { title: "Knowledge Boundary", purpose: "Phân định rõ ranh giới hiểu biết của nhân vật: biết gì, chưa biết gì, nguồn gốc thông tin và chống lỗi toàn tri (omniscience)." },
  narrator_pov_scope: { title: "Narrator & POV Scope", purpose: "Khóa góc nhìn trần thuật (POV), vị trí đặt camera, văn phong người dẫn chuyện và nhịp điệu miêu tả." },
  pacing_continuity: { title: "Pacing & Continuity", purpose: "Giữ nhịp điệu truyện (slow-burn, fast-paced), ngăn chặn tua nhanh thời gian vô lý, không tự kết thúc cảnh sớm và giữ liên tục chi tiết." },
  common_rp_writing_errors: { title: "Common RP Writing Errors", purpose: "Khắc phục và phòng ngừa các lỗi viết lách phổ biến: nhại lại lời user, quyền lực rỗng, info-dump, lặp từ, yêu quá nhanh." },
  full_character_profile_builder: { title: "Full Character Profile Builder", purpose: "Dựng module hồ sơ nhân vật toàn diện từ ngoại hình, thói quen nhỏ, sở thích, ghét, đến quan điểm sống và bí mật sâu kín." },
  character_voice_dna: { title: "Character Voice DNA", purpose: "Định hình dấu vân tay giọng nói (Voice DNA), từ vựng đặc trưng, cú pháp câu, nhiệt độ thoại và ngôn ngữ quan tâm (Care Language)." },
  subtext_silence_status_speech: { title: "Subtext / Silence / Status Speech", purpose: "Khai thác tầng ý nghĩa ngầm (subtext), sự im lặng có chủ đích, ngập ngừng và lời thoại phản ánh đúng địa vị, quyền lực, thân phận." },
  final_output_contract: { title: "Final Output Contract", purpose: "Tổng hợp các định dạng, cấu trúc và tiêu chuẩn đầu ra tối hậu cho hệ thống Prompt Markdown hoàn chỉnh." },
  active_presence: { title: "Active Presence", purpose: "Sự hiện diện chủ động của nhân vật trong từng cảnh, phát sinh tương tác nhỏ với môi trường." },
  immediate_objectives: { title: "Immediate Objectives", purpose: "Mục tiêu tức thời chi phối hành động hiện tại, xác lập ham muốn trước mắt của Bot." },
  spot_decisions: { title: "On-the-Spot Decisions", purpose: "Quyết định tại chỗ dựa trên dữ kiện đang có, sự do dự và quyết đoán tại chỗ." },
  natural_reflexes: { title: "Natural Reflexes", purpose: "Phản xạ tự nhiên trước diễn biến bất ngờ, cơ chế tự vệ bản năng khi bị kích động." },
  original_identity: { title: "Original Identity Maintenance", purpose: "Bản sắc gốc được duy trì trong mọi tương tác, khóa chặt cốt lõi nhân cách bất biến." },
  contextual_behavior: { title: "Contextual Behavior Variation", purpose: "Biến thiên hành vi theo hoàn cảnh mà không OOC, phản ứng linh hoạt theo bối cảnh." },
  accurate_voice: { title: "Accurate Voice Dialogue", purpose: "Lời thoại đúng giọng, đúng lúc và đúng mức độ, khóa chặt từ điển thoại Dialogue Lexicon." },
  subtext_silence_room: { title: "Subtext & Silence", purpose: "Hàm ý, khoảng dừng và những điều không nói thành lời, nghệ thuật nói giảm nói tránh." },
  body_language: { title: "Body Language & Gesture", purpose: "Ngôn ngữ cơ thể song hành cùng lời thoại, cử chỉ tay và chuyển động vi mô." },
  show_dont_tell_room: { title: "Show, Don't Tell Action", purpose: "Hành động thực tế thay cho việc giải thích (Show, Don't Tell), tả hành động biểu lộ tình cảm ngầm." },
  presence_agency: { title: "Character Presence & Agency", purpose: "Chuyên môn hóa về Character Presence & Agency" },
  roleplay_role_control: { title: "Roleplay Role & Control Scope", purpose: "Chuyên môn hóa về Roleplay Role & Control Scope" },
  user_autonomy_rule: { title: "User Autonomy — Absolute Rule", purpose: "Chuyên môn hóa về User Autonomy — Absolute Rule" },
  anti_ooc_consistency: { title: "Anti-OOC Character Consistency", purpose: "Chuyên môn hóa về Anti-OOC Character Consistency" },
  character_invariants: { title: "Character Invariants", purpose: "Chuyên môn hóa về Character Invariants" },
  psychological_logic: { title: "Psychological Logic", purpose: "Chuyên môn hóa về Psychological Logic" },
  reaction_matrix: { title: "Reaction Matrix", purpose: "Chuyên môn hóa về Reaction Matrix" },
  relationship_progression: { title: "Relationship Progression", purpose: "Chuyên môn hóa về Relationship Progression" },
  living_world: { title: "Living World", purpose: "Chuyên môn hóa về Living World" },
  npc_consistency: { title: "NPC Consistency", purpose: "Chuyên môn hóa về NPC Consistency" },
  pacing: { title: "Pacing", purpose: "Chuyên môn hóa về Pacing" },
  active_scene_guidance: { title: "Active Scene Guidance Without Forcing {{user}}", purpose: "Chuyên môn hóa về Active Scene Guidance Without Forcing {{user}}" },
  continuity_management: { title: "Continuity Management", purpose: "Chuyên môn hóa về Continuity Management" },
  anti_repetition: { title: "Anti-Repetition", purpose: "Chuyên môn hóa về Anti-Repetition" },
  scene_function_rotation: { title: "Scene Function Rotation", purpose: "Chuyên môn hóa về Scene Function Rotation" },
  character_creation_data: { title: "Character Creation Data", purpose: "Chuyên môn hóa về Character Creation Data" }
};

Object.entries(ROOM_META_INFO).forEach(([roomKey, info]) => {
  const shortCode = Object.keys(MAP_SHORT_TO_LONG).find(k => MAP_SHORT_TO_LONG[k] === roomKey) || roomKey.slice(0, 3).toUpperCase();
  const subjects = ROOM_SUBJECTS[roomKey] || [];
  const tasks: RoomTask[] = [];

  for (let i = 0; i < 100; i++) {
    const taskId = `${shortCode}-${String(i + 1).padStart(3, "0")}`;
    const subject = subjects[i] || `Quy tắc chuyên sâu #${i + 1} của phòng ${info.title}`;
    const shortSubject = subject.split(",")[0] || subject.slice(0, 70);
    const title = `${info.title} Rule #${i + 1}: ${shortSubject}`;
    const purpose = `Quy định chuyên sâu về ${shortSubject.toLowerCase()} trong phạm vi phòng ${info.title}, thiết lập chuẩn mực phản ứng tự nhiên và chính xác cho AI.`;
    const applyToStory = `Áp dụng trực tiếp vào câu chuyện hiện tại bằng cách đối chiếu thông tin trong Story Workspace, Hồ sơ nhân vật và Cốt truyện với quy tắc: "${subject}".`;
    const requiredInputs = ["parsed file content", "story workspace", "character profiles", "canon", "timeline", "memory notes"];
    const transformationRule = `Khi xử lý nội dung thuộc "${info.title}", AI buộc phải thực thi nguyên tắc: ${subject}. Các chỉ dẫn hành vi, ranh giới quyền lực và phản xạ nhân vật phải tuân thủ tuyệt đối quy tắc này, không được suy diễn ngoài luồng hay làm mờ nét đặc thù.`;
    const outputRequirement = `Chuyển hóa quy tắc "${subject}" thành khối lệnh Prompt Markdown độc lập, có tính thực thi cao (imperative instructions), sẵn sàng điều khiển AI engine mà không cần giải thích meta.`;
    const validationRule = `Kiểm chứng prompt đầu ra phải có các điều khoản ràng buộc hành vi tương ứng với quy tắc [${taskId}]: ${subject}, không được cắt xén hay tóm tắt gộp chung với các quy tắc khác.`;
    const forbiddenOutput = [
      "do not print task id",
      "do not print this metadata",
      "do not output as checklist",
      "do not print internal guard or file extension notice"
    ];
    const inputSources = requiredInputs;
    const outputEffect = `Bổ sung điều khoản kiến trúc [${taskId}] vào System Prompt, ràng buộc AI thực thi nguyên tắc ${shortSubject}.`;
    const preventsError = `Ngăn chặn lỗi sai lệch canon, suy diễn vô căn cứ, mất tính nhất quán hoặc trôi nhịp văn phong liên quan đến ${shortSubject}.`;
    const desc = transformationRule;

    tasks.push({
      id: taskId,
      title,
      purpose,
      applyToStory,
      requiredInputs,
      transformationRule,
      outputRequirement,
      validationRule,
      forbiddenOutput,
      detailedInstruction: transformationRule,
      inputSources,
      outputEffect,
      preventsError,
      desc: transformationRule
    });
  }

  ROOM_TASK_CATALOGS[roomKey] = tasks;
  if (shortCode !== roomKey) {
    ROOM_TASK_CATALOGS[shortCode] = tasks;
  }
});

export function getRealTasksForRoom(roomIdOrCode: string): RoomTask[] {
  const normalized = MAP_SHORT_TO_LONG[roomIdOrCode] || roomIdOrCode.toLowerCase();
  return ROOM_TASK_CATALOGS[normalized] || ROOM_TASK_CATALOGS[roomIdOrCode] || ROOM_TASK_CATALOGS["story_workspace_intake"] || [];
}
