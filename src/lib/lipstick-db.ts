import { LipstickState } from "./lipstick-types";

const DB_NAME = "lipstick_db_v1";
const STORE_NAME = "state";
const LOCAL_STORAGE_KEY = "lipstickPromptRoomsV6";

let memoryFallback: LipstickState | null = null;

async function getDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        } catch (e) {
          resolve(null);
        }
      };
      req.onsuccess = () => resolve(req.result);
    } catch (e) {
      resolve(null);
    }
  });
}

export async function getLipstickState(): Promise<LipstickState | null> {
  // First try IndexedDB
  try {
    const db = await getDB();
    if (db) {
      const idbResult = await new Promise<LipstickState | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get("main");
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
      if (idbResult) return idbResult;
    }
  } catch (e) {}

  // Try localStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed) return parsed;
    }
  } catch (e) {}

  // Return memory fallback or null
  return memoryFallback;
}

export async function saveLipstickState(state: LipstickState): Promise<void> {
  memoryFallback = state;

  // Try localStorage first (fast and synchronous)
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

  // Try IndexedDB asynchronously
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const req = tx.objectStore(STORE_NAME).put(state, "main");
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
  } catch (e) {}
}

