const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Add import
if (!serverCode.includes('@simplewebauthn/server')) {
  serverCode = serverCode.replace('import { createServer as createViteServer } from "vite";', 
  `import { createServer as createViteServer } from "vite";\nimport { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";`);
}

// Update Interface
if (!serverCode.includes('webAuthnCredential?:')) {
  serverCode = serverCode.replace('activeSessions: Record<string, {', 
  `webAuthnCredential?: { id: string; publicKey: string; counter: number; transports?: string[] };\n  currentChallenge?: string;\n  activeSessions: Record<string, {`);
}

// Add routes
if (!serverCode.includes('/api/auth/webauthn/generate-registration-options')) {
  const routes = `
  // --- WEBAUTHN / FINGERPRINT AUTHENTICATION ---
  
  const rpName = "App Của Vợ";
  const rpID = process.env.NODE_ENV === "production" ? "ng-ng-th-ch-d-u.vercel.app" : "localhost";
  const origin = process.env.NODE_ENV === "production" ? \`https://\${rpID}\` : \`http://\${rpID}:3000\`;

  app.post("/api/auth/webauthn/generate-registration-options", async (req, res) => {
    const store = loadSecurityStore();
    
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from("user-trang-id")),
      userName: store.allowedEmail,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });

    store.currentChallenge = options.challenge;
    saveSecurityStore(store);

    res.json({ ok: true, options });
  });

  app.post("/api/auth/webauthn/verify-registration", async (req, res) => {
    const store = loadSecurityStore();
    const { body } = req;
    
    const expectedChallenge = store.currentChallenge;
    if (!expectedChallenge) {
      return res.status(400).json({ ok: false, error: "Không tìm thấy challenge" });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: [origin, "https://ng-ng-th-ch-d-u.vercel.app"],
        expectedRPID: [rpID, "ng-ng-th-ch-d-u.vercel.app"],
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        store.webAuthnCredential = {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64"),
          counter: credential.counter,
          transports: credential.transports,
        };
        store.currentChallenge = undefined;
        saveSecurityStore(store);
        return res.json({ ok: true });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.status(400).json({ ok: false, error: "Xác thực thất bại" });
  });

  app.post("/api/auth/webauthn/generate-authentication-options", async (req, res) => {
    const store = loadSecurityStore();
    
    if (!store.webAuthnCredential) {
      return res.status(400).json({ ok: false, error: "Chưa đăng ký vân tay nào cả. Vợ hãy đăng ký trước nha!" });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: store.webAuthnCredential.id,
        transports: store.webAuthnCredential.transports as any,
      }],
      userVerification: "required",
    });

    store.currentChallenge = options.challenge;
    saveSecurityStore(store);

    res.json({ ok: true, options });
  });

  app.post("/api/auth/webauthn/verify-authentication", async (req, res) => {
    const { body } = req;
    const store = loadSecurityStore();
    const deviceId = req.headers["x-device-id"]?.toString().trim() || body.deviceId;
    
    const expectedChallenge = store.currentChallenge;
    if (!expectedChallenge || !store.webAuthnCredential) {
      return res.status(400).json({ ok: false, error: "Không tìm thấy challenge hoặc vân tay" });
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge,
        expectedOrigin: [origin, "https://ng-ng-th-ch-d-u.vercel.app"],
        expectedRPID: [rpID, "ng-ng-th-ch-d-u.vercel.app"],
        credential: {
          id: store.webAuthnCredential.id,
          publicKey: new Uint8Array(Buffer.from(store.webAuthnCredential.publicKey, "base64")),
          counter: store.webAuthnCredential.counter,
          transports: store.webAuthnCredential.transports as any,
        }
      });

      if (verification.verified) {
        const authenticationInfo = verification.authenticationInfo;
        store.webAuthnCredential.counter = authenticationInfo.newCounter;
        store.currentChallenge = undefined;
        
        // Cấp session
        const sessionToken = "token_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        // Link device if needed
        if (!store.approvedDeviceId) {
           store.approvedDeviceId = deviceId;
           store.deviceHistory.push({
             deviceId,
             deviceName: body.deviceName || "Thiết bị vân tay của Trang",
             approvedAt: new Date().toISOString(),
             userAgent: body.userAgent || ""
           });
        }
        
        store.activeSessions[sessionToken] = {
          email: store.allowedEmail,
          deviceId: deviceId || store.approvedDeviceId,
          createdAt: new Date().toISOString(),
          expiresAt
        };

        saveSecurityStore(store);

        return res.json({ 
          ok: true,
          sessionToken,
          email: store.allowedEmail,
          message: "Xác thực vân tay thành công!"
        });
      }
    } catch (error: any) {
      console.error("Lỗi xác thực vân tay:", error);
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.status(400).json({ ok: false, error: "Xác thực vân tay thất bại" });
  });
`;

  serverCode = serverCode.replace('// --- CÁC ENDPOINT AUTH XÁC THỰC CÔNG KHAI ---', '// --- CÁC ENDPOINT AUTH XÁC THỰC CÔNG KHAI ---\n' + routes);
}

fs.writeFileSync('server.ts', serverCode, 'utf-8');
console.log('Updated server.ts with WebAuthn endpoints');
