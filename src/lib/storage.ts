export function getLockWallpaper(): string | null {
  try {
    return localStorage.getItem("minmin_wallpaper_v8") || "https://i.postimg.cc/DfDBDy6B/591e0462b0fdbd4f23c06715e667aa3d.jpg";
  } catch (e) {
    return "https://i.postimg.cc/DfDBDy6B/591e0462b0fdbd4f23c06715e667aa3d.jpg";
  }
}

export function setLockWallpaper(dataUrl: string) {
  try {
    localStorage.setItem("minmin_wallpaper_v8", dataUrl);
  } catch (e) {
    // Ignore
  }
}

export function getHomeWallpaper(): string | null {
  try {
    return localStorage.getItem("minmin_home_wallpaper_v8") || "https://i.postimg.cc/DfDBDy6B/591e0462b0fdbd4f23c06715e667aa3d.jpg";
  } catch (e) {
    return "https://i.postimg.cc/DfDBDy6B/591e0462b0fdbd4f23c06715e667aa3d.jpg";
  }
}

export function setHomeWallpaper(dataUrl: string) {
  try {
    localStorage.setItem("minmin_home_wallpaper_v8", dataUrl);
  } catch (e) {
    // Ignore
  }
}
