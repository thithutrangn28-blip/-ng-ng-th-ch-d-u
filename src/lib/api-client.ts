import { ApiProfile, getPrimaryApiProfile } from "./api-db";
import { executeApiProxyText, executeApiProxyStream, resolveEndpointUrl, getApiProxySettings } from "../utils/apiProxy";
import { getDeviceId, getSessionToken } from "./storage";

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
    throw new ApiError("Chưa có API chính. Vui lòng vào Cài Đặt API Proxy để thiết lập API trước.");
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
  profileOverride?: ApiProfile; // Only used by ApiProxyScreen for testing
};

export async function callAIText(options: AiTextOptions): Promise<string> {
  const profile = options.profileOverride || await getActiveApiProfile();
  try {
    const res = await executeApiProxyText(profile, options.messages, {
      systemPrompt: options.systemPrompt,
      maxTokensOverride: options.maxTokensOverride,
    });
    return res;
  } catch (err: any) {
    throw new ApiError(err.message || "Lỗi khi gọi API text");
  }
}

export type AiStreamOptions = {
  messages: Message[];
  systemPrompt?: string;
  onToken: (chunk: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: string) => void;
  profileOverride?: ApiProfile; // Only used by ApiProxyScreen for testing
  maxTokensOverride?: number;
  signal?: AbortSignal;
};

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

export async function pullModels(profile: ApiProfile): Promise<string[]> {
  const settings = getApiProxySettings();
  if (settings.useLocalProxy === true) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-device-id": getDeviceId()
    };
    const token = getSessionToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/models", {
      method: "POST",
      headers,
      body: JSON.stringify({ profile }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new ApiError(
        "API service route did not return JSON. Please check backend/server/API service configuration.\nNội dung trả về:\n" +
        text.slice(0, 120)
      );
    }

    if (!res.ok || data.ok === false) {
      throw new ApiError(data.error || "Lỗi không xác định");
    }

    return data.models || [];
  } else {
    // Gọi trực tiếp đến /models từ frontend
    const url = resolveEndpointUrl(profile, "models");
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${profile.key}`,
      "Content-Type": "application/json",
      ...profile.extraHeaders,
    };

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(180000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new ApiError(`Upstream error: ${res.status} ${res.statusText}\n${errText}`);
    }

    const data = await res.json();
    let models: string[] = [];
    if (data && Array.isArray(data.data)) {
      models = data.data.map((m: any) => m.id);
    } else if (data && Array.isArray(data.models)) {
      models = data.models.map((m: any) => m.id || m.name || m);
    } else if (Array.isArray(data)) {
      models = data.map((m: any) => m.id || m);
    }
    return models;
  }
}

