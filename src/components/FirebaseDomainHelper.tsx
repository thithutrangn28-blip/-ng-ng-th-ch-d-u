import React, { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";

export default function FirebaseDomainHelper() {
  const [copied, setCopied] = useState(false);
  const hostname = window.location.hostname;

  const handleCopy = () => {
    navigator.clipboard.writeText(hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mt-4 text-white text-sm shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
        <h3 className="font-semibold text-pink-200">Cấu hình Authorized Domains</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-white/60 text-xs mb-1">Firebase Project:</p>
          <code className="bg-black/30 px-2 py-1 rounded text-pink-300 break-all block">
            true-river-479310-n9
          </code>
        </div>

        <div>
          <p className="text-white/60 text-xs mb-1">Tên miền hiện tại:</p>
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded group">
            <code className="text-pink-100 flex-1 break-all overflow-hidden text-ellipsis">
              {hostname}
            </code>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex shrink-0"
              title="Sao chép tên miền"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-white/70 group-hover:text-white" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[10px] text-green-400 mt-1">
              Đã sao chép tên miền để thêm vào Firebase Authorized Domains.
            </p>
          )}
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
          <p className="text-[11px] leading-relaxed text-white/80">
            <span className="text-pink-300 font-bold">Hướng dẫn:</span><br />
            1. Vào Firebase Console.<br />
            2. Authentication → Settings → Authorized domains.<br />
            3. Bấm <span className="font-semibold text-white">Add domain</span>.<br />
            4. Dán tên miền vừa sao chép vào.
          </p>
        </div>
      </div>
    </div>
  );
}
