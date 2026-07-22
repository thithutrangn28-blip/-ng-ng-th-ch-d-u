import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
