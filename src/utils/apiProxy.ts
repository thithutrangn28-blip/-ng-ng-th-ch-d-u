import { ApiProfile } from "../lib/api-db";

export type ApiProxySettings = {
  useLocalProxy: boolean;
};

const SETTINGS_KEY = "minmin_api_proxy_settings_v1";

export function getApiProxySettings(): ApiProxySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        useLocalProxy: parsed.useLocalProxy !== undefined ? Boolean(parsed.useLocalProxy) : true
      };
    }
  } catch (e) {
    console.warn("Lỗi khi đọc cài đặt API Proxy từ localStorage:", e);
  }
  // Mặc định bật Local Proxy (true) để an toàn qua server, nhưng tôn trọng tuyệt đối nếu người dùng tắt
  return { useLocalProxy: true };
}

export function setApiProxySettings(settings: ApiProxySettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log("[API Proxy] Đã cập nhật cấu hình useLocalProxy =", settings.useLocalProxy);
  } catch (e) {
    console.error("Lỗi khi lưu cài đặt API Proxy vào localStorage:", e);
  }
}

/**
 * Hàm phân giải endpoint cuối cùng theo cài đặt người dùng:
 * Nếu settings.useLocalProxy === true -> Dùng Local Proxy server (/api/ai-stream, /api/test-proxy)
 * Nếu settings.useLocalProxy === false -> Dùng trực tiếp địa chỉ API Proxy bên thứ 3 của người dùng
 */
export function resolveEndpointUrl(profile: ApiProfile, type: "chat" | "models" | "test" | "text"): string {
  const settings = getApiProxySettings();
  
  if (settings.useLocalProxy === true) {
    if (type === "chat") return "/api/ai-stream";
    if (type === "models") return "/api/models";
    if (type === "text") return "/api/ai-text";
    return "/api/test-proxy";
  }

  // Khi settings.useLocalProxy === false -> Gọi trực tiếp API Proxy bên thứ ba hoặc API chính thức
  let url = (profile.endpoint || "").trim();
  if (!url) {
    throw new Error("Địa chỉ endpoint không được để trống trong cấu hình API Profile.");
  }
  
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  
  // Remove trailing slash
  url = url.replace(/\/$/, "");
  
  // Tự động bổ sung /v1 nếu format là openai và chưa có /v1, tuyệt đối không tạo lỗi /v1/v1
  if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto")) {
    if (!url.endsWith("/v1") && !url.includes("/v1/")) {
      url = url + "/v1";
    }
  }
  
  if (type === "chat" || type === "test" || type === "text") {
    if (!url.endsWith("/chat/completions")) {
      url = url + "/chat/completions";
    }
  } else if (type === "models") {
    if (!url.endsWith("/models")) {
      url = url + "/models";
    }
  }
  
  return url;
}

