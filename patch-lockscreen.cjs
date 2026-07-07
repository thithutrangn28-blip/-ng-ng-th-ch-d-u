const fs = require('fs');
let code = fs.readFileSync('src/screens/LockScreen.tsx', 'utf-8');

if (!code.includes('@simplewebauthn/browser')) {
  code = code.replace(
    'import { compressImageFile } from "../utils/imageCompressor";',
    'import { compressImageFile } from "../utils/imageCompressor";\nimport { startRegistration, startAuthentication } from "@simplewebauthn/browser";'
  );
}

const registerFingerprintFunction = `
  const handleRegisterFingerprint = async () => {
    try {
      setIsProcessing(true);
      setAuthStepLogs(["Đang tạo yêu cầu đăng ký vân tay..."]);
      const res = await fetch("/api/auth/webauthn/generate-registration-options", { method: "POST" });
      const { options } = await res.json();
      
      setAuthStepLogs(prev => [...prev, "Vui lòng chạm vào cảm biến vân tay..."]);
      const attResp = await startRegistration({ optionsJSON: options });
      
      setAuthStepLogs(prev => [...prev, "Đang gửi dữ liệu vân tay lên server..."]);
      const verificationRes = await fetch("/api/auth/webauthn/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });
      const verificationJSON = await verificationRes.json();
      
      if (verificationJSON.ok) {
        setAuthStepLogs(prev => [...prev, "Đăng ký vân tay thành công! Vợ có thể dùng vân tay để mở app."]);
        setTimeout(() => setIsProcessing(false), 2000);
      } else {
        throw new Error(verificationJSON.error || "Lỗi khi đăng ký");
      }
    } catch (error: any) {
      console.error(error);
      setAuthError("Lỗi đăng ký vân tay: " + error.message);
      setIsProcessing(false);
    }
  };
`;

const loginFingerprintFunction = `
  const handleLoginFingerprint = async () => {
    try {
      setIsProcessing(true);
      setAuthError("");
      setAuthStepLogs(["Đang kết nối hệ thống vân tay..."]);
      
      const devId = getDeviceId();
      const res = await fetch("/api/auth/webauthn/generate-authentication-options", { method: "POST" });
      const data = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error || "Lỗi tạo yêu cầu vân tay");
      }

      setAuthStepLogs(prev => [...prev, "Vui lòng chạm vào cảm biến vân tay để xác thực..."]);
      const asseResp = await startAuthentication({ optionsJSON: data.options });
      
      setAuthStepLogs(prev => [...prev, "Đang xác thực dấu vân tay với máy chủ..."]);
      const verificationRes = await fetch("/api/auth/webauthn/verify-authentication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: asseResp,
          deviceId: devId,
          deviceName: navigator.userAgent
        }),
      });
      const verificationJSON = await verificationRes.json();
      
      if (verificationJSON.ok) {
        setAuthStepLogs(prev => [...prev, "Xác thực vân tay thành công! Đang vào app..."]);
        setSessionToken(verificationJSON.sessionToken);
        setSessionUser(verificationJSON.email);
        setTimeout(() => {
          setIsProcessing(false);
          onNext();
        }, 1500);
      } else {
        throw new Error(verificationJSON.error || "Sai vân tay rồi vợ ơi");
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message);
      setIsProcessing(false);
    }
  };
`;

if (!code.includes('handleRegisterFingerprint')) {
  code = code.replace(
    'const handleGoogleLogin = async () => {',
    registerFingerprintFunction + '\n' + loginFingerprintFunction + '\n  const handleGoogleLogin = async () => {'
  );
}

// Adding buttons to UI
const uiButtons = `
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={handleLoginFingerprint}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full py-4 font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  Đăng nhập bằng Vân Tay
                </button>

                <button
                  onClick={handleRegisterFingerprint}
                  disabled={isProcessing}
                  className="w-full text-sm text-gray-500 mt-2 underline"
                >
                  Đăng ký Vân tay mới (Lần đầu)
                </button>
              </div>
`;

if (!code.includes('Đăng nhập bằng Vân Tay')) {
  // Replace the Google login container with our fingerprint buttons
  code = code.replace(
    /<div className="w-full flex justify-center mt-6">[\s\S]*?<div id="google-signin-btn-container"><\/div>[\s\S]*?<\/div>/,
    uiButtons
  );
}

fs.writeFileSync('src/screens/LockScreen.tsx', code, 'utf-8');
console.log('Updated LockScreen.tsx');
