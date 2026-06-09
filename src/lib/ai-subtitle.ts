import { type Caption, parseSubtitles } from "./subtitles";
import { invoke } from "@tauri-apps/api/core";

const CACHE_PREFIX = "cadence:subtitle:";

interface CacheEntry {
  hash: string;
  videoFileName: string | null;
  captions: Caption[];
  processedAt: string;
}

export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCachedSubtitle(hash: string): Caption[] | null {
  const raw = localStorage.getItem(CACHE_PREFIX + hash);
  if (!raw) return null;
  try {
    const entry: CacheEntry = JSON.parse(raw);
    return entry.captions;
  } catch {
    return null;
  }
}

export function setCachedSubtitle(
  hash: string,
  videoFileName: string | null,
  captions: Caption[],
): void {
  const entry: CacheEntry = {
    hash,
    videoFileName,
    captions,
    processedAt: new Date().toISOString(),
  };
  localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify(entry));
}

export function getSubtitlesForVideo(videoFileName: string): Caption[] | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(CACHE_PREFIX)) continue;
    try {
      const entry: CacheEntry = JSON.parse(localStorage.getItem(key)!);
      if (entry.videoFileName === videoFileName) {
        return entry.captions;
      }
    } catch {
      continue;
    }
  }
  return null;
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

  const cached = getCachedSubtitle(hash);
  if (cached) {
    return cached;
  }

  const processedText = await processSubtitleWithAI(content, apiKey, model);

  const captions = parseSubtitles(processedText);
  if (captions.length === 0) {
    throw new Error(
      "AI-processed subtitles could not be parsed into any caption entries",
    );
  }

  setCachedSubtitle(hash, videoFileName, captions);

  return captions;
}
