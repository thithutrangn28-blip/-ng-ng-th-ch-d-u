const fs = require('fs');
let code = fs.readFileSync('src/screens/LockScreen.tsx', 'utf-8');

const uiButtons = `
              <div className="flex flex-col gap-3 mt-6 w-full px-4">
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

code = code.replace(
  /<div className="w-full flex justify-center py-2 min-h-\[52px\]">\s*<div id="google-signin-btn-container" className="flex justify-center" \/>\s*<\/div>/,
  uiButtons
);

fs.writeFileSync('src/screens/LockScreen.tsx', code, 'utf-8');
console.log('Updated LockScreen.tsx UI');
