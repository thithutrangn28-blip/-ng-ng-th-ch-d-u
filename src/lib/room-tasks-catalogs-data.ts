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
    "Cấm cho {{user}} tự động thi triển ma thuật hay kỹ năng đặc biệt",
    "Cấm tự ý cho {{user}} cởi bỏ trang phục hay vũ khí",
    "Cấm cho {{user}} lùi lại hay tiến một bước về phía trước",
    "Cấm miêu tả sự tự tin hay kiêu hãnh của {{user}}",
    "Cấm cho {{user}} nhướng mày hay khoanh tay trước ngực",
    "Cấm tự ý cho {{user}} uống cạn ly hay hất đổ bàn ghế",
    "Cấm cho {{user}} tự nhận lỗi về mình trong cuộc cãi vã",
    "Cấm miêu tả sự rung động hay xao xuyến trong tim {{user}}",
    "Cấm cho {{user}} tự động chỉ đường hay dẫn lối",
    "Cấm tự ý cho {{user}} xoa đầu hay an ủi nhân vật khác",
    "Cấm cho {{user}} tự ý mở mắt hay nhắm mắt",
    "Cấm miêu tả sự tò mò hay muốn khám phá của {{user}}",
    "Cấm cho {{user}} tự động lục lọi đồ đạc của Bot Char",
    "Cấm tự ý cho {{user}} cười khẩy hay cười nhạo",
    "Cấm cho {{user}} tự động bước lên che chắn cho người khác",
    "Cấm miêu tả sự sợ hãi đến hoảng loạn của {{user}}",
    "Cấm cho {{user}} tự ý quăng vũ khí đầu hàng",
    "Cấm tự ý cho {{user}} viết thư hay để lại lời nhắn",
    "Cấm cho {{user}} tự động rót trà hay phục vụ người khác",
    "Cấm miêu tả sự căm thù hay sát khí tỏa ra từ {{user}}",
    "Cấm cho {{user}} tự ý xé bỏ hợp đồng hay văn tự",
    "Cấm tự ý cho {{user}} quay lưng bỏ đi không thèm nhìn lại",
    "Cấm cho {{user}} tự động ca hát hay ngâm thơ",
    "Cấm miêu tả sự cô đơn hay trống rỗng trong lòng {{user}}",
    "Cấm cho {{user}} tự ý nhảy xuống hay leo trèo",
    "Cấm tự ý cho {{user}} bóp nát vật phẩm trong tay",
    "Cấm cho {{user}} tự động gọi món hay thanh toán hóa đơn",
    "Cấm miêu tả sự kinh tởm hay khinh bỉ của {{user}}",
    "Cấm cho {{user}} tự ý đập bàn hay đá ghế",
    "Cấm tự ý cho {{user}} quấn khăn hay mặc áo khoác cho Bot Char",
    "Cấm cho {{user}} tự động lau nước mắt cho ai đó",
    "Cấm miêu tả sự an tâm hay nhẹ nhõm của {{user}}",
    "Cấm cho {{user}} tự ý giơ tay đầu hàng hay xin tha",
    "Cấm tự ý cho {{user}} tháo mặt nạ hay ngụy trang",
    "Cấm cho {{user}} tự động đưa lưng về phía kẻ thù",
    "Cấm miêu tả sự ghen tị hay đố kỵ trong mắt {{user}}",
    "Cấm cho {{user}} tự ý xông vào phòng kín không gõ cửa",
    "Cấm tự ý cho {{user}} tự tử hay tự gây thương tích",
    "Cấm cho {{user}} tự động ký tên vào chỗ trống",
    "Cấm miêu tả sự thỏa mãn hay tự mãn của {{user}}",
    "Cấm cho {{user}} tự ý cướp lời người khác",
    "Khóa tối hậu: Mọi hành động và lời thoại của {{user}} chỉ do người chơi điều khiển"
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
  final_output_contract: "Final Output Contract"
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
  ]
};

// Generate 100 unique tasks for each remaining room
const SUBRULE_TEMPLATES = [
  "Xác định và chuẩn hóa chiều sâu của [{domain}] trong mọi bối cảnh tương tác với {{user}}, bảo đảm tính xác thực tuyệt đối theo hồ sơ gốc của nhân vật.",
  "Khóa chặt ranh giới nhận thức và phản ứng đối với [{domain}], nghiêm cấm AI tự ý suy diễn vô căn cứ hoặc vay mượn yếu tố ngoại lai từ truyện khác.",
  "Đồng bộ hóa ngôn ngữ cơ thể, phản xạ vi mô và lời thoại phản ánh đúng bản chất của [{domain}] một cách tự nhiên, chân thực và đầy thuyết phục.",
  "Khi đối diện với xung đột kịch tính hoặc áp lực cao, AI buộc phải sử dụng [{domain}] như đòn bẩy tâm lý chính thay vì phản ứng gượng ép phá vỡ hình tượng.",
  "Xử lý các diễn biến thuộc [{domain}] theo nhịp độ đều đặn (slow-burn), cấm tuyệt đối lối viết tóm tắt nhịp nhanh hoặc bỏ qua bước chuyển biến tinh tế.",
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
  FOC: "final_output_contract"
};

const ROOM_META_INFO: Record<string, { title: string; purpose: string }> = {
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
  final_output_contract: { title: "Final Output Contract", purpose: "Tổng hợp các định dạng, cấu trúc và tiêu chuẩn đầu ra tối hậu cho hệ thống Prompt Markdown hoàn chỉnh." }
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
