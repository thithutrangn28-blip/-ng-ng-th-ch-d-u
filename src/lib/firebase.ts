import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import localFirebaseConfig from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || localFirebaseConfig.appId,
};

// Log for debugging (Only show essential info, no full keys)
console.log("--- Firebase Runtime Config ---");
console.log("Hostname:", window.location.hostname);
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);
console.log("Using Env Vars:", !!((import.meta as any).env.VITE_FIREBASE_PROJECT_ID));
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase API Key is missing! Please set VITE_FIREBASE_API_KEY in environment variables.");
}
console.log("-------------------------------");

// Initialize Firebase App
let app;
try {
  if (getApps().length === 0) {
    if (!firebaseConfig.apiKey && typeof window !== "undefined") {
      console.error("🚨 THÔNG BÁO TỪ CHỒNG: Thiếu VITE_FIREBASE_API_KEY rồi vợ ơi! App sẽ không thể xác thực được đâu nè.");
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // Fallback to a dummy app object or handle gracefully
  app = { options: firebaseConfig } as any;
}

// Cảnh báo nếu authDomain bị đặt sai thành hostname (lỗi phổ biến khi deploy)
if (typeof window !== "undefined" && firebaseConfig.authDomain === window.location.hostname) {
  console.error("🚨 THÔNG BÁO TỪ CHỒNG: authDomain không được trùng với hostname! Vợ hãy kiểm tra lại biến môi trường VITE_FIREBASE_AUTH_DOMAIN nhen. Nó phải là project-id.firebaseapp.com mới đúng nè vợ.");
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Standard OAuth parameters
googleProvider.setCustomParameters({
  prompt: "select_account"
});
export default app;
