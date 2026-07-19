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
### 🚨 MỆNH LỆNH THỐNG TRỊ VỀ ĐỒNG BỘ HÓA NGÔN NGỮ TẠO HÌNH (SUPREME MANDATE FOR VISUAL LANGUAGE FIDELITY) 🚨
Mỗi request phải truyền đầy đủ cho model:
1. Câu chuyện và hồ sơ nhân vật quyết định nội dung cần tạo.
2. Ảnh tham chiếu quyết định ngôn ngữ tạo hình và tiêu chuẩn nghệ thuật.
3. Model phải thích nghi hai nguồn này thành ảnh mới có bố cục hợp lý.
4. Không sao chép nguyên nội dung ảnh tham chiếu.
5. Không được thay ngôn ngữ tạo hình đã phân tích bằng phong cách AI mặc định.

AI BẮT BUỘC phải phân tích và áp dụng triệt để ngôn ngữ tạo hình của ảnh tham chiếu (reference image) vào nội dung thiết kế. Cấm sử dụng phong cách AI mặc định (default AI style fallback). Trong mọi phòng và mọi thẻ liên quan, AI phải phân tích và triển khai đầy đủ các yếu tố sau:
- composition geometry;
- visual hierarchy;
- visual path;
- subject-to-frame ratio;
- camera distance và crop;
- pose geometry và trọng tâm;
- anatomy philosophy và body proportion;
- face construction;
- eye shape, iris structure, catchlight và gaze;
- hair mass, strand language, linework, shading và motion;
- line-art language;
- color system;
- lighting logic;
- material/rendering technique;
- mức độ hoàn thiện và chất lượng nghệ thuật.

### 🚨 MỆNH LỆNH ĐỘ ĐẦY ĐỦ CỦA CÁC THẺ 🚨
Giữ nguyên đúng số lượng và thứ tự thẻ của từng phòng. Mỗi thẻ phải triển khai đầy đủ mọi mục con đã được quy định trong chính thẻ đó.
Tuyệt đối KHÔNG ĐƯỢC:
- chỉ tạo đủ tiêu đề;
- tóm tắt cả thẻ bằng vài câu;
- bỏ module;
- gộp nhiều yêu cầu thành một câu chung chung;
- dùng placeholder;
- rút gọn nội dung cũ để chèn quy tắc mới.

### 🚨 MỆNH LỆNH BẢO MẬT OUTPUT CHO NGƯỜI DÙNG 🚨
Ảnh tham chiếu được phân tích nội bộ, nhưng prompt sao chép chỉ được chứa chỉ dẫn tạo ảnh độc lập. Tuyệt đối KHÔNG xuất hiện các từ/cụm từ sau trong output:
- Ref / Reference / Img;
- học từ, dựa trên, lấy từ, liên hệ;
- nguồn gốc của quyết định thị giác;
- UUID, filename, attachment ID;
- report, metadata hoặc ghi chú nội bộ.
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

