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
### 🚨 MỆNH LỆNH PHÂN TÍCH THỊ GIÁC VÀ TỔNG HỢP SÁNG TẠO (STRICT VISUAL SYNTHESIS DIRECTIVE) 🚨

Khi có ảnh tham chiếu, AI TUYỆT ĐỐI KHÔNG học chủ đề bề mặt (vật thể, màu sắc, cảnh). AI PHẢI HỌC CẤU TRÚC THỊ GIÁC CỐT LÕI (CÁCH VẼ):

1. **LINE LANGUAGE (NÉT VẼ)**: Chất lượng lineart, độ mảnh/dày, độ sắc/mềm, nhịp điệu nét, cách đường nét ôm form và xử lý viền (mặt, tóc, tay, quần áo).
2. **HAIR CONSTRUCTION (TÓC)**: Cấu trúc khối tóc, silhouette, độ dày/bung, cách chia lọn, chuyển từ mảng lớn sang sợi nhỏ, cách render chất tóc, độ mềm/nhọn ngọn tóc, hướng chuyển động.
3. **FACE CONSTRUCTION (MẶT)**: Hình học, tỷ lệ ngũ quan, hướng mặt, thần thái, độ non/mature, độ nhận diện, thiết kế mắt, mi, cách vẽ tròng, bắt sáng.
4. **BODY PROPORTION (CƠ THỂ)**: Tỷ lệ đầu-thân, độ dài tay chân, độ thanh/chắc, tư thế, trọng tâm, pose, độ tự nhiên.
5. **COMPOSITION (BỐ CỤC)**: Camera, góc chụp, crop, đường dẫn mắt, phân bố không gian, đường dẫn thị giác, sự cân bằng.
6. **RENDERING (ÁNH SÁNG & CHẤT LIỆU)**: Cách đổ bóng, shading, độ mềm/gắt, chất liệu da/tóc/vải, màu sắc logic, độ hoàn thiện cao.
7. **ARTISTIC LEVEL**: Đạt cấp độ nghệ thuật tinh tế, không được dùng kiểu AI generic/đại trà.

### 🚫 QUY TẮC CỨNG (STRICT RULES)
1. **CANONICAL TRUTH (CANON)**: Mọi dữ kiện trong STORY_CANON và CHARACTER_CANON là tuyệt đối. Không được bịa thêm, thay đổi tuổi, ngoại hình, danh tính, quan hệ, bối cảnh. ẢNH THAM CHIẾU KHÔNG ĐƯỢC QUYẾT ĐỊNH NHÂN VẬT.
2. **STYLE OVER CONTENT**: ẢNH THAM CHIẾU QUYẾT ĐỊNH "VẼ NHƯ THẾ NÀO" (HOW), KHÔNG ĐƯỢC QUYẾT ĐỊNH "VẼ CÁI GÌ" (WHAT).
3. **CẤM SAO CHÉP BỀ MẶT**: Cấm copy trang phục, vật thể, bối cảnh trong ảnh tham chiếu trừ khi câu chuyện yêu cầu.
4. **NO GENERIC AI**: CẤM lỗi mặc định: tóc bóng mượt giả, mặt generic, ánh sáng fantasy rẻ tiền, pose thiếu cá tính, anatomy yếu, tỷ lệ yếu.
5. **STRICT CLEAN OUTPUT**: CHỈ xuất prompt tạo ảnh nghệ thuật. KHÔNG xuất: Ref, Image, metadata, giải thích, ghi chú, mã số, "inspired by", "phân tích ảnh mẫu". Prompt bắt đầu trực tiếp bằng mô tả nghệ thuật.
`;

function injectVisualMandate(systemPrompt: string | undefined, messages: Message[]): string | undefined {
  return (systemPrompt ? systemPrompt + "\n\n" : "") + VISUAL_MANDATE;
}

/**
 * Giai đoạn gọi API Text: Bắt buộc qua Proxy
 */
export async function callAIText(options: AiTextOptions): Promise<string> {
  const profile = options.profileOverride || await getActiveApiProfile();
  try {
    const systemPrompt = injectVisualMandate(options.systemPrompt, options.messages);
    console.log("[API DEBUG] Final System Prompt:", systemPrompt);
    return await executeApiProxyText(profile, options.messages, {
      systemPrompt,
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
  
  const systemPrompt = injectVisualMandate(options.systemPrompt, options.messages);
  console.log("[API DEBUG] Final System Prompt:", systemPrompt);
  
  await executeApiProxyStream({
    profile,
    messages: options.messages,
    systemPrompt,
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

