import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface SecurityStore {
  allowedEmail: string;
  allowedPhone: string;
  allowedName: string;
  approvedDeviceId: string | null;
  deviceHistory: Array<{
    deviceId: string;
    deviceName: string;
    approvedAt: string;
    userAgent: string;
  }>;
  activeSessions: Record<string, {
    email: string;
    deviceId: string;
    createdAt: string;
    expiresAt: string;
  }>;
}

const STORE_PATH = path.join(process.cwd(), "security-store.json");

function loadSecurityStore(): SecurityStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Lỗi đọc file security-store.json, dùng mặc định:", e);
  }
  return {
    allowedEmail: "thithutrangn28@gmail.com",
    allowedPhone: "0981267115",
    allowedName: "Nguyễn Thị Thu Trang",
    approvedDeviceId: null,
    deviceHistory: [],
    activeSessions: {}
  };
}

function saveSecurityStore(store: SecurityStore) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Lỗi ghi file security-store.json:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "200mb" }));
  app.use(express.urlencoded({ limit: "200mb", extended: true }));

  // Middleware bảo mật tối mật ở backend - Chặn tất cả request API ngoại trừ các API xác thực công khai
  const securityMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl.startsWith("/api/auth/")) {
      return next();
    }

    const token = req.headers["authorization"]?.toString().replace("Bearer ", "").trim();
    const deviceId = req.headers["x-device-id"]?.toString().trim();

    if (!token || !deviceId) {
      return res.status(401).json({ 
        ok: false, 
        error: "Thiếu thông tin xác thực bảo mật tối mật (Token hoặc Device ID) để truy cập hệ thống! 🔒" 
      });
    }

    const store = loadSecurityStore();
    const session = store.activeSessions[token];

    if (!session) {
      return res.status(401).json({ 
        ok: false, 
        error: "Phiên làm việc không hợp lệ hoặc đã hết hạn rồi vợ yêu ơi, đăng nhập lại nhé! 🔑" 
      });
    }

    if (session.deviceId !== deviceId || store.approvedDeviceId !== deviceId) {
      return res.status(403).json({ 
        ok: false, 
        error: "Thiết bị này chưa được liên kết hoặc đã bị thu hồi quyền truy cập rồi vợ yêu ơi! 🔒" 
      });
    }

    // Kiểm tra thời gian hết hạn
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete store.activeSessions[token];
      saveSecurityStore(store);
      return res.status(401).json({ 
        ok: false, 
        error: "Phiên đăng nhập bảo mật của vợ đã hết hạn rồi nha! 🔒" 
      });
    }

    next();
  };

  app.use("/api", securityMiddleware);

  // --- CÁC ENDPOINT AUTH XÁC THỰC CÔNG KHAI ---

  // 1. Lấy thông tin allowlist và trạng thái liên kết
  app.get("/api/auth/config", (req, res) => {
    const store = loadSecurityStore();
    res.json({
      ok: true,
      allowedEmail: store.allowedEmail,
      allowedPhone: store.allowedPhone,
      allowedName: store.allowedName,
      hasApprovedDevice: !!store.approvedDeviceId
    });
  });

  // 2. Xác thực thông tin Google Sign-In và kiểm tra Allowlist + Device Binding
  app.post("/api/auth/google-verify", async (req, res) => {
    try {
      const { idToken, deviceId, deviceName, userAgent } = req.body;
      if (!idToken || !deviceId) {
        return res.status(400).json({ ok: false, error: "Vợ yêu ơi, thiếu thông tin ID Token hoặc Mã Thiết Bị rồi nha! 🔒" });
      }

      // Đọc cấu hình Firebase từ file config để lấy API Key
      const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
      const apiKey = firebaseConfig.apiKey;

      // Xác thực ID Token trực tiếp với Google Firebase Auth REST API
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.error("Lỗi xác thực ID Token từ Google/Firebase:", errText);
        return res.status(401).json({
          ok: false,
          error: "Xác thực mã đăng nhập Google thất bại hoặc phiên đã hết hạn. Vợ yêu hãy thử đăng nhập lại nhé! 🔒"
        });
      }

      const verifyData = (await verifyRes.json()) as { users?: Array<{ email?: string; emailVerified?: boolean; displayName?: string }> };
      const googleUser = verifyData.users?.[0];

      if (!googleUser || !googleUser.email) {
        return res.status(401).json({
          ok: false,
          error: "Không tìm thấy thông tin tài khoản Google của vợ yêu từ ID Token! 🔒"
        });
      }

      const email = googleUser.email.trim().toLowerCase();
      const store = loadSecurityStore();
      const allowedEmail = store.allowedEmail.trim().toLowerCase();

      // KIỂM TRA ALLOWLIST NGAY TRÊN BACKEND DỰA TRÊN EMAIL THẬT TỪ TOKEN
      if (email !== allowedEmail) {
        return res.status(403).json({
          ok: false,
          error: `Hệ Thống Từ Chối! Tài khoản Google '${email}' không nằm trong Allowlist ủy quyền. Chỉ duy nhất Nguyễn Thị Thu Trang mới được vào ứng dụng! 🔒`
        });
      }

      // Nếu là thiết bị đầu tiên, tự động liên kết (binding)
      if (!store.approvedDeviceId) {
        store.approvedDeviceId = deviceId;
        store.deviceHistory.push({
          deviceId,
          deviceName: deviceName || "Thiết bị đầu tiên của Trang",
          approvedAt: new Date().toISOString(),
          userAgent: userAgent || ""
        });
        saveSecurityStore(store);
      }

      // Kiểm tra Device Binding
      if (store.approvedDeviceId !== deviceId) {
        const prevDevice = store.deviceHistory.find(d => d.deviceId === store.approvedDeviceId);
        return res.json({
          ok: true,
          needsDeviceBindingApproval: true,
          previousDeviceName: prevDevice ? prevDevice.deviceName : "Thiết bị cũ"
        });
      }

      // Khớp thiết bị -> Cấp Session Token 30 ngày
      const sessionToken = "token_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      store.activeSessions[sessionToken] = {
        email: email,
        deviceId,
        createdAt: new Date().toISOString(),
        expiresAt
      };
      saveSecurityStore(store);

      res.json({
        ok: true,
        needsDeviceBindingApproval: false,
        sessionToken,
        user: {
          name: store.allowedName,
          email: store.allowedEmail,
          phone: store.allowedPhone
        }
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 3. Phê duyệt thiết bị mới và thu hồi thiết bị cũ
  app.post("/api/auth/approve-new-device", async (req, res) => {
    try {
      const { idToken, deviceId, deviceName, userAgent } = req.body;
      if (!idToken || !deviceId) {
        return res.status(400).json({ ok: false, error: "Thiếu thông tin mã ID Token hoặc thiết bị phê duyệt mới! 🔒" });
      }

      // Đọc cấu hình Firebase từ file config để lấy API Key
      const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
      const apiKey = firebaseConfig.apiKey;

      // Xác thực ID Token trực tiếp với Google Firebase Auth REST API
      const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.error("Lỗi xác thực ID Token khi phê duyệt thiết bị:", errText);
        return res.status(401).json({
          ok: false,
          error: "Xác thực mã đăng nhập Google thất bại hoặc phiên đã hết hạn. Vợ yêu hãy thử đăng nhập lại nhé! 🔒"
        });
      }

      const verifyData = (await verifyRes.json()) as { users?: Array<{ email?: string }> };
      const googleUser = verifyData.users?.[0];

      if (!googleUser || !googleUser.email) {
        return res.status(401).json({
          ok: false,
          error: "Không tìm thấy thông tin tài khoản Google của vợ yêu từ ID Token! 🔒"
        });
      }

      const email = googleUser.email.trim().toLowerCase();
      const store = loadSecurityStore();
      const allowedEmail = store.allowedEmail.trim().toLowerCase();

      if (email !== allowedEmail) {
        return res.status(403).json({ ok: false, error: "Hành động bị cấm! Tài khoản Google không trùng khớp với danh sách ủy quyền." });
      }

      // Thu hồi toàn bộ phiên hoạt động của thiết bị cũ để bảo mật an toàn tuyệt đối!
      store.activeSessions = {};

      // Liên kết thiết bị mới
      store.approvedDeviceId = deviceId;
      store.deviceHistory.push({
        deviceId,
        deviceName: deviceName || "Thiết bị mới của Trang",
        approvedAt: new Date().toISOString(),
        userAgent: userAgent || ""
      });

      // Cấp session mới cho thiết bị vừa kích hoạt
      const sessionToken = "token_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      store.activeSessions[sessionToken] = {
        email: email,
        deviceId,
        createdAt: new Date().toISOString(),
        expiresAt
      };

      saveSecurityStore(store);

      res.json({
        ok: true,
        sessionToken,
        user: {
          name: store.allowedName,
          email: store.allowedEmail,
          phone: store.allowedPhone
        }
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 4. Xác thực tự động Session khi mở lại app
  app.post("/api/auth/verify-session", (req, res) => {
    try {
      const { sessionToken, deviceId } = req.body;
      if (!sessionToken || !deviceId) {
        return res.status(400).json({ ok: false, error: "Thiếu mã phiên hoặc mã thiết bị!" });
      }

      const store = loadSecurityStore();
      const session = store.activeSessions[sessionToken];

      if (!session) {
        return res.json({ ok: false, error: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ!" });
      }

      if (session.deviceId !== deviceId || store.approvedDeviceId !== deviceId) {
        return res.json({ ok: false, error: "Thiết bị chưa được liên kết hoặc đã bị thu hồi quyền truy cập!" });
      }

      // Kiểm tra hết hạn
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        delete store.activeSessions[sessionToken];
        saveSecurityStore(store);
        return res.json({ ok: false, error: "Phiên đăng nhập đã hết hạn!" });
      }

      res.json({
        ok: true,
        user: {
          name: store.allowedName,
          email: store.allowedEmail,
          phone: store.allowedPhone
        }
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 5. Đăng xuất và thu hồi phiên
  app.post("/api/auth/logout", (req, res) => {
    try {
      const { sessionToken } = req.body;
      if (sessionToken) {
        const store = loadSecurityStore();
        delete store.activeSessions[sessionToken];
        saveSecurityStore(store);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
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
