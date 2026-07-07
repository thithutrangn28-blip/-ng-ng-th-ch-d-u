/**
 * Utility sao chép văn bản an toàn tuyệt đối (Smart Safe Clipboard)
 * Khắc phục triệt để lỗi văng app / crash ứng dụng trong iframe, trên mobile Safari/Chrome
 * khi người dùng lỡ thoát app vào lại bị mất quyền focus hoặc từ chối clipboard write.
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (!text) return false;

  // Phương pháp 1: Thử dùng Clipboard API hiện đại với try-catch an toàn
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[Clipboard API] Lỗi quyền hoặc mất focus khi vào lại app, chuyển sang fallback execCommand:", err);
  }

  // Phương pháp 2 (Fallback An Toàn): Dùng document.execCommand('copy') với textarea ẩn
  // Không bao giờ gây văng ứng dụng kể cả khi iframe mất quyền focus
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      // Đảm bảo textarea không gây cuộn trang hay lộ giao diện
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      
      // Chọn văn bản tương thích tốt trên cả iOS / Android / Desktop
      if (navigator.userAgent.match(/ipad|iphone|ipod/i)) {
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textarea.setSelectionRange(0, 999999);
      } else {
        textarea.focus();
        textarea.select();
      }

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (successful) return true;
    }
  } catch (fallbackErr) {
    console.error("[Clipboard Fallback] Lỗi sao chép fallback:", fallbackErr);
  }

  return false;
}
