import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "200mb" }));
  app.use(express.urlencoded({ limit: "200mb", extended: true }));

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
        testUrl = testUrl + "/models";
        method = "GET";
      } else {
        testUrl = testUrl + (profile.format === "openai" ? "/chat/completions" : "");
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
      if (profile.format === "openai") {
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
      if (profile.format === "openai") {
        testUrl = testUrl + "/chat/completions";
      }

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${profile.key}`,
        "Content-Type": "application/json",
        ...profile.extraHeaders,
      };

      const payload = {
        model: profile.model,
        messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
        stream: true,
        max_tokens: req.body.maxTokensOverride || profile.maxTokens || 65536,
      };

      // PHẦN 1: KẾT NỐI & STREAMING - Gửi ngay headers SSE và nhịp tim keep-alive mỗi 2s suốt toàn bộ chu kỳ!
      // Ngăn chặn tuyệt đối Nginx/Cloud Run/trình duyệt ngắt kết nối sau 17s/30s/39s/60s khi AI model đang suy nghĩ context dài!
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/proxy buffering
      res.flushHeaders();

      keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": keep-alive - ai model thinking & streaming...\n\n");
        }
      }, 2000);

      const response = await fetch(testUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(Math.max((profile.timeoutSeconds || 3600) * 1000, 3600000)), // Minimum 3600s (60m) timeout for massive streaming jobs
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[/api/ai-stream Upstream Error] ❌ HTTP ${response.status}\nFull Untruncated Response Body:\n${errText}`);
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: `Upstream error ${response.status}: ${errText}` })}\n\n`);
          res.end();
        }
        return;
      }

      try {
        if (response.body) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!res.writableEnded) {
              res.write(value);
            }
          }
        }
      } finally {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        if (!res.writableEnded) {
          res.end();
        }
      }
    } catch (err: any) {
      console.error(err);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
