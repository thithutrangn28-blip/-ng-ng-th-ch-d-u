import React, { useState, useRef } from "react";
import { exportData, importData } from "../lib/backup";
import { compressImageFile } from "../utils/imageCompressor";

type Props = {
  active: boolean;
  onHome: () => void;
};

export default function DataBackupScreen({ active, onHome }: Props) {
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const [backupBg, setBackupBg] = useState<string | null>(() => {
    try {
      return localStorage.getItem("minmin_home_wallpaper_v8") || "";
    } catch (e) {
      return "";
    }
  });

  const handleExport = async () => {
    setStatus("loading");
    setMsg("Đang thu thập dữ liệu...");
    try {
      const data = await exportData();
      let total = Object.keys(data.localStorage).length;
      for (const k in data.indexedDB) {
        total += data.indexedDB[k].length;
      }
      setStatus("success");
      setMsg(`Đã xuất thành công ${total} bản ghi. File sao lưu đã được tải xuống.`);
    } catch (e: any) {
      setStatus("error");
      setMsg(`Lỗi khi xuất: ${e.message}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Khôi phục sẽ ghi đè các mục trùng lặp. Vợ có chắc chắn muốn khôi phục không?")) {
       e.target.value = "";
       return;
    }

    setStatus("loading");
    setMsg("Đang khôi phục dữ liệu...");
    try {
      const total = await importData(file);
      setStatus("success");
      setMsg(`Đã khôi phục thành công ${total} bản ghi! Vui lòng tải lại trang.`);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setMsg(`Lỗi khi khôi phục: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleWallpaperClick = () => {
    wallpaperInputRef.current?.click();
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");
    setMsg("Đang tối ưu hóa hình nền...");
    try {
      const compressed = await compressImageFile(file, 1280, 1280, 0.85);
      localStorage.setItem("minmin_home_wallpaper_v8", compressed);
      setBackupBg(compressed);
      setStatus("success");
      setMsg("Đã cập nhật hình nền Toàn cục thành công! Khi vợ về màn hình chính sẽ thấy ngay nha. 🌸");
    } catch (err: any) {
      setStatus("error");
      setMsg(`Lỗi khi đổi hình nền: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleResetWallpaper = () => {
    try {
      localStorage.removeItem("minmin_home_wallpaper_v8");
      setBackupBg("");
      setStatus("success");
      setMsg("Đã khôi phục hình nền Toàn cục mặc định! ✨");
    } catch (err: any) {
      setStatus("error");
      setMsg(`Lỗi khi khôi phục: ${err.message}`);
    }
  };

  return (
    <section className={`screen api-screen ${active ? "active" : ""}`}>
      <div 
        className="api-bg" 
        style={backupBg ? { 
          backgroundImage: `url(${backupBg})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          opacity: 0.85
        } : {}}
      ></div>
      <section className="api-wrap" style={{ position: "relative", zIndex: 10 }}>
        <header className="api-head">
          <button className="btn soft" onClick={onHome} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, padding: '8px 14px', background: '#ffebee', color: '#c62828', border: '1px solid #e96b9b', borderRadius: '999px', cursor: 'pointer'}}>
            <svg viewBox="0 0 48 48" style={{width: 18, height: 18, stroke: 'currentColor', strokeWidth: 4, fill: 'none'}}><path d="M29 12L17 24l12 12"></path></svg>
            🏠 Về Home
          </button>
          <div className="api-title">
            <small>Layout & System</small>
            <h2>Dữ Liệu & Backup</h2>
          </div>
          <div style={{width: 48}}></div>
        </header>

        <div style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
          
          {/* GLOBAL WALLPAPER SELECTION */}
          <div className="pink-3-layer-card" style={{padding: '20px'}}>
            <h3 style={{fontSize: '18px', color: '#db2777', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
              🎨 Cài đặt hình nền Toàn cục
            </h3>
            <p style={{fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: 1.5}}>
              Chọn một hình ảnh tuyệt đỉnh từ thư viện thiết bị của vợ để làm hình nền Toàn cục (cho toàn hệ thống và màn hình chính). Khi vợ thoát ra vào lại, hình nền này vẫn giữ nguyên vẹn cho đến khi vợ thay đổi.
            </p>
            <input 
              type="file" 
              accept="image/*" 
              ref={wallpaperInputRef} 
              style={{display: 'none'}} 
              onChange={handleWallpaperChange}
            />
            <div style={{display: 'flex', gap: '10px'}}>
              <button 
                onClick={handleWallpaperClick}
                disabled={status === "loading"}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', background: '#ec4899', 
                  color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                  fontSize: '13px', opacity: status === "loading" ? 0.7 : 1
                }}
              >
                Chọn hình nền mới 📷
              </button>
              {backupBg && (
                <button 
                  onClick={handleResetWallpaper}
                  disabled={status === "loading"}
                  style={{
                    padding: '12px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', 
                    color: '#ec4899', fontWeight: 'bold', border: '1px solid rgba(236, 72, 153, 0.3)', cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Xóa nền Toàn cục 🗑️
                </button>
              )}
            </div>
          </div>

          <div className="pink-3-layer-card" style={{padding: '20px'}}>
            <h3 style={{fontSize: '18px', color: '#e11d48', marginBottom: '10px'}}>Export dữ liệu</h3>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: 1.5}}>
              Xuất toàn bộ câu chuyện, danh mục, cài đặt API và ảnh nền hiện tại thành một file bảo mật để chuyển sang app độc lập.
            </p>
            <button 
              onClick={handleExport}
              disabled={status === "loading"}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', background: '#f43f5e', 
                color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                opacity: status === "loading" ? 0.7 : 1
              }}
            >
              Tải file sao lưu (.json)
            </button>
          </div>

          <div className="pink-3-layer-card" style={{padding: '20px'}}>
            <h3 style={{fontSize: '18px', color: '#0ea5e9', marginBottom: '10px'}}>Import dữ liệu</h3>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: 1.5}}>
              Nhập file sao lưu vợ đã tải về để khôi phục lại toàn bộ dữ liệu. Thao tác này sẽ tải lại trang sau khi hoàn tất.
            </p>
            <input 
              type="file" 
              accept=".json,application/json" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              onChange={handleImport}
            />
            <button 
              onClick={handleImportClick}
              disabled={status === "loading"}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', background: '#0284c7', 
                color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                opacity: status === "loading" ? 0.7 : 1
              }}
            >
              Chọn file sao lưu
            </button>
          </div>

          {msg && (
            <div style={{
              padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold',
              background: status === "success" ? '#dcfce7' : status === "error" ? '#fee2e2' : '#fef3c7',
              color: status === "success" ? '#166534' : status === "error" ? '#991b1b' : '#92400e'
            }}>
              {msg}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
