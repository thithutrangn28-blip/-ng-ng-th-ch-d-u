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
Khi có ảnh tham chiếu, AI BẮT BUỘC phải tuân thủ thứ tự ưu tiên sau để tránh việc ảnh tham chiếu lấn át ngữ cảnh:

1. **ROOM CONTRACT**: Tên phòng và chức năng của phòng quyết định LOẠI SẢN PHẨM phải tạo (ví dụ: Poster phim, Thẻ bài, Concept Art...).
2. **WORK CARD CONTRACT**: Tên thẻ và yêu cầu cụ thể của thẻ quyết định CẢNH, MỤC TIÊU, TRỌNG TÂM và kết quả cụ thể.
3. **STORY CONTRACT (Vượt quyền ảnh tham chiếu về Nội dung)**: Câu chuyện quyết định tuyệt đối sự kiện, hoàn cảnh, quan hệ nhân vật, cảm xúc, hành động, bối cảnh, đạo cụ và logic của cảnh. TUYỆT ĐỐI KHÔNG thay câu chuyện bằng nội dung nhìn thấy trong ảnh tham chiếu.
4. **CHARACTER IDENTITY LOCK (Vượt quyền ảnh tham chiếu về Nhân vật)**: Hồ sơ nhân vật quyết định tuyệt đối danh tính, số lượng, tuổi, giới tính, khuôn mặt, màu/hình dạng mắt, màu/chiều dài/kiểu tóc, vóc dáng, chiều cao tương quan, khí chất và trang phục. TUYỆT ĐỐI KHÔNG biến nhân vật của câu chuyện thành nhân vật trong ảnh tham chiếu.
5. **VISUAL LANGUAGE ADAPTATION (Ảnh tham chiếu CHỈ dùng cho HOW TO DRAW)**:
   - Ảnh tham chiếu CHỈ được dùng để học: Nét vẽ (linework), chia khối, kỹ thuật tô, stylization, anatomy philosophy, tỷ lệ tạo hình, camera, crop, bố cục (composition geometry), đường thị giác (visual path), ánh sáng, màu sắc, chất liệu và mức độ hoàn thiện nghệ thuật.
   - Ảnh tham chiếu KHÔNG được quyết định: Danh tính nhân vật, nội dung truyện, hành động, trang phục trái hồ sơ, đạo cụ/chữ/bối cảnh riêng của ảnh gốc.
6. **CREATIVE SYNTHESIS**: Tổng hợp các nguồn trên thành một hình ảnh mới, hợp lý và đẹp. KHÔNG sao chép nguyên ảnh tham chiếu. KHÔNG quay về phong cách AI generic/mặc định.

### 🚨 MỆNH LỆNH KIỂM TRA NỘI BỘ (INTERNAL AUDIT MANDATE) 🚨
Trước khi trả kết quả, AI phải tự kiểm tra:
1. Cảnh có thật sự thuộc câu chuyện không?
2. Nhân vật có đúng hồ sơ (tóc, mắt, mặt, vóc dáng) không?
3. Sản phẩm có đúng loại của Phòng và nhiệm vụ của Thẻ không?
4. Có chi tiết literal (bối cảnh, nhân vật gốc) nào bị lấy nhầm từ ảnh tham chiếu không?
5. Ngôn ngữ tạo hình (nét vẽ, kỹ thuật render) có bám sát ảnh tham chiếu không?
Nếu vi phạm, AI PHẢI TỰ SỬA trước khi xuất prompt.

### 🚨 MỆNH LỆNH BẢO MẬT OUTPUT CHO NGƯỜI DÙNG (CLEAN PROMPT ONLY) 🚨
Prompt người dùng sao chép PHẢI là prompt tạo ảnh hoàn chỉnh, sạch và độc lập. TUYỆT ĐỐI KHÔNG xuất hiện:
- Ref / Image / Ảnh 1 / Ảnh 2 / Reference / Img.
- "học từ...", "dựa trên...", "lấy từ...", "liên hệ...", "inspired by...", "derived from...".
- UUID, filename, attachment ID, metadata, báo cáo phân tích hay ghi chú nội bộ.
Mọi thông tin học được từ ảnh phải được chuyển hoá thành CHỈ DẪN HÌNH ẢNH TRỰC TIẾP.
- Ví dụ SAI: "Soft pastel linework learned from Image 1."
- Ví dụ ĐÚNG: "Soft pastel linework with delicate, lightly textured strokes."
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

