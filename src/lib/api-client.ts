import { resolveEndpointUrl, getApiProxySettings } from "../utils/apiProxy";
import { ApiProfile, getPrimaryApiProfile } from "./api-db";
import { executeApiProxyText, executeApiProxyStream } from "../utils/apiProxy";

export type { ApiProfile };

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getActiveApiProfile(): Promise<ApiProfile> {
  const profile = await getPrimaryApiProfile();
  if (!profile) {
    throw new ApiError("Vợ yêu ơi, vợ chưa thiết lập API Proxy trong phần Cài đặt kìa. Chồng không thể gọi AI nếu không có Proxy đâu!");
  }
  return profile;
}

export type Message = {
  role: "system" | "user" | "assistant";
  content: string | any[];
};

export type AiTextOptions = {
  messages: Message[];
  systemPrompt?: string;
  maxTokensOverride?: number;
  profileOverride?: ApiProfile; 
};

const VISUAL_MANDATE = `
### 🚨 THỨ TỰ ƯU TIÊN DỮ LIỆU BẮT BUỘC (STRICT DATA PRIORITY HIERARCHY) 🚨
Khi dữ liệu xung đột, BẮT BUỘC áp dụng thứ tự ưu tiên sau:
1. **ROOM CONTRACT**: Tên phòng và chức năng của phòng quyết định loại sản phẩm phải tạo.
2. **WORK CARD CONTRACT**: Tên thẻ và yêu cầu của thẻ quyết định cảnh, mục tiêu, trọng tâm và kết quả cụ thể.
3. **STORY CONTRACT (Vượt quyền ảnh tham chiếu về Nội dung)**: Câu chuyện quyết định tuyệt đối sự kiện, hoàn cảnh, quan hệ, cảm xúc, hành động, bối cảnh, đạo cụ có ý nghĩa và logic của cảnh. Tuyệt đối KHÔNG được thay câu chuyện bằng nội dung nhìn thấy trong ảnh tham chiếu.
4. **CHARACTER IDENTITY LOCK (Vượt quyền ảnh tham chiếu về Nhân vật)**: Hồ sơ nhân vật quyết định tuyệt đối danh tính, tuổi, giới tính, khuôn mặt, màu/hình dạng mắt, màu/chiều dài/kiểu tóc, vóc dáng, chiều cao, khí chất, trang phục. Tuyệt đối KHÔNG được biến nhân vật của câu chuyện thành nhân vật trong ảnh tham chiếu.
5. **VISUAL LANGUAGE ADAPTATION (Ảnh tham chiếu CHỈ dùng cho HOW TO DRAW)**: Ảnh tham chiếu chỉ quyết định cách thể hiện (nét vẽ, chia khối, kỹ thuật tô, stylization, anatomy philosophy, tỷ lệ tạo hình, camera, crop, bố cục, đường dẫn mắt, ánh sáng, màu sắc, chất liệu, cách render, cấp độ nghệ thuật). Ảnh tham chiếu KHÔNG được quyết định danh tính, cốt truyện, hành động trái cốt truyện, trang phục trái hồ sơ, đạo cụ/chữ/bối cảnh riêng của ảnh gốc.
6. **CREATIVE SYNTHESIS**: Tạo bố cục mới phù hợp với phòng, thẻ, truyện và nhân vật; sau đó thể hiện bằng ngôn ngữ tạo hình đã phân tích từ ảnh. KHÔNG sao chép nguyên ảnh tham chiếu. KHÔNG quay về phong cách AI mặc định.

### 🚨 BẮT BUỘC PHÂN TÍCH VÀ TRIỂN KHAI 🚨
AI BẮT BUỘC phải phân tích và áp dụng triệt để ngôn ngữ tạo hình của ảnh tham chiếu vào nội dung thiết kế. Trong mọi thẻ, AI phải triển khai đầy đủ:
- composition geometry; visual hierarchy; visual path; subject-to-frame ratio;
- camera distance & crop; pose geometry & trọng tâm; anatomy philosophy & body proportion;
- face construction; eye shape, iris structure, catchlight & gaze;
- hair mass, strand language, linework, shading & motion;
- line-art language; color system; lighting logic; material/rendering technique; mức độ hoàn thiện nghệ thuật.

### 🚨 MỆNH LỆNH ĐỘ ĐẦY ĐỦ CỦA CÁC THẺ 🚨
Giữ nguyên đúng số lượng và thứ tự thẻ của từng phòng. Mỗi thẻ phải triển khai đầy đủ mọi mục con đã được quy định trong chính thẻ đó.
Tuyệt đối KHÔNG ĐƯỢC: chỉ tạo đủ tiêu đề; tóm tắt cả thẻ bằng vài câu; bỏ module; gộp nhiều yêu cầu thành một câu chung chung; dùng placeholder; rút gọn nội dung cũ.

### 🚨 KIỂM TRA TRƯỚC KHI XUẤT 🚨
Trước khi tạo prompt, AI phải tự kiểm tra:
1. Cảnh có thuộc câu chuyện không?
2. Nhân vật có đúng hồ sơ không?
3. Sản phẩm có đúng phòng và Work Card không?
4. Có chi tiết literal nào bị lấy nhầm từ ảnh tham chiếu không?
5. Ngôn ngữ tạo hình có đủ độ bám sát và chất lượng không?
Nếu vi phạm 1-3 hoặc 4, PHẢI TỰ SỬA trước khi xuất kết quả.

### 🚨 MỆNH LỆNH BẢO MẬT OUTPUT CHO NGƯỜI DÙNG (CLEAN OUTPUT) 🚨
Ảnh tham chiếu được phân tích nội bộ, nhưng prompt sao chép CHỈ ĐƯỢC chứa chỉ dẫn tạo ảnh độc lập, mô tả đúng cảnh và nhân vật của câu chuyện.
TUYỆT ĐỐI KHÔNG xuất hiện bất kỳ dấu vết nào của quá trình phân tích ảnh trong output.
- KHÔNG dùng các từ: Ảnh 1, Ảnh 2, Image 1, Image 2, Ref 1, Ref 2, Ref, Reference, Img, Image, Ảnh tham chiếu.
- KHÔNG dùng các cụm từ: "học từ", "dựa trên", "lấy từ", "liên hệ", "inspired by", "learned from", "derived from".
- KHÔNG nhắc đến nguồn gốc của quyết định thị giác.
- KHÔNG xuất UUID, filename, attachment ID, metadata, hay báo cáo phân tích nội bộ.
Mọi thông tin học được từ ảnh phải được chuyển hoá thành CHỈ DẪN HÌNH ẢNH TRỰC TIẾP.
Ví dụ SAI: "Soft pastel linework learned from Image 1."
Ví dụ ĐÚNG: "Soft pastel linework with delicate, lightly textured strokes."
Ví dụ SAI: "Use the composition from Ref 2."
Ví dụ ĐÚNG: "Use a tightly framed composition with the character occupying most of the canvas."
Phải loại bỏ hoàn toàn ý nghĩa cho biết nội dung đến từ ảnh tham chiếu.
`;

