export type Run = {
  id: string;
  no: number;
  storyId: string;
  storyTitle: string;
  scope: string; // "room" | "all" | "manual"
  roomIndex?: number;
  roomName: string;
  title: string;
  prompt: string | any[];
  contextSnapshot: string;
  content: string;
  status: string; // "waiting" | "running" | "streaming" | "done" | "error" | "aborted" | "needs-api" | "empty" | "blank"
  createdAt: number;
  updatedAt: number;
};

const DB_NAME = "prompt_run_db_v1";
const STORE_NAME = "runs";

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("storyId", "storyId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function dbGetRunsByStory(storyId: string): Promise<Run[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("storyId");
    const req = idx.getAll(storyId);
    req.onsuccess = () => {
      const runs = req.result || [];
      runs.sort((a, b) => b.createdAt - a.createdAt); // newest first
      resolve(runs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbPutRun(run: Run): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(run);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearRunsByStory(storyId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const idx = tx.objectStore(STORE_NAME).index("storyId");
    const req = idx.openKeyCursor(storyId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        tx.objectStore(STORE_NAME).delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
