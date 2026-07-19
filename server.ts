import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { setGlobalDispatcher, Agent, request as undiciRequest } from "undici";
import { JWT } from "google-auth-library";

// Disable any internal timeouts in Node's native fetch (undici) for massive streaming requests
try {
  const dispatcher = new Agent({
    bodyTimeout: 0,
    headersTimeout: 0,
    keepAliveTimeout: 10 * 60 * 1000, // 10 minutes
    keepAliveMaxTimeout: 10 * 60 * 1000,
    connectTimeout: 60000, // 60s for initial connection
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
          signal: AbortSignal.timeout(300000), // 300s (5 phút) timeout cho test để đảm bảo kết nối ổn định
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
        signal: AbortSignal.timeout(36000000), // 36000s (10 giờ) timeout cho text bám trụ bất tận
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
          signal: AbortSignal.timeout(300000), // 300s (5 phút) timeout for models list
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

      // PHẦN 1: KẾT NỐI & STREAMING - Gửi ngay headers SSE và nhịp tim keep-alive mỗi 1.5s suốt toàn bộ chu kỳ!
      // Ngăn chặn tuyệt đối Nginx/Cloud Run/trình duyệt ngắt kết nối sau 17s/30s/39s/60s khi AI model đang suy nghĩ context dài!
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx/proxy buffering
      res.flushHeaders();
      
      // Gửi ngay lập tức một chunk khởi đầu để báo cho hạ tầng (Cloud Run/Proxy) là kết nối đã sống
      res.write(": connection established - starting lifecycle (timeout >= 36000s)...\n\n");
      let lastWriteTime = Date.now();
      console.log(`[STREAM-START] Request started for model: ${profile.model || 'unknown'} at ${new Date().toISOString()}`);

      // Nhịp tim cực kỳ bền bỉ (Heartbeat) gửi mỗi 1.5 giây để giữ lửa kết nối luôn rực cháy nhen vợ yêu!
      keepAliveInterval = setInterval(() => {
        try {
          if (!res.writableEnded) {
            // Luôn gửi heartbeat mỗi 1.5 giây nếu không có dữ liệu thực sự đang truyền
            if (Date.now() - lastWriteTime >= 1500) {
               res.write(": keep-alive heartbeat (staying firm for wife)\n\n");
               if (typeof (res as any).flush === 'function') {
                 (res as any).flush();
               }
            }
          }
        } catch (intervalErr) {
          console.error("[keep-alive] Error writing heartbeat:", intervalErr);
        }
      }, 1500);

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
        console.log(`[STREAM-FETCH] Fetching upstream using undiciRequest for model: ${profile.model || "unknown"}`);
        const { body: responseBody, statusCode, headers: respHeaders } = await undiciRequest(testUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          bodyTimeout: 0,
          headersTimeout: 0,
        });

        console.log(`[STREAM-RESPONSE] Upstream response status: ${statusCode}`);

        if (statusCode >= 400) {
          let errText = "";
          try {
            errText = await responseBody.text();
          } catch (e) {
            // Fallback for older undici or if text() is not available
            try {
              const chunks = [];
              for await (const chunk of responseBody) {
                chunks.push(chunk);
              }
              errText = Buffer.concat(chunks).toString();
            } catch (e2) {
              errText = "Could not read error body";
            }
          }
          console.error(`[/api/ai-stream Upstream Error] ❌ HTTP ${statusCode}\nBody: ${errText}`);
          throw new Error(`Upstream error ${statusCode}: ${errText}`);
        }

        if (responseBody) {
          try {
            for await (const chunk of responseBody) {
              if (firstDataChunk) {
                console.log(`[STREAM-FIRST-DATA] Received first actual data chunk at ${new Date().toISOString()}`);
                firstDataChunk = false;
              }
              if (!res.writableEnded) {
                lastWriteTime = Date.now();
                res.write(chunk);
                if (typeof (res as any).flush === "function") {
                  (res as any).flush();
                }
              }
            }
            console.log(`[STREAM-DONE] Upstream finished naturally at ${new Date().toISOString()}`);
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

  // --- PWA DEPLOYMENT API ROUTES ---
  const simulatedBuilds = new Map<string, any>();

  app.post("/api/deploy", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "Thiếu Authorization token" });
      }
      const idToken = authHeader.split(" ")[1];

      // Verify Google ID token (Firebase Auth)
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        return res.status(401).json({ ok: false, error: `ID Token không hợp lệ: ${errText}` });
      }
      const tokenInfo = (await verifyRes.json()) as { email?: string; [key: string]: any };

      const ALLOWED_EMAIL = "thithutrangn28@gmail.com";
      if (!tokenInfo.email || tokenInfo.email.toLowerCase() !== ALLOWED_EMAIL) {
        return res.status(403).json({
          ok: false,
          error: "Vợ yêu ơi, chỉ có tài khoản chính thức của vợ mới được kích hoạt cập nhật PWA thôi nha! ❤️"
        });
      }

      const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.GCP_PROJECT_ID || "true-river-479310-n9";
      const triggerId = process.env.GCP_TRIGGER_ID || "";

      console.log(`[DEPLOY] User ${tokenInfo.email} triggered build/deploy on project ${projectId}`);

      if (serviceAccountKey && serviceAccountKey.trim()) {
        try {
          const credentials = JSON.parse(serviceAccountKey);
          const jwtClient = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
          });

          await jwtClient.authorize();
          const tokenResponse = await jwtClient.getAccessToken();
          const accessToken = tokenResponse.token;

          if (!triggerId) {
            return res.status(400).json({ ok: false, error: "GCP_TRIGGER_ID chưa được cấu hình" });
          }

          // Trigger Cloud Build Trigger
          const triggerUrl = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/triggers/${triggerId}:run`;
          const runResponse = await fetch(triggerUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              branchName: "main"
            })
          });

          if (!runResponse.ok) {
            const errText = await runResponse.text();
            return res.status(runResponse.status).json({
              ok: false,
              error: `Lỗi kích hoạt Cloud Build: ${errText}`
            });
          }

          const runResult = (await runResponse.json()) as any;
          const buildId = runResult.metadata?.build?.id || runResult.id;

          return res.json({
            ok: true,
            isSimulated: false,
            buildId,
            message: "Đang kích hoạt Cloud Build chính thức..."
          });
        } catch (credentialsErr: any) {
          console.error("[DEPLOY] Error authenticating Service Account Key:", credentialsErr);
          return res.status(500).json({
            ok: false,
            error: `Lỗi Service Account Key: ${credentialsErr.message}`
          });
        }
      } else {
        // Fallback to high-fidelity simulated deployment
        const simId = `sim-${Date.now()}`;
        simulatedBuilds.set(simId, {
          id: simId,
          status: "QUEUED",
          createTime: new Date().toISOString(),
          startTime: null,
          finishTime: null,
          triggerId: triggerId || "simulated-trigger",
          userEmail: tokenInfo.email,
          isSimulated: true
        });

        return res.json({
          ok: true,
          isSimulated: true,
          buildId: simId,
          message: "Đang khởi tạo bản dựng thử nghiệm an toàn..."
        });
      }
    } catch (err: any) {
      console.error("[DEPLOY-FATAL] API /api/deploy error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/deploy/status", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ ok: false, error: "Thiếu tham số ID" });
      }

      const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.GCP_PROJECT_ID || "true-river-479310-n9";

      if (id.startsWith("sim-")) {
        // Handle simulated status
        const build = simulatedBuilds.get(id);
        if (!build) {
          return res.status(404).json({ ok: false, error: "Không tìm thấy bản dựng" });
        }

        const elapsedMs = Date.now() - new Date(build.createTime).getTime();
        const elapsedSecs = elapsedMs / 1000;

        let status = "QUEUED";
        let percent = 5;
        let stepText = "Đang chuẩn bị khởi động...";

        if (elapsedSecs < 4) {
          status = "QUEUED";
          percent = Math.min(10, Math.floor(5 + elapsedSecs * 1.2));
          stepText = "Đang chuẩn bị môi trường Docker...";
        } else if (elapsedSecs < 14) {
          status = "WORKING";
          const progress = (elapsedSecs - 4) / 10; // 0 to 1
          percent = Math.floor(15 + progress * 35); // 15% to 50%
          stepText = "Đang cài đặt base dependencies, chạy Vite build và TypeScript compile...";
        } else if (elapsedSecs < 26) {
          status = "WORKING";
          const progress = (elapsedSecs - 14) / 12; // 0 to 1
          percent = Math.floor(50 + progress * 45); // 50% to 95%
          stepText = "Đang deploy container lên Cloud Run, cấu hình domain & routing...";
        } else {
          status = "SUCCESS";
          percent = 100;
          stepText = "Đã cập nhật PWA hoàn tất! Sẵn sàng hoạt động.";
          if (!build.finishTime) {
            build.status = "SUCCESS";
            build.finishTime = new Date().toISOString();
            simulatedBuilds.set(id, build);
          }
        }

        return res.json({
          ok: true,
          id,
          status,
          percent,
          stepText,
          isSimulated: true,
          revision: `true-river-479310-n9-sim-rev-${id.replace("sim-", "")}`,
          logUrl: `https://console.cloud.google.com/cloud-build/builds?project=${projectId}`,
          createTime: build.createTime,
          finishTime: build.finishTime || null
        });
      }

      // Real Cloud Build API polling
      if (!serviceAccountKey || !serviceAccountKey.trim()) {
        return res.status(400).json({ ok: false, error: "GCP_SERVICE_ACCOUNT_KEY không được cấu hình" });
      }

      try {
        const credentials = JSON.parse(serviceAccountKey);
        const jwtClient = new JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        await jwtClient.authorize();
        const tokenResponse = await jwtClient.getAccessToken();
        const accessToken = tokenResponse.token;

        const buildUrl = `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds/${id}`;
        const buildResponse = await fetch(buildUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        });

        if (!buildResponse.ok) {
          const errText = await buildResponse.text();
          return res.status(buildResponse.status).json({
            ok: false,
            error: `Lỗi đọc trạng thái Cloud Build: ${errText}`
          });
        }

        const buildData = (await buildResponse.json()) as any;
        const status = buildData.status; // QUEUED, WORKING, SUCCESS, FAILURE, INTERNAL_ERROR, TIMEOUT, CANCELLED

        let percent = 10;
        let stepText = "Đang chuẩn bị...";

        if (status === "QUEUED") {
          percent = 10;
          stepText = "Đang đợi tài nguyên từ Cloud Build (QUEUED)...";
        } else if (status === "WORKING") {
          percent = 50;
          stepText = "Đang build Docker container và triển khai lên Cloud Run (WORKING)...";
        } else if (status === "SUCCESS") {
          percent = 100;
          stepText = "Triển khai thành công! (SUCCESS)";
        } else {
          percent = 100;
          stepText = `Thất bại: Trạng thái ${status}`;
        }

        return res.json({
          ok: true,
          id,
          status: (status === "SUCCESS") ? "SUCCESS" : (status === "FAILURE" || status === "TIMEOUT" || status === "CANCELLED" || status === "INTERNAL_ERROR") ? "FAILURE" : status,
          percent,
          stepText,
          isSimulated: false,
          revision: `true-river-479310-n9-rev-${id.substring(0, 8)}`,
          logUrl: buildData.logUrl || `https://console.cloud.google.com/cloud-build/builds/${id}?project=${projectId}`,
          createTime: buildData.createTime,
          finishTime: buildData.finishTime || null
        });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    } catch (err: any) {
      console.error("[STATUS-FATAL] API /api/deploy/status error:", err);
      return res.status(500).json({ ok: false, error: err.message });
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