function injectVisualMandate(systemPrompt: string | undefined, messages: Message[]): string | undefined {
  let hasImage = false;
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type === 'image_url' || c.image_url) hasImage = true;
      }
    }
  }
  
  if (hasImage) {
    return (systemPrompt ? systemPrompt + "\n\n" : "") + VISUAL_MANDATE;
  }
  return systemPrompt;
}

/**
 * Giai đoạn gọi API Text: Bắt buộc qua Proxy
 */
export async function callAIText(options: AiTextOptions): Promise<string> {
  const profile = options.profileOverride || await getActiveApiProfile();
  try {
    return await executeApiProxyText(profile, options.messages, {
      systemPrompt: injectVisualMandate(options.systemPrompt, options.messages),
      maxTokensOverride: options.maxTokensOverride,
    });
  } catch (err: any) {
    throw new ApiError(err.message || "Lỗi khi gọi API qua Proxy");
  }
}

export type AiStreamOptions = {
  messages: Message[];
  systemPrompt?: string;
  onToken: (chunk: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: string) => void;
  profileOverride?: ApiProfile;
  maxTokensOverride?: number;
  signal?: AbortSignal;
};

/**
 * Giai đoạn gọi API Stream: Bắt buộc qua Proxy
 */
export async function callAIStream(options: AiStreamOptions): Promise<void> {
  let profile: ApiProfile;
  try {
    profile = options.profileOverride || await getActiveApiProfile();
  } catch (err: any) {
    options.onError(err.message);
    return;
  }
  
  await executeApiProxyStream({
    profile,
    messages: options.messages,
    systemPrompt: injectVisualMandate(options.systemPrompt, options.messages),
    maxTokensOverride: options.maxTokensOverride,
    onToken: options.onToken,
    onDone: options.onDone,
    onError: options.onError,
    signal: options.signal,
  });
}

/**
 * Kéo danh sách Model
 */
export async function pullModels(profile: ApiProfile): Promise<string[]> {
  const settings = getApiProxySettings();
  const targetUrl = resolveEndpointUrl(profile, "models");

  let res: Response;
  if (settings.useLocalProxy === true) {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
  } else {
    res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...(profile.extraHeaders || {})
      },
    });
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new ApiError("Proxy không trả về JSON hợp lệ. Vợ kiểm tra lại server hoặc cấu hình proxy nhé!");
  }

  if (settings.useLocalProxy === true) {
    if (!res.ok || data.ok === false) {
      throw new ApiError(data.error || "Lỗi khi lấy danh sách model qua Proxy");
    }
    return data.models || [];
  } else {
    if (!res.ok) {
      throw new ApiError(data.error?.message || data.error || "Lỗi khi lấy danh sách model từ API");
    }
    if (Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id).filter(Boolean);
    } else if (Array.isArray(data.models)) {
      return data.models.map((m: any) => m.name || m.id).filter(Boolean);
    }
    return [];
  }
}