export type ProxyStreamOptions = {
  profile: ApiProfile;
  messages: Array<{ role: string; content: string | any[] }>;
  systemPrompt?: string;
  maxTokensOverride?: number;
  onToken: (chunk: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
};

/**
 * Thực thi cuộc gọi API Proxy Streaming theo đúng chu kỳ 6 giai đoạn và quy định không tự ngắt kết nối sớm (timeout >= 900s).
 */
export async function executeApiProxyStream(options: ProxyStreamOptions): Promise<void> {
  const { profile, messages, systemPrompt, maxTokensOverride, onToken, onDone, onError, signal } = options;
  const settings = getApiProxySettings();
  
  let finalMessages = [...messages];
  if (systemPrompt && systemPrompt.trim()) {
    finalMessages = [{ role: "system", content: systemPrompt }, ...finalMessages];
  }

  const maxTokens = maxTokensOverride || profile.maxTokens || 65536;
  const startTime = Date.now();
  let firstTokenReceived = false;
  let chunkCount = 0;
  let fullContent = "";

  const targetUrl = resolveEndpointUrl(profile, "chat");
  console.log(`[API Proxy Lifecycle] Giai đoạn 1 & 2: Bắt đầu request. useLocalProxy=${settings.useLocalProxy}, Endpoint=${targetUrl}, Model=${profile.model}`);

  try {
    let res: Response;
    const timeoutMs = Math.max((profile.timeoutSeconds || 900) * 1000, 900000); // Tối thiểu 900s (15 phút) cho tác vụ dài

    if (settings.useLocalProxy === true) {
      // Gọi qua Local Proxy trung chuyển (Backend Express Server)
      const payload = {
        profile,
        messages: finalMessages,
        maxTokensOverride: maxTokens,
      };

      console.log(`[API Proxy Lifecycle] Giai đoạn 3: Gửi request đến Local Proxy -> Upstream.`);
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: signal || AbortSignal.timeout(timeoutMs),
      });
    } else {
      // Gọi trực tiếp đến API Proxy bên thứ ba hoặc API chính thức của người dùng
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...profile.extraHeaders,
      };

      const payload = {
        model: profile.model || "gpt-3.5-turbo",
        messages: finalMessages,
        stream: true,
        max_tokens: maxTokens,
      };

      console.log(`[API Proxy Lifecycle] Giai đoạn 3: Gửi request TRỰC TIẾP tới API bên ngoài: ${targetUrl}`);
      res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: signal || AbortSignal.timeout(timeoutMs),
      });
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errMsg = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) {
          errMsg = typeof parsed.error === "string" ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error));
        }
      } catch (e) {}
      
      console.error(`[API Proxy Lifecycle] Lỗi HTTP từ upstream: ${errMsg}`);
      throw new Error(`Lỗi kết nối API Proxy: ${errMsg}`);
    }

    console.log(`[API Proxy Lifecycle] Giai đoạn 4: Kết nối thành công (HTTP 200). Đang chờ AI Model phản hồi stream...`);
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Không thể đọc response stream từ API Proxy. Trình duyệt hoặc máy chủ không hỗ trợ.");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    console.log(`[API Proxy Lifecycle] Giai đoạn 5: Bắt đầu stream token về UI...`);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // Bỏ qua mọi comment heartbeat (bắt đầu bằng dấu hai chấm)
        
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.substring(6).trim();
          if (dataStr === "[DONE]") {
            continue;
          }
          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
            }
            if (data.choices && data.choices[0]?.delta) {
              const delta = data.choices[0].delta;
              const chunk = delta.content !== undefined && delta.content !== null
                ? delta.content
                : (delta.reasoning_content || delta.reasoning || delta.thought || "");
              
              if (chunk) {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                  console.log(`[API Proxy Lifecycle] Nhận token đầu tiên sau ${elapsed}s! Đang tiếp tục stream...`);
                }
                chunkCount++;
                fullContent += chunk;
                onToken(chunk);
              }
            }
          } catch (e: any) {
            if (e.message && e.message.includes("Lỗi")) {
              throw e;
            }
            // Ignore JSON parse errors on incomplete chunks
          }
        }
      }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[API Proxy Lifecycle] Giai đoạn 6: Hoàn tất stream thành công! Tổng thời gian: ${totalElapsed}s, số chunks: ${chunkCount}, độ dài ký tự: ${fullContent.length}`);
    
    if (!fullContent.trim()) {
      console.warn(`[API Proxy Lifecycle] Cảnh báo: Stream hoàn tất nhưng không có nội dung nào được tạo ra!`);
    }
    
    onDone(fullContent);

  } catch (err: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[API Proxy Lifecycle] Lỗi tại giây thứ ${totalElapsed}s:`, err);
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      onError(`Lỗi timeout hoặc ngắt kết nối sau ${totalElapsed}s. Vui lòng kiểm tra lại đường truyền hoặc cấu hình timeout.`);
    } else {
      onError(err.message || "Lỗi không xác định khi gọi API Proxy");
    }
  }
}

/**
 * Thực thi cuộc gọi API Proxy không stream (Text output)
 */
export async function executeApiProxyText(
  profile: ApiProfile,
  messages: Array<{ role: string; content: string | any[] }>,
  options?: { systemPrompt?: string; maxTokensOverride?: number }
): Promise<string> {
  const settings = getApiProxySettings();
  let finalMessages = [...messages];
  if (options?.systemPrompt && options.systemPrompt.trim()) {
    finalMessages = [{ role: "system", content: options.systemPrompt }, ...finalMessages];
  }

  const maxTokens = options?.maxTokensOverride || profile.maxTokens || 4096;
  const targetUrl = resolveEndpointUrl(profile, "text");
  const timeoutMs = Math.max((profile.timeoutSeconds || 900) * 1000, 900000);

  if (settings.useLocalProxy === true) {
    const payload = {
      profile,
      messages: finalMessages,
      maxTokensOverride: maxTokens,
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Server Proxy không trả về JSON hợp lệ:\n" + text.slice(0, 120));
    }

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || "Lỗi không xác định từ Server Proxy");
    }

    let sampleText = data.rawText || data.data;
    if (data.data?.choices?.[0]?.message?.content) {
      sampleText = data.data.choices[0].message.content;
    } else if (typeof data.data?.response === "string") {
      sampleText = data.data.response;
    } else if (typeof data.data === "string") {
      sampleText = data.data;
    }

    if (!sampleText) {
      throw new Error("API Proxy đã gọi thành công nhưng không nhận được nội dung văn bản (empty text).");
    }
    return sampleText;
  } else {
    // Gọi trực tiếp đến bên thứ ba
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${profile.key}`,
      "Content-Type": "application/json",
      ...profile.extraHeaders,
    };

    const payload = {
      model: profile.model || "gpt-3.5-turbo",
      messages: finalMessages,
      stream: false,
      max_tokens: maxTokens,
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || data.response || "";
    if (!content) {
      throw new Error("API Proxy trả về thành công nhưng nội dung rỗng.");
    }
    return content;
  }
}
