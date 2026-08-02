import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize real screen height and true fullscreen listener
(() => {
  const root = document.documentElement;

  function updateRealScreenHeight() {
    root.style.setProperty(
      "--app-height",
      `${window.innerHeight}px`
    );
  }

  async function enterTrueFullscreen() {
    updateRealScreenHeight();

    if (document.fullscreenElement) {
      return;
    }

    try {
      await root.requestFullscreen({
        navigationUI: "hide"
      });
    } catch (error) {
      try {
        await root.requestFullscreen();
      } catch {
        /*
         * PWA đã cài vẫn sử dụng fullscreen từ manifest
         * khi thiết bị không cho phép Fullscreen API.
         */
      }
    }

    requestAnimationFrame(updateRealScreenHeight);

    setTimeout(updateRealScreenHeight, 100);
    setTimeout(updateRealScreenHeight, 350);
  }

  window.addEventListener(
    "resize",
    updateRealScreenHeight,
    { passive: true }
  );

  window.addEventListener(
    "orientationchange",
    updateRealScreenHeight,
    { passive: true }
  );

  document.addEventListener(
    "fullscreenchange",
    updateRealScreenHeight
  );

  document.addEventListener(
    "webkitfullscreenchange",
    updateRealScreenHeight
  );

  updateRealScreenHeight();

  (window as any).enterTrueFullscreen = enterTrueFullscreen;
  (window as any).enterAppFullscreen = enterTrueFullscreen;
})();

// Check if we are in development/preview environment
const isDevEnv = 
  window.location.hostname.includes("localhost") || 
  window.location.hostname.includes("127.0.0.1") || 
  window.location.hostname.includes("ais-dev") ||
  window.location.href.includes("dev-");

if (isDevEnv) {
  // Clear any existing Service Workers in development to ensure instant updates
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let hasUnregistered = false;
      for (const registration of registrations) {
        registration.unregister();
        hasUnregistered = true;
      }
      if (hasUnregistered) {
        console.log("[DEV] Unregistered Service Worker for hot reload!");
        caches.keys().then((keys) => {
          Promise.all(keys.map(key => caches.delete(key))).then(() => {
            window.location.reload();
          });
        });
      }
    });
  }

  // Double check and clear all caches in dev env
  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
} else {
  // Register Service Worker for PWA (production/shared app only)
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration failed: ', err);
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
