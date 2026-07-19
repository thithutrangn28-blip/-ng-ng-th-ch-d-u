export const exportData = async () => {
  // localStorage
  const localData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      localData[key] = localStorage.getItem(key) || "";
    }
  }

  // indexedDBs
  const getIDBData = async (dbName: string, storeName: string) => {
    return new Promise<any[]>((resolve) => {
      try {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            resolve([]);
            return;
          }
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const allReq = store.getAll();
          allReq.onsuccess = () => resolve(allReq.result);
          allReq.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  };

  const getIDBDataWithKeys = async (dbName: string, storeName: string) => {
    return new Promise<{key: any, value: any}[]>((resolve) => {
      try {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            resolve([]);
            return;
          }
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const cursorReq = store.openCursor();
          const results: {key: any, value: any}[] = [];
          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              results.push({ key: cursor.key, value: cursor.value });
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          cursorReq.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  };

  const idbDatabases = [
    { db: "prompt_markdown_db_v1", store: "stories", useKeys: false },
    { db: "minmin_api_proxy_db_v7", store: "profiles", useKeys: false },
    { db: "prompt_run_db_v1", store: "runs", useKeys: false },
    { db: "lipstick_db_v1", store: "state", useKeys: true },
  ];

  const idbData: Record<string, any> = {};
  for (const info of idbDatabases) {
    if (info.useKeys) {
      idbData[info.db] = await getIDBDataWithKeys(info.db, info.store);
    } else {
      idbData[info.db] = await getIDBData(info.db, info.store);
    }
  }

  const exportObj = {
    timestamp: new Date().toISOString(),
    localStorage: localData,
    indexedDB: idbData
  };

  const blob = new Blob([JSON.stringify(exportObj)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BanhQuyBo_Backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  return exportObj;
};

export const importData = async (file: File) => {
  return new Promise<number>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (!data || !data.localStorage || !data.indexedDB) {
          throw new Error("File sao lưu không hợp lệ");
        }

        // Restore localStorage
        for (const [key, value] of Object.entries(data.localStorage)) {
          localStorage.setItem(key, value as string);
        }

        // Restore indexedDB
        const putIDBData = async (dbName: string, storeName: string, items: any[], useKeys: boolean, keyPath?: string) => {
          return new Promise<void>((res) => {
            try {
              const req = indexedDB.open(dbName);
              req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(storeName)) {
                  if (keyPath) {
                    db.createObjectStore(storeName, { keyPath });
                  } else {
                    db.createObjectStore(storeName);
                  }
                }
              };
              req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(storeName)) {
                  res(); return; // fallback
                }
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                
                // optional: store.clear() ? We don't want to lose existing data? The prompt says "Không xóa, reset hoặc ghi đè dữ liệu hiện có" but wait... if importing from the same ID, it will overwrite the specific records. If they are migrating from AI studio to PWA, the PWA is fresh. But if they already have data, should we merge or replace? The user says "Không xóa, reset hoặc ghi đè dữ liệu hiện có" before backup, meaning don't lose data. But "khôi phục toàn bộ dữ liệu" means restore everything.
                // We'll just do `put` which merges/updates by key.

                for (const item of items) {
                  if (useKeys) {
                    store.put(item.value, item.key);
                  } else {
                    store.put(item);
                  }
                }
                
                tx.oncomplete = () => res();
                tx.onerror = () => res();
              };
              req.onerror = () => res();
            } catch(e) { res(); }
          });
        };

        const idbConfigs = [
          { db: "prompt_markdown_db_v1", store: "stories", useKeys: false, keyPath: "id" },
          { db: "minmin_api_proxy_db_v7", store: "profiles", useKeys: false, keyPath: "id" },
          { db: "prompt_run_db_v1", store: "runs", useKeys: false, keyPath: "id" },
          { db: "lipstick_db_v1", store: "state", useKeys: true, keyPath: "" },
        ];

        for (const info of idbConfigs) {
          if (data.indexedDB[info.db]) {
            await putIDBData(info.db, info.store, data.indexedDB[info.db], info.useKeys, info.keyPath);
          }
        }
        
        // Return item count for stats
        let totalItems = Object.keys(data.localStorage).length;
        for (const dbName in data.indexedDB) {
          totalItems += data.indexedDB[dbName].length;
        }

        resolve(totalItems);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsText(file);
  });
};
