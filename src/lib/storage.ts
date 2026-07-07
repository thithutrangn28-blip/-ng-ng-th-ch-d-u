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

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem("minmin_device_id_v1");
    if (!id) {
      id = "dev_device_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("minmin_device_id_v1", id);
    }
    return id;
  } catch (e) {
    return "dev_device_fallback_" + Date.now();
  }
}

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem("minmin_session_token_v1");
  } catch (e) {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem("minmin_session_token_v1", token);
    } else {
      localStorage.removeItem("minmin_session_token_v1");
    }
  } catch (e) {}
}

export function getSessionUser(): { name: string; email: string; phone: string } | null {
  try {
    const saved = localStorage.getItem("minmin_session_user_v1");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function setSessionUser(user: { name: string; email: string; phone: string } | null) {
  try {
    if (user) {
      localStorage.setItem("minmin_session_user_v1", JSON.stringify(user));
    } else {
      localStorage.removeItem("minmin_session_user_v1");
    }
  } catch (e) {}
}

export interface DevSecuritySettings {
  devModeEnabled: boolean;
  devEmail: string;
  devPassword?: string;
}

export function getDevSecuritySettings(): DevSecuritySettings {
  try {
    const saved = localStorage.getItem("minmin_dev_security_v1");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return {
    devModeEnabled: true,
    devEmail: "thithutrangn28@gmail.com",
    devPassword: "trangdev2026"
  };
}

export function setDevSecuritySettings(settings: DevSecuritySettings) {
  try {
    localStorage.setItem("minmin_dev_security_v1", JSON.stringify(settings));
  } catch (e) {}
}

