const fs = require('fs');
let code = fs.readFileSync('src/screens/LockScreen.tsx', 'utf-8');

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

code = code.replace(
  '  const handleGsiCredentialResponse = async (response: any) => {',
  registerFingerprintFunction + '\n  const handleGsiCredentialResponse = async (response: any) => {'
);

fs.writeFileSync('src/screens/LockScreen.tsx', code, 'utf-8');
console.log('Injected functions');
