import { ApiProfile, getPrimaryApiProfile } from "./api-db";
import { executeApiProxyText, executeApiProxyStream } from "../utils/apiProxy";
import { auth } from "./firebase";

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

/**
 * Giai đoạn gọi API Text: Bắt buộc qua Proxy
 */
export async function callAIText(options: AiTextOptions): Promise<string> {
  const profile = options.profileOverride || await getActiveApiProfile();
  try {
    return await executeApiProxyText(profile, options.messages, {
      systemPrompt: options.systemPrompt,
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
    systemPrompt: options.systemPrompt,
    maxTokensOverride: options.maxTokensOverride,
    onToken: options.onToken,
    onDone: options.onDone,
    onError: options.onError,
    signal: options.signal,
  });
}

/**
 * Kéo danh sách Model: Bắt buộc qua Proxy
 */
export async function pullModels(profile: ApiProfile): Promise<string[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || window.location.origin;
  const res = await fetch(`${baseUrl}/api/models`, {
    method: "POST",
    headers,
    body: JSON.stringify({ profile }),
  });

  const text = await res.text();
  console.log("[DEBUG] pullModels: response status:", res.status, "text:", text.substring(0, 200));

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new ApiError("Proxy không trả về JSON hợp lệ. Vợ kiểm tra lại server hoặc cấu hình proxy nhé!");
  }

  if (!res.ok || data.ok === false) {
    throw new ApiError(data.error || "Lỗi khi lấy danh sách model qua Proxy");
  }

  return data.models || [];
}

