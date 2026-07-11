import { ApiProfile } from "../lib/api-db";

/**
 * Chuẩn hóa cấu trúc Payload ảnh tham chiếu theo đúng tài liệu API (OpenAI / OpenRouter Vision),
 * tự động khôi phục Data URI scheme nếu gửi thiếu, chỉnh sửa MIME type chuẩn, và báo động nếu ảnh bị cắt xén.
 */
function normalizeVisionMessages(msgs: any[]): any[] {
  if (!Array.isArray(msgs)) return msgs;
  return msgs.map(msg => {
    if (!msg || !msg.content || !Array.isArray(msg.content)) return msg;
    const cleanedContent = msg.content
      .map((part: any) => {
        if (!part || typeof part !== 'object') return part;
        if (part.type === 'image_url' || part.image_url) {
          let rawUrl = typeof part.image_url === 'string'
            ? part.image_url
            : (part.image_url?.url || part.url || "");
          
          if (!rawUrl || typeof rawUrl !== 'string') return null;
          let cleanUrl = rawUrl.trim().replace(/\r?\n|\t/g, "");
          
          if (cleanUrl.length < 150 && !cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            console.warn(`[Vision Payload Normalizer] ⚠️ Phát hiện ảnh base64 có độ dài quá ngắn (${cleanUrl.length} ký tự). Ảnh này có thể bị cắt xén (truncate) hoặc lỗi file!`);
          }
          
          if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("data:") && !cleanUrl.startsWith("blob:")) {
            let mime = "image/png";
            if (cleanUrl.startsWith("/9j/")) mime = "image/jpeg";
            else if (cleanUrl.startsWith("iVBOR")) mime = "image/png";
            else if (cleanUrl.startsWith("R0lGOD")) mime = "image/gif";
            else if (cleanUrl.startsWith("UklGR")) mime = "image/webp";
            cleanUrl = `data:${mime};base64,${cleanUrl}`;
            console.log(`[Vision Payload Normalizer] 🛠️ Đã tự động bổ sung Data URI scheme cho ảnh base64 (${mime}).`);
          } else if (cleanUrl.startsWith("data:application/octet-stream;base64,") || cleanUrl.startsWith("data:;base64,")) {
            const b64Part = cleanUrl.split("base64,")[1] || "";
            let mime = "image/png";
            if (b64Part.startsWith("/9j/")) mime = "image/jpeg";
            else if (b64Part.startsWith("iVBOR")) mime = "image/png";
            else if (b64Part.startsWith("R0lGOD")) mime = "image/gif";
            else if (b64Part.startsWith("UklGR")) mime = "image/webp";
            cleanUrl = `data:${mime};base64,${b64Part}`;
            console.log(`[Vision Payload Normalizer] 🛠️ Đã chuyển MIME type về chuẩn ảnh (${mime}) thay vì octet-stream.`);
          }
          
          return {
            type: "image_url",
            image_url: {
              url: cleanUrl,
              detail: part.image_url?.detail || "auto"
            }
          };
        }
        return part;
      })
      .filter(Boolean);
    return { ...msg, content: cleanedContent };
  });
}

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
 * Các hàm hỗ trợ quét và kiểm tra xem danh sách đã hoàn thành đủ số lượng mục tiêu chưa.
 */
function getHighestNumberedItem(text: string): number {
  const regex = /(?:^|\n)\s*(\d{1,3})\s*[\.\)\-:\/]/g;
  let match;
  let maxNum = 0;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxNum && num <= 300) {
      maxNum = num;
    }
  }
  return maxNum;
}

