import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import localFirebaseConfig from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: localFirebaseConfig.apiKey,
  authDomain: localFirebaseConfig.authDomain,
  projectId: localFirebaseConfig.projectId,
  storageBucket: localFirebaseConfig.storageBucket,
  messagingSenderId: localFirebaseConfig.messagingSenderId,
  appId: localFirebaseConfig.appId,
};

// Log for debugging
console.log("hostname:", window.location.hostname);
console.log("env.VITE_FIREBASE_PROJECT_ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("projectId (config):", firebaseConfig.projectId);
console.log("authDomain:", firebaseConfig.authDomain);

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Standard OAuth parameters
googleProvider.setCustomParameters({
  prompt: "select_account"
});
export default app;
