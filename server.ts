import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { setGlobalDispatcher, Agent } from "undici";

// Disable any internal timeouts in Node's native fetch (undici) for massive streaming requests
try {
  const dispatcher = new Agent({
    bodyTimeout: 0,
    headersTimeout: 0,
    keepAliveTimeout: 120 * 60 * 1000, // 120 minutes (2 hours)
  });
  setGlobalDispatcher(dispatcher);
  console.log("[undici] Successfully configured global dispatcher with unlimited body and headers timeout.");
} catch (e: any) {
  console.error("[undici] Failed to configure global dispatcher:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "200mb" }));
  app.use(express.urlencoded({ limit: "200mb", extended: true }));

  // Tối ưu hóa CORS để tránh bị trình duyệt chặn khi gọi API Proxy
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // /api/test-proxy
  app.post("/api/test-proxy", async (req, res) => {
    try {
      const { profile, action } = req.body;
      if (!profile || !profile.endpoint || !profile.key) {
        return res.status(400).json({ ok: false, error: "Missing endpoint or key" });
      }

      const startTime = Date.now();
      
      let url = profile.endpoint;
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }

      // Remove trailing slash
      url = url.replace(/\/$/, "");
      
      // Auto-append /v1 if missing and format is openai and pathMode is v1/auto
      if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
         url = url + "/v1";
      }

      let testUrl = url;
      let method = "GET";
      let body: any = undefined;
      
      if (action === "fetch_models") {
        if (!testUrl.endsWith("/models")) {
          testUrl = testUrl + "/models";
        }
        method = "GET";
      } else {
        if (profile.format === "openai" && !testUrl.endsWith("/chat/completions")) {
          testUrl = testUrl + "/chat/completions";
        }
        method = "POST";
        body = {
          model: req.body.model || profile.model || "gpt-3.5-turbo",
          messages: req.body.messages || [{ role: "user", content: "Reply with exactly OK." }],
          max_tokens: req.body.maxTokensOverride || req.body.max_tokens || 16,
          stream: false
        };
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...profile.extraHeaders,
      };

      try {
        const response = await fetch(testUrl, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(180000), // 180s timeout for test to allow proxy connection phase
        });
        
        const data = await response.text();
        const elapsedMs = Date.now() - startTime;
        
        if (!response.ok) {
           return res.status(response.status).json({ ok: false, error: `Upstream error: ${response.status} ${response.statusText}\n${data}` });
        }

        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch(e) {}

        res.json({
          ok: true,
          endpointUsed: testUrl,
          elapsedMs,
          sample: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
          parsedData
        });
      } catch (fetchErr: any) {
        res.status(500).json({ ok: false, error: fetchErr.message });
      }
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // /api/ai-text
  app.post("/api/ai-text", async (req, res) => {
    try {
      const { profile, messages, systemPrompt, maxTokensOverride } = req.body;
      if (!profile || !profile.endpoint || !profile.key) {
        return res.status(400).json({ ok: false, error: "Missing endpoint or key" });
      }

      let url = profile.endpoint;
      if (!url.startsWith("http")) url = "https://" + url;
      url = url.replace(/\/$/, "");
      
      if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
         url = url + "/v1";
      }

      let targetUrl = url;
      if (profile.format === "openai") {
        targetUrl = targetUrl + "/chat/completions";
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...profile.extraHeaders,
      };

      const payload = {
        model: profile.model,
        messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
        stream: false,
        max_tokens: maxTokensOverride || profile.maxTokens || 65536,
      };

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3600000), // 3600s (60 phút) timeout cho text bám trụ bất tận
      });

      const dataText = await response.text();
      if (!response.ok) {
        console.error(`[/api/ai-text Upstream Error] ❌ HTTP ${response.status}\nFull Untruncated Response Body:\n${dataText}`);
        return res.status(response.status).json({ ok: false, error: `Upstream error: ${response.status}\n${dataText}` });
      }

      let parsed = null;
      try {
        parsed = JSON.parse(dataText);
      } catch (e) {}

      res.json({ ok: true, data: parsed || dataText, rawText: dataText });
    } catch (err: any) {
      console.error("[/api/ai-text error]", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // /api/models
  app.post("/api/models", async (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile || !profile.endpoint || !profile.key) {
        return res.status(400).json({ ok: false, error: "Missing endpoint or key" });
      }

      let url = profile.endpoint;
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }

      // Remove trailing slash
      url = url.replace(/\/$/, "");
      
      // Auto-append /v1 if missing and format is openai and pathMode is v1/auto
      if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
         url = url + "/v1";
      }

      let testUrl = url;
      if (profile.format === "openai" && !testUrl.endsWith("/models")) {
        testUrl = testUrl + "/models";
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...profile.extraHeaders,
      };

      try {
        const response = await fetch(testUrl, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(180000), // 180s timeout for models list
        });
        
        if (!response.ok) {
           const errText = await response.text();
           return res.status(response.status).json({ ok: false, error: `Upstream error: ${response.status} ${response.statusText}\n${errText}` });
        }

        const data = await response.json();
        let models: string[] = [];
        
        if (data && Array.isArray(data.data)) {
           models = data.data.map((m: any) => m.id);
        } else if (data && Array.isArray(data.models)) {
           models = data.models.map((m: any) => m.id || m.name || m);
        } else if (Array.isArray(data)) {
           models = data.map((m: any) => m.id || m);
        }

        res.json({ ok: true, models });
      } catch (fetchErr: any) {
        res.status(500).json({ ok: false, error: fetchErr.message });
      }
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // /api/ai-stream
  app.post("/api/ai-stream", async (req, res) => {
    req.socket.setTimeout(0); // Disable socket timeout for long-running streaming
    res.setTimeout(0); // Disable response timeout
    req.setTimeout(0); // Disable request timeout

    let keepAliveInterval: any = null;
    req.on("close", () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    });

    try {
      const { profile, messages, systemPrompt } = req.body;
      if (!profile || !profile.endpoint || !profile.key) {
        return res.status(400).json({ ok: false, error: "Missing endpoint or key" });
      }

      let url = profile.endpoint;
      if (!url.startsWith("http")) url = "https://" + url;
      
      // Remove trailing slash
      url = url.replace(/\/$/, "");
      
      // Auto-append /v1 if missing and format is openai and pathMode is v1/auto
      if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
         url = url + "/v1";
      }
      
      let testUrl = url;
      if (profile.format === "openai" && !testUrl.endsWith("/chat/completions")) {
        testUrl = testUrl + "/chat/completions";
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Connection": "keep-alive",
        ...profile.extraHeaders,
      };

      const payload: any = {
        model: profile.model,
        messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
        stream: true,
      };

      // Chỉ gửi max_tokens khi thật sự cần thiết hoặc người dùng cấu hình
      // Tránh việc gửi mặc định 65536 làm model bị lỗi "max tokens limit reached"
      const finalMaxTokens = req.body.maxTokensOverride || profile.maxTokens;
      if (finalMaxTokens) {
        payload.max_tokens = finalMaxTokens;
      }

      // Ensure underlying socket stays alive
      req.socket.setKeepAlive(true, 5000);
      req.socket.setTimeout(0);

      // PHẦN 1: KẾT NỐI & STREAMING - Gửi ngay headers SSE và nhịp tim keep-alive mỗi 2s suốt toàn bộ chu kỳ!
      // Ngăn chặn tuyệt đối Nginx/Cloud Run/trình duyệt ngắt kết nối sau 17s/30s/39s/60s khi AI model đang suy nghĩ context dài!
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/proxy buffering
      res.flushHeaders();
      
      // Gửi ngay lập tức một chunk khởi đầu để báo cho hạ tầng (Cloud Run/Proxy) là kết nối đã sống
      res.write(": connection established - starting lifecycle (timeout >= 7200s)...\n\n");
      let lastWriteTime = Date.now();
      console.log(`[STREAM-START] Request started for model: ${profile.model || 'unknown'} at ${new Date().toISOString()}`);

      // Nhịp tim cực kỳ bền bỉ (Heartbeat) gửi mỗi 2 giây để giữ lửa kết nối
      keepAliveInterval = setInterval(() => {
        try {
          if (!res.writableEnded) {
            // Luôn gửi heartbeat mỗi 2 giây nếu không có dữ liệu thực sự đang truyền
            if (Date.now() - lastWriteTime >= 2000) {
               res.write(": keep-alive heartbeat\n\n");
               if (typeof (res as any).flush === 'function') {
                 (res as any).flush();
               }
            }
          }
        } catch (intervalErr) {
          console.error("[keep-alive] Error writing heartbeat:", intervalErr);
        }
      }, 2000);

      res.on('close', () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      });
      res.on('finish', () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      });

      let firstDataChunk = true;
      
      // TUYỆT ĐỐI KHÔNG RETRY - Một vòng đời duy nhất, bám trụ tới cùng như vợ yêu cầu nhen!
      try {
        console.log(`[STREAM-FETCH] Fetching upstream for model: ${profile.model || "unknown"}`);
        const response = await fetch(testUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          // Timeout cực lớn (7200s = 2 tiếng) để AI tha hồ suy nghĩ
          signal: AbortSignal.timeout(Math.max((profile.timeoutSeconds || 7200) * 1000, 7200000)), 
        });

        console.log(`[STREAM-RESPONSE] Upstream response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[/api/ai-stream Upstream Error] ❌ HTTP ${response.status}\nBody: ${errText}`);
          throw new Error(`Upstream error ${response.status}: ${errText}`);
        }

        if (response.body) {
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log(`[STREAM-DONE] Upstream finished naturally at ${new Date().toISOString()}`);
                break;
              }
              if (firstDataChunk) {
                console.log(`[STREAM-FIRST-DATA] Received first actual data chunk at ${new Date().toISOString()}`);
                firstDataChunk = false;
              }
              if (!res.writableEnded) {
                lastWriteTime = Date.now();
                res.write(value);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              }
            }
          } catch (streamReadErr: any) {
            console.error(`[STREAM-READ-ERROR] Error reading upstream stream:`, streamReadErr);
            throw streamReadErr;
          }
        } else {
          throw new Error("Response body is empty or null from upstream");
        }
      } catch (err: any) {
        console.error(`[STREAM-FATAL-ERROR] API Proxy stream failed:`, err.message);
        throw err;
      }

      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      if (!res.writableEnded) {
        res.end();
      }
    } catch (err: any) {
      console.error(err);
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: err.message });
      } else if (!res.writableEnded) {
        res.write(`data: {"error": ${JSON.stringify(err.message)}}\n\n`);
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  // Disable global timeouts for long-running AI streaming requests
  server.timeout = 0;
  server.keepAliveTimeout = 0;
  (server as any).headersTimeout = 0;
  (server as any).requestTimeout = 0;
}

startServer();