function checkContentFinished(content: string, messages: any[]): boolean {
  const text = content.trim();
  if (text.length < 200) return false;

  // 1. Kiểm tra xem văn bản có kết thúc cụt lủn ở giữa câu không (không có dấu kết thúc câu hoặc dấu đóng ngoặc/codeblock/markdown)
  const lastChar = text[text.length - 1];
  const sentenceEndings = [".", "!", "?", "…", '"', "'", "”", "’", "}", "]", ")", "`", "*", "_", "✓", "✔"];
  const isClippedSentence = !sentenceEndings.includes(lastChar);

  // 2. Kiểm tra xem có yêu cầu số lượng (ví dụ "100") trong tin nhắn của người dùng không
  let targetCount = 0;
  const promptText = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join(" ");
  
  const targetMatch = promptText.match(/(\d{2,3})\s*(?:ý|việc|điều|mục|gợi ý|task|câu|chương|điểm|idea|point|bước|phần|bài|quy tắc)/i);
  if (targetMatch) {
    targetCount = parseInt(targetMatch[1], 10);
  } else {
    const singleNumMatch = promptText.match(/\b(100|50|80|120|150|200)\b/);
    if (singleNumMatch) {
      targetCount = parseInt(singleNumMatch[1], 10);
    }
  }

  if (targetCount > 5) {
    const highestNum = getHighestNumberedItem(text);
    if (highestNum > 0 && highestNum < targetCount) {
      console.log(`[Cut-Off Detector] 🔍 Phát hiện danh sách chưa đạt mục tiêu: ${highestNum}/${targetCount}.`);
      return true;
    }
  }

  if (isClippedSentence) {
    console.log(`[Cut-Off Detector] 🔍 Phát hiện văn bản kết thúc dở dang không có dấu câu chuẩn (Ký tự cuối: "${lastChar}").`);
    return true;
  }

  return false;
}

function extractTextFromChunk(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.error) {
    throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
  }
  let chunk = "";
  if (data.choices && data.choices.length > 0) {
    const c = data.choices[0];
    const delta = c.delta || c.message || {};
    const rawContent = delta.content !== undefined && delta.content !== null ? delta.content : (delta.reasoning_content || delta.reasoning || delta.thought || c.text || "");
    if (typeof rawContent === "string") {
      chunk = rawContent;
    } else if (Array.isArray(rawContent)) {
      chunk = rawContent.map((p: any) => typeof p === "string" ? p : (p?.text || p?.content || "")).join("");
    } else if (typeof rawContent === "object") {
      chunk = rawContent.text || rawContent.content || "";
    }
  } else if (data.candidates && data.candidates.length > 0) {
    const cand = data.candidates[0];
    const parts = cand.content?.parts || cand.delta?.content?.parts || [];
    if (Array.isArray(parts)) {
      chunk = parts.map((p: any) => typeof p === "string" ? p : (p?.text || p?.content || "")).join("");
    } else if (cand.output || cand.text) {
      chunk = cand.output || cand.text;
    }
  } else if (data.content_block?.text || data.delta?.text) {
    chunk = data.content_block?.text || data.delta?.text;
  } else if (typeof data.content === "string") {
    chunk = data.content;
  } else if (typeof data.text === "string") {
    chunk = data.text;
  } else if (typeof data.response === "string") {
    chunk = data.response;
  }
  return chunk;
}

/**
 * Thực thi cuộc gọi API Proxy Streaming theo đúng chu kỳ 6 giai đoạn và quy định không tự ngắt kết nối sớm (timeout >= 900s).
 * Đảm bảo 1 lần gọi API Proxy duy nhất bám trụ kết nối tới cuối cùng không bỏ sót bất cứ token nào.
 */
