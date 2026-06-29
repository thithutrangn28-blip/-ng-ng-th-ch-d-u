export function getLockWallpaper(): string | null {
  try {
    return localStorage.getItem("minmin_wallpaper_v7");
  } catch (e) {
    return null;
  }
}

export function setLockWallpaper(dataUrl: string) {
  try {
    localStorage.setItem("minmin_wallpaper_v7", dataUrl);
  } catch (e) {
    // Ignore
  }
}

export function getHomeWallpaper(): string | null {
  try {
    return localStorage.getItem("minmin_home_wallpaper_v7");
  } catch (e) {
    return null;
  }
}

export function setHomeWallpaper(dataUrl: string) {
  try {
    localStorage.setItem("minmin_home_wallpaper_v7", dataUrl);
  } catch (e) {
    // Ignore
  }
}
