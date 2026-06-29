export type ApiProfile = {
  id: string;
  mode: "official" | "proxy";
  name: string;
  key: string;
  endpoint: string;
  pathMode: "auto" | "v1" | "none";
  format: "openai" | "responses" | "custom";
  model: string;
  maxTokens: number;
  timeoutSeconds: number;
  extraHeaders: Record<string, string>;
  primary: boolean;
  updatedAt: number;
};

const API_DB_NAME = "minmin_api_proxy_db_v7";
const API_STORE = "profiles";

function openApiDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(API_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(API_STORE)) {
        const store = db.createObjectStore(API_STORE, { keyPath: "id" });
        store.createIndex("primary", "primary", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(profile: ApiProfile): Promise<ApiProfile> {
  const db = await openApiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(API_STORE, "readwrite");
    tx.objectStore(API_STORE).put(profile);
    tx.oncomplete = () => resolve(profile);
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetAll(): Promise<ApiProfile[]> {
  const db = await openApiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(API_STORE, "readonly");
    const req = tx.objectStore(API_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(id: string): Promise<void> {
  const db = await openApiDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(API_STORE, "readwrite");
    tx.objectStore(API_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbClearPrimary(): Promise<void> {
  const all = await dbGetAll();
  await Promise.all(all.map((p) => dbPut({ ...p, primary: false })));
}