export async function executeApiProxyStream(options: ProxyStreamOptions): Promise<void> {
  const { profile, messages, systemPrompt, maxTokensOverride, onToken, onDone, onError, signal } = options;
  const settings = getApiProxySettings();
  
  let finalMessages = [...messages];
  if (systemPrompt && systemPrompt.trim()) {
    finalMessages = [{ role: "system", content: systemPrompt }, ...finalMessages];
  }
  finalMessages = normalizeVisionMessages(finalMessages);

  // Đặt giới hạn token cực kỳ lớn (16384) để đảm bảo model tạo trọn vẹn 100 ý mà không bị cắt cụt giữa chừng nhen vợ yêu!
  const maxTokens = Math.max(profile.maxTokens || 0, maxTokensOverride || 0, 16384);
  const startTime = Date.now();
  let fullContent = "";

  const targetUrl = resolveEndpointUrl(profile, "chat");
  console.log(`[API Proxy Lifecycle] Giai đoạn 1 & 2: Bắt đầu request 1 lần duy nhất bám trụ bất tận. useLocalProxy=${settings.useLocalProxy}, Endpoint=${targetUrl}, Model=${profile.model}`);

  try {
    let res: Response;

    if (settings.useLocalProxy === true) {
      // Gọi qua Local Proxy trung chuyển (Backend Express Server)
      const payload: any = {
        profile,
        messages: finalMessages,
      };
      if (maxTokens) {
        payload.maxTokensOverride = maxTokens;
      }

      console.log(`[API Proxy Lifecycle] Giai đoạn 3: Gửi request đến Local Proxy -> Upstream.`);
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(payload),
        signal: signal, // Dùng signal từ UI để vợ có thể chủ động hủy nếu muốn nhen
      });
      console.log(`[API Proxy Lifecycle] Local Proxy response status: ${res.status} ${res.statusText}`);
    } else {
      // Gọi trực tiếp đến API Proxy bên thứ ba hoặc API chính thức của người dùng
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        ...profile.extraHeaders,
      };

      const payload: any = {
        model: profile.model || "gpt-3.5-turbo",
        messages: finalMessages,
        stream: true,
      };
      if (maxTokens) {
        payload.max_tokens = maxTokens;
      }

      console.log(`[API Proxy Lifecycle] Giai đoạn 3: Gửi request TRỰC TIẾP tới API bên ngoài: ${targetUrl}`);
      res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: signal,
      });
      console.log(`[API Proxy Lifecycle] Direct Proxy response status: ${res.status} ${res.statusText}`);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[API Proxy Debug] ❌ Lỗi HTTP ${res.status} từ Upstream API!`);
      
      let exactServerErr = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) {
          exactServerErr = typeof parsed.error === "string" ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error, null, 2));
        }
      } catch (e) {}

      let errMsg = `HTTP ${res.status}: ${exactServerErr}`;
      throw new Error(errMsg);
    }

    console.log(`[API Proxy Lifecycle] Giai đoạn 4: Kết nối thành công (HTTP 200). Đang chờ AI Model phản hồi stream...`);
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Không thể đọc response stream từ API Proxy. Trình duyệt hoặc máy chủ không hỗ trợ.");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    console.log(`[API Proxy Lifecycle] Giai đoạn 5: Bắt đầu stream token về UI...`);

    try {
      while (true) {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) {
            continue;
          }
          
          let dataStr = trimmed;
          let isSse = false;
          
          if (trimmed.startsWith("data:")) {
            isSse = true;
            dataStr = trimmed.substring(5).trim();
            if (dataStr === "[DONE]") {
              continue;
            }
          }

          try {
            const data = JSON.parse(dataStr);
            const chunk = extractTextFromChunk(data);
            if (chunk) {
              fullContent += chunk;
              onToken(chunk);
            }
          } catch (e: any) {
            // Nếu không phải dạng SSE, hoặc JSON bị lỗi, hãy thử xem nó có chứa text thô không
            if (!isSse) {
              fullContent += trimmed;
              onToken(trimmed);
            }
          }
        }
      }
    } catch (readErr: any) {
      console.error("[API Proxy Lifecycle] Lỗi khi đang đọc stream:", readErr);
      throw readErr;
    }

    // Xử lý nốt phần buffer thừa còn lại nếu có
    if (buffer && buffer.trim()) {
      const trimmed = buffer.trim();
      if (!trimmed.startsWith(":")) {
        let dataStr = trimmed;
        let isSse = false;
        if (trimmed.startsWith("data:")) {
          isSse = true;
          dataStr = trimmed.substring(5).trim();
        }

        if (dataStr !== "[DONE]") {
          try {
            const data = JSON.parse(dataStr);
            const chunk = extractTextFromChunk(data);
            if (chunk) {
              fullContent += chunk;
              onToken(chunk);
            }
          } catch (e: any) {
            if (!isSse) {
              fullContent += trimmed;
              onToken(trimmed);
            }
          }
        }
      }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[API Proxy Lifecycle] Giai đoạn 6: Hoàn tất stream thành công! Tổng thời gian: ${totalElapsed}s, độ dài ký tự: ${fullContent.length}`);
    
    if (!fullContent.trim()) {
      console.warn(`[API Proxy Lifecycle] Cảnh báo: Stream hoàn tất nhưng không có nội dung nào được tạo ra!`);
    }

    onDone(fullContent);

  } catch (err: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[API Proxy Lifecycle Error] Lỗi nghiêm trọng xảy ra tại giây thứ ${totalElapsed}s:`, err);

    // Kế hoạch cứu vãn cuối cùng: nếu đã có lượng dữ liệu kha khá (> 120 ký tự), vẫn trả về đầy đủ để vợ yêu không bị mất bài!
    if (fullContent.trim().length > 120) {
      console.warn(`[API Proxy Lifecycle] Tiến hành cứu vãn nốt dữ liệu đã sinh (${fullContent.length} ký tự) gửi về UI cho Vợ yêu nhen!`);
      onDone(fullContent);
      return;
    }

    if (err.name === "AbortError" || err.name === "TimeoutError") {
      onError(`Lỗi timeout hoặc ngắt kết nối sau ${totalElapsed}s. Vui lòng kiểm tra lại đường truyền nhen vợ yêu.`);
    } else {
      let msg = err.message || "Lỗi không xác định khi gọi API Proxy";
      if (msg.toLowerCase().includes("network error") || msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
        msg = `Lỗi kết nối mạng (network error) sau ${totalElapsed}s. Chồng khuyên vợ kiểm tra lại cấu hình proxy hoặc đổi sang model khỏe hơn nhen!`;
      }
      onError(msg);
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
  finalMessages = normalizeVisionMessages(finalMessages);

  const maxTokens = options?.maxTokensOverride || profile.maxTokens || 4096;
  const targetUrl = resolveEndpointUrl(profile, "text");
  const timeoutMs = Math.max((profile.timeoutSeconds || 900) * 1000, 900000);
  await new Promise(resolve => setTimeout(resolve, 15));

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

    let sampleText = "";
    if (data.data) {
      if (typeof data.data === "string") {
        sampleText = data.data;
      } else {
        const c = data.data.choices?.[0];
        const cand = data.data.candidates?.[0];
        if (c?.message?.content) sampleText = c.message.content;
        else if (c?.text) sampleText = c.text;
        else if (cand?.content?.parts?.[0]?.text) sampleText = cand.content.parts[0].text;
        else if (data.data.response) sampleText = data.data.response;
        else if (data.data.content) sampleText = typeof data.data.content === 'string' ? data.data.content : JSON.stringify(data.data.content);
      }
    }
    if (!sampleText) sampleText = data.rawText || "";

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
      console.error(`[API Proxy Debug Text] ❌ Lỗi HTTP ${res.status} từ Upstream API!`);
      console.error(`[API Proxy Debug Text] 📄 Response Body chính xác từ máy chủ:\n${errText}`);

      let exactServerErr = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) {
          exactServerErr = typeof parsed.error === "string" ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error, null, 2));
        }
      } catch (e) {}

      let errMsg = `HTTP ${res.status}: ${exactServerErr}`;
      const hasImages = finalMessages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
      if ((res.status === 400 || res.status === 413 || res.status === 422) && hasImages) {
        errMsg = `⚠️ Lỗi ${res.status} (Bad Request) từ máy chủ API khi gửi kèm ảnh tham chiếu!\n\n📋 CHI TIẾT LỖI CHÍNH XÁC TỪ MÁY CHỦ API (Response Body):\n"${exactServerErr}"\n\n💡 PHÂN TÍCH & HƯỚNG XỬ LÝ:\n1. Khả năng hỗ trợ Vision của Model: Nếu vợ chọn model text thuần (không hỗ trợ Multi-modal/Vision), API Gateway sẽ từ chối ngay lập tức trong 0.5s. Vợ hãy đổi sang model có Vision (như gpt-4o, gemini-1.5-pro, claude-3-5-sonnet).\n2. Định dạng & cấu trúc Payload: App đã tự động chuẩn hóa cấu trúc JSON theo tài liệu mới nhất ({ type: "image_url", image_url: { url, detail: "auto" } } và bổ sung data URI scheme nếu thiếu).\n3. Bộ lọc an toàn (Safety Settings): Một số proxy hoặc model tự động từ chối ảnh nếu nghi ngờ bản quyền hoặc nội dung nhạy cảm.\n👉 Vợ có thể mở F12 / Console để xem cấu trúc Payload và Response chi tiết nhé!`;
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    let content = "";
    if (data.choices?.[0]?.message?.content) content = data.choices[0].message.content;
    else if (data.choices?.[0]?.text) content = data.choices[0].text;
    else if (data.candidates?.[0]?.content?.parts?.[0]?.text) content = data.candidates[0].content.parts[0].text;
    else if (data.response) content = data.response;
    else if (data.content) content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
    else if (typeof data === "string") content = data;
    
    if (!content) {
      throw new Error("API Proxy trả về thành công nhưng nội dung rỗng.");
    }
    return content;
  }
}
