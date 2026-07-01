const DB_NAME = "cadence-word-cache";
const DB_VERSION = 1;
const STORE_NAME = "words";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "word" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadCache(): Promise<Map<string, unknown>> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const map = new Map<string, unknown>();
        for (const item of req.result) {
          map.set(item.word, item.definition);
        }
        resolve(map);
      };
      req.onerror = () => resolve(new Map());
      tx.oncomplete = () => db.close();
    });
  } catch (e) {
    console.warn("[word-cache] loadCache failed:", e instanceof Error ? e.message : e);
    return new Map();
  }
}

export async function saveToCache(
  word: string,
  definition: unknown,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ word: word.toLowerCase(), definition });
    tx.oncomplete = () => db.close();
  } catch (e) {
    console.warn("[word-cache] saveToCache failed for", word, ":", e instanceof Error ? e.message : e);
  }
}
