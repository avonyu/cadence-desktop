import { type Caption, parseSubtitles } from "./subtitles";
import { invoke } from "@tauri-apps/api/core";

const DB_NAME = "cadence-subtitles";
const STORE_NAME = "cache";
const DB_VERSION = 3;

interface CacheEntry {
  hash: string;
  videoFileName: string;
  captions: Caption[];
  processedAt: string;
  subtitlePath?: string;
}

function getVideoBaseName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const stem = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  return stem.replace(/(_transcoded)+$/, "");
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      console.debug("[ai-subtitle] DB upgrade to v", DB_VERSION);
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        console.debug("[ai-subtitle] deleting old store:", STORE_NAME);
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "videoFileName" });
      console.debug("[ai-subtitle] created store:", STORE_NAME, "keyPath: videoFileName");
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

async function getCacheEntry(
  videoFileName: string,
): Promise<CacheEntry | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const lookupKey = getVideoBaseName(videoFileName);
      console.debug("[ai-subtitle] getCacheEntry input:", videoFileName, "→ lookupKey:", lookupKey);
      const request = store.get(lookupKey);
      request.onsuccess = () => {
        const entry = request.result ?? null;
        if (entry) {
          console.debug("[ai-subtitle] getCacheEntry HIT, hash:", entry.hash, "captions:", entry.captions.length);
        } else {
          console.debug("[ai-subtitle] getCacheEntry MISS for key:", lookupKey);
        }
        resolve(entry);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[ai-subtitle] getCacheEntry error:", err);
    return null;
  }
}

export async function setCachedSubtitle(
  hash: string,
  videoFileName: string | null,
  captions: Caption[],
  subtitlePath?: string,
): Promise<void> {
  const normalizedName = videoFileName ? getVideoBaseName(videoFileName) : null;
  if (!normalizedName) {
    console.debug("[ai-subtitle] setCachedSubtitle SKIP: videoFileName is null");
    return;
  }
  console.debug("[ai-subtitle] setCachedSubtitle input:", videoFileName, "→ normalized:", normalizedName, "hash:", hash, "captions:", captions.length, "subtitlePath:", subtitlePath);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: CacheEntry = {
      hash,
      videoFileName: normalizedName,
      captions,
      processedAt: new Date().toISOString(),
      ...(subtitlePath ? { subtitlePath } : {}),
    };
    const request = store.put(entry);
    request.onsuccess = () => {
      console.debug("[ai-subtitle] setCachedSubtitle SUCCESS for key:", normalizedName);
      resolve();
    };
    request.onerror = () => {
      console.error("[ai-subtitle] setCachedSubtitle FAILED:", request.error);
      reject(request.error);
    };
  });
}

export async function getSubtitlesForVideo(
  videoFileName: string,
): Promise<Caption[] | null> {
  const entry = await getCacheEntry(videoFileName);
  const result = entry?.captions ?? null;
  console.debug("[ai-subtitle] getSubtitlesForVideo input:", videoFileName, "→ result:", result ? `${result.length} captions` : "null");
  return result;
}

export async function getCachedSubtitlePath(
  videoFileName: string,
): Promise<string | null> {
  const entry = await getCacheEntry(videoFileName);
  return entry?.subtitlePath ?? null;
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

export async function clearCachedSubtitleForVideo(
  videoFileName: string,
): Promise<void> {
  const key = getVideoBaseName(videoFileName);
  console.debug("[ai-subtitle] clearCachedSubtitleForVideo key:", key);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Pre-process SRT content for AI:
 * - Merge multi-line text WITHIN a single timestamp block into one line.
 * - Keep every entry independent with its ORIGINAL timestamp.
 *   Cross-entry merging (split sentences) is intentionally NOT done here;
 *   that decision is delegated to the AI per the system prompt
 *   (default: do not merge; merge only when translation requires it; never merge lyrics).
 * ASS content is left unchanged (it already uses \N for line breaks).
 */
export function preprocessSrtContent(content: string): string {
  const format = content.trim().toLowerCase();
  if (format.startsWith("[script info]") || format.startsWith("[v4") || /^Dialogue:/m.test(content)) {
    return content;
  }

  const normalized = content.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n{2,}/);

  interface SrtEntry {
    timestamp: string;
    text: string;
  }

  const entries: SrtEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
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
      }
    }

    if (timestamp && textLines.length > 0) {
      entries.push({ timestamp, text: textLines.join(" ") });
    }
  }

  if (entries.length === 0) return normalized;

  return entries
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
  console.debug("AI-processed subtitle:", response);
  return response;
}

export async function processSubtitle(
  content: string,
  videoFileName: string | null,
  apiKey: string,
  model: string,
  force = false,
  subtitlePath?: string,
): Promise<Caption[]> {
  if (!apiKey) {
    throw new Error("DeepSeek API key is required");
  }

  const processed = preprocessSrtContent(content);
  const hash = await hashContent(processed);
  console.debug("[ai-subtitle] processSubtitle hash:", hash, "force:", force);

  const normalizedName = videoFileName
    ? getVideoBaseName(videoFileName)
    : null;
  if (videoFileName && !force) {
    console.debug("[ai-subtitle] processSubtitle checking cache for:", normalizedName);
    const entry = await getCacheEntry(videoFileName);
    if (entry) {
      console.debug("[ai-subtitle] processSubtitle cached entry hash:", entry.hash, "vs new hash:", hash, "match:", entry.hash === hash);
    }
    if (entry && entry.hash === hash) {
      console.debug("[ai-subtitle] processSubtitle HASH MATCH, skipping AI");
      return entry.captions;
    }
  } else {
    console.debug("[ai-subtitle] processSubtitle SKIP dedup: videoFileName is null");
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

  await setCachedSubtitle(hash, videoFileName, captions, subtitlePath);

  return captions;
}
