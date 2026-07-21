export function getLockWallpaper(): string | null {
  try {
    return localStorage.getItem("minmin_wallpaper_v8") || "/assets/home-background.jpg";
  } catch (e) {
    return "/assets/home-background.jpg";
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
    return localStorage.getItem("minmin_home_wallpaper_v8") || "/assets/home-background.jpg";
  } catch (e) {
    return "/assets/home-background.jpg";
  }
}

export function setHomeWallpaper(dataUrl: string) {
  try {
    localStorage.setItem("minmin_home_wallpaper_v8", dataUrl);
  } catch (e) {
    // Ignore
  }
}
