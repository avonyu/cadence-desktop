import { type Caption, parseSubtitles } from "./subtitles";
import { invoke } from "@tauri-apps/api/core";

const DB_NAME = "cadence-subtitles";
const STORE_NAME = "cache";
const DB_VERSION = 1;

interface CacheEntry {
  hash: string;
  videoFileName: string | null;
  captions: Caption[];
  processedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "hash" });
        store.createIndex("videoFileName", "videoFileName", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getCachedSubtitle(
  hash: string,
): Promise<Caption[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(hash);
      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        resolve(entry?.captions ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function setCachedSubtitle(
  hash: string,
  videoFileName: string | null,
  captions: Caption[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: CacheEntry = {
      hash,
      videoFileName,
      captions,
      processedAt: new Date().toISOString(),
    };
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSubtitlesForVideo(
  videoFileName: string,
): Promise<Caption[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("videoFileName");
      const request = index.get(videoFileName);
      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        resolve(entry?.captions ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearAllCachedSubtitles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function processSubtitleWithAI(
  content: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await invoke<string>("call_deepseek_api", {
    content,
    apiKey,
    model,
  });
  // Debug Output
  console.log("AI-processed subtitle:", response);
  return response;
}

export async function processSubtitle(
  content: string,
  videoFileName: string | null,
  apiKey: string,
  model: string,
): Promise<Caption[]> {
  if (!apiKey) {
    throw new Error("DeepSeek API key is required");
  }

  const hash = await hashContent(content);

  const cached = await getCachedSubtitle(hash);
  if (cached) {
    return cached;
  }

  const processedText = await processSubtitleWithAI(content, apiKey, model);

  const captions = parseSubtitles(processedText);
  if (captions.length === 0) {
    const preview =
      processedText.length > 200
        ? processedText.slice(0, 200) + "..."
        : processedText;
    throw new Error(
      `AI-processed subtitles could not be parsed. Response preview: "${preview}"`,
    );
  }

  await setCachedSubtitle(hash, videoFileName, captions);

  return captions;
}
