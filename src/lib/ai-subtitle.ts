import { type Caption, parseSubtitles, detectFormat } from "./subtitles";
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
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // Remove old cache entries for the same video so only the latest is kept
  if (videoFileName) {
    const index = store.index("videoFileName");
    const oldEntries: CacheEntry[] = await new Promise((resolve, reject) => {
      const req = index.getAll(videoFileName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    for (const old of oldEntries) {
      store.delete(old.hash);
    }
  }

  const entry: CacheEntry = {
    hash,
    videoFileName,
    captions,
    processedAt: new Date().toISOString(),
  };
  store.put(entry);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

/**
 * Pre-process SRT content for AI:
 * 1. Merge multi-line text within each block into a single line.
 * 2. Merge consecutive subtitle entries that form a broken sentence
 *    across timestamps (e.g., a sentence split mid-thought).
 * ASS content is left unchanged (it already uses \N for line breaks).
 */
export function preprocessSrtContent(content: string): string {
  const format = detectFormat(content);
  if (format === "ass") return content;

  const normalized = content.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n{2,}/);

  // Step 1: Parse blocks into structured entries
  interface SrtEntry {
    index: string;
    timestamp: string;
    start: string;
    end: string;
    text: string;
  }

  const entries: SrtEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let index = "";
    let timestamp = "";
    const textLines: string[] = [];
    let foundTimestamp = false;

    for (const line of lines) {
      if (line.includes("-->")) {
        timestamp = line.trim();
        foundTimestamp = true;
      } else if (foundTimestamp) {
        const trimmed = line.trim();
        if (trimmed) textLines.push(trimmed);
      } else {
        index = line.trim();
      }
    }

    if (timestamp && textLines.length > 0) {
      const [start, end] = timestamp.split("-->").map((s) => s.trim());
      entries.push({
        index,
        timestamp,
        start,
        end: end || start,
        text: textLines.join(" "),
      });
    }
  }

  if (entries.length === 0) return normalized;

  // Step 2: Merge consecutive entries where a sentence is split across timestamps
  const merged: SrtEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    if (merged.length > 0) {
      const prev = merged[merged.length - 1];
      const curr = entries[i];

      // Heuristic for continuation:
      // - Previous text doesn't end with sentence-ending punctuation
      // - Current text starts with lowercase (not a new sentence or speaker tag)
      // - Current text is short (likely a fragment, not a complete subtitle)
      const prevEndsIncomplete = !/[.!?›»"']$/.test(prev.text.trim());
      const currStartsLowercase = /^[a-z(<]/.test(curr.text.trim());
      const currIsFragment = curr.text.length < 50;

      if (prevEndsIncomplete && currStartsLowercase && currIsFragment) {
        prev.end = curr.end;
        prev.timestamp = `${prev.start} --> ${curr.end}`;
        prev.text = prev.text + " " + curr.text;
        continue;
      }
    }

    merged.push({ ...entries[i] });
  }

  // Step 3: Reconstruct SRT with sequential numbering
  return merged
    .map((entry, i) => `${i + 1}\n${entry.timestamp}\n${entry.text}`)
    .join("\n\n");
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

  const processed = preprocessSrtContent(content);
  const hash = await hashContent(processed);

  const cached = await getCachedSubtitle(hash);
  if (cached) {
    return cached;
  }

  const processedText = await processSubtitleWithAI(processed, apiKey, model);

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
