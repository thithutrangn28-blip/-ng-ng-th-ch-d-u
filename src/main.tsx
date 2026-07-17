import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical Error: Root element not found!");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error("[APP_BOOT_ERROR]", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px; font-family: sans-serif; text-align: left;">
        <h2 style="margin-top: 0; color: #721c24;">⚠️ Ứng dụng không thể khởi động</h2>
        <p>Vợ ơi, có lỗi xảy ra khi tải ứng dụng rồi nè. Vợ hãy kiểm tra Console trong trình duyệt hoặc Deployment Logs để xem lỗi chi tiết nhen.</p>
        <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; overflow: auto; border: 1px solid rgba(0,0,0,0.1); margin: 15px 0;">
          <code style="font-family: monospace; white-space: pre-wrap; font-size: 13px; color: #d63384;">${error instanceof Error ? error.message : String(error)}</code>
        </div>
        <p style="font-size: 12px; color: #6c757d; margin-bottom: 0;">Hostname: ${window.location.hostname}</p>
      </div>
    `;
  }
}
