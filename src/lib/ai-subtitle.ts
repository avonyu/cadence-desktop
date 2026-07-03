import { type Caption, parseSubtitles } from "./subtitles";
import { detectTextLanguage } from "./language-detect";
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

// ─── JSON schema types ──────────────────────────────────────────────────────

export interface SubtitleInputEntry {
  index: number;
  timestamp: string;
  text: string;
  preTranslation?: string;
}

interface SubtitleJSONEntry {
  i: number;
  s: string;
  t: string | null;
  st?: "i" | "b" | "u";
  sh: boolean;
}

interface SubtitleJSON {
  f: "srt" | "ass";
  e: SubtitleJSONEntry[];
}

// ─── Preprocessing: extract entries (timestamps stay in memory) ─────────────

function stripAssStyleTags(text: string): string {
  return text.replace(/\{[^}]*\}/g, "").trim();
}

export function preprocessSubtitleEntries(content: string): SubtitleInputEntry[] {
  const lower = content.trim().toLowerCase();
  const isAss = lower.startsWith("[script info]") || lower.startsWith("[v4") || /^Dialogue:/m.test(content);

  if (isAss) {
    return preprocessAssEntries(content);
  }
  return preprocessSrtEntries(content);
}

function preprocessSrtEntries(content: string): SubtitleInputEntry[] {
  const normalized = content.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n{2,}/);
  const entries: SubtitleInputEntry[] = [];
  let index = 0;

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
      index++;

      if (textLines.length === 2) {
        const lang0 = detectTextLanguage(textLines[0]);
        const lang1 = detectTextLanguage(textLines[1]);
        if (lang0 !== lang1 && lang0 !== "unknown" && lang1 !== "unknown") {
          entries.push({
            index,
            timestamp,
            text: textLines[0],
            preTranslation: textLines[1],
          });
          continue;
        }
      }

      entries.push({ index, timestamp, text: textLines.join(" ") });
    }
  }

  return entries;
}

function preprocessAssEntries(content: string): SubtitleInputEntry[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const entries: SubtitleInputEntry[] = [];
  let index = 0;

  for (const line of lines) {
    if (!line.startsWith("Dialogue:")) continue;

    const contentPart = line.slice("Dialogue:".length).trim();

    const commaIndices: number[] = [];
    for (let i = 0; i < contentPart.length && commaIndices.length < 9; i++) {
      if (contentPart[i] === ",") commaIndices.push(i);
    }
    if (commaIndices.length < 9) continue;

    const fields: string[] = [];
    let prevIdx = 0;
    for (const idx of commaIndices) {
      fields.push(contentPart.slice(prevIdx, idx));
      prevIdx = idx + 1;
    }

    const rawWithTags = contentPart.slice(prevIdx).trim();

    // Skip on-screen text overlays / annotations: lines with positioning
    // or alignment tags (\an8, \pos, \move) are never spoken dialogue.
    if (/\\pos\(|\\move\(|\\an8/.test(rawWithTags)) continue;

    const rawText = stripAssStyleTags(rawWithTags);
    if (!rawText) continue;

    const timestamp = `${fields[1]} --> ${fields[2]}`;

    // Split on \N — first part = source, remaining = pre-existing translation
    const parts = rawText
      .split(/\\N|\\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const text = parts[0] || "";
    const preTranslation = parts.length >= 2 ? parts.slice(1).join(" ") : undefined;

    if (!text) continue;

    index++;
    entries.push({ index, timestamp, text, preTranslation });
  }

  return entries;
}

/**
 * Build a compact numbered list for the AI.
 * Only sends index + text — timestamps stay in memory.
 */
export function buildEntriesForAI(entries: SubtitleInputEntry[]): string {
  return entries.map((e) => `${e.index}: ${e.text}`).join("\n");
}

// ─── JSON parsing & assembly ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function timestampToSeconds(timestamp: string): number {
  let match = timestamp.trim().match(/(\d+):(\d{2}):(\d{2})([,.](\d+))?/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const secs = parseInt(match[3], 10);
    let frac = 0;
    if (match[5]) frac = parseInt(match[5].padEnd(3, "0").slice(0, 3), 10);
    return hours * 3600 + mins * 60 + secs + frac / 1000;
  }
  match = timestamp.trim().match(/(\d+):(\d{2})([,.](\d+))?/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    let frac = 0;
    if (match[4]) frac = parseInt(match[4].padEnd(3, "0").slice(0, 3), 10);
    return mins * 60 + secs + frac / 1000;
  }
  return 0;
}

function applyStyle(text: string, style: SubtitleJSONEntry["st"]): string {
  if (!text || !style) return text;
  return `<${style}>${text}</${style}>`;
}

/**
 * Parse AI JSON response and merge with input entries (which hold timestamps).
 */
function parseSubtitleJSON(
  json: SubtitleJSON,
  inputEntries: SubtitleInputEntry[],
): Caption[] {
  const entryMap = new Map(inputEntries.map((e) => [e.index, e]));
  const captions: Caption[] = [];

  for (const je of json.e) {
    if (!je.sh) continue;

    const inputEntry = entryMap.get(je.i);
    if (!inputEntry) {
      console.warn("[ai-subtitle] parseSubtitleJSON: no input entry for index", je.i);
      continue;
    }

    const [startStr, endStr] = inputEntry.timestamp.split("-->").map((s) => s.trim());
    const start = timestampToSeconds(startStr);
    const end = endStr ? timestampToSeconds(endStr) : start + 2;

    const aiTranslation = inputEntry.preTranslation ?? je.t ?? "";
    const styledSource = applyStyle(je.s, je.st);
    const styledTranslation = applyStyle(aiTranslation, je.st);

    captions.push({
      time: formatTime(start),
      start,
      end,
      text: styledSource,
      translation: styledTranslation,
    });
  }

  captions.sort((a, b) => a.start - b.start);
  return captions;
}

/**
 * Attempt to parse AI response as JSON. Returns null if parsing fails
 * (caller should fall back to legacy text parsing).
 */
function tryParseJSONResponse(raw: string): SubtitleJSON | null {
  try {
    // Strip possible markdown fences
    const cleaned = raw.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let jsonStr = cleaned;

    const fenceStart = cleaned.indexOf("```");
    if (fenceStart !== -1) {
      const afterFence = cleaned.slice(fenceStart + 3);
      const nlIdx = afterFence.indexOf("\n");
      const bodyStart = nlIdx !== -1 ? afterFence.slice(nlIdx + 1) : afterFence;
      const fenceEnd = bodyStart.lastIndexOf("```");
      jsonStr = fenceEnd !== -1 ? bodyStart.slice(0, fenceEnd) : bodyStart;
    }

    let json: SubtitleJSON;
    try {
      json = JSON.parse(jsonStr) as SubtitleJSON;
    } catch (e) {
      console.warn("[ai-subtitle] JSON.parse failed, attempting salvage:", e instanceof Error ? e.message : e);
      const salvaged = salvageSubtitleJSON(jsonStr);
      if (salvaged) {
        console.warn("[ai-subtitle] salvaged", salvaged.e.length, "entries from truncated/malformed JSON");
        return salvaged;
      }
      console.warn("[ai-subtitle] salvage failed, raw response length:", raw.length);
      return null;
    }

    if (!json.f || !Array.isArray(json.e)) {
      console.warn("[ai-subtitle] JSON parse: missing f or e fields");
      return null;
    }
    if (json.f !== "srt" && json.f !== "ass") {
      console.warn("[ai-subtitle] JSON parse: invalid format", json.f);
      return null;
    }

    for (const x of json.e) {
      if (typeof x.i !== "number") { console.warn("[ai-subtitle] JSON parse: entry has invalid i (expected number)"); return null; }
      if (typeof x.s !== "string") { console.warn("[ai-subtitle] JSON parse: entry has invalid s (expected string)"); return null; }
      if (x.t !== null && typeof x.t !== "string") { console.warn("[ai-subtitle] JSON parse: entry has invalid t"); return null; }
      if (typeof x.sh !== "boolean") { console.warn("[ai-subtitle] JSON parse: entry has invalid sh (expected boolean)"); return null; }
      if (x.st !== undefined && !["i", "b", "u"].includes(x.st)) { console.warn("[ai-subtitle] JSON parse: entry has invalid st:", x.st); return null; }
    }

    return json;
  } catch (e) {
    console.warn("[ai-subtitle] JSON parse failed:", e instanceof Error ? e.message : e);
    console.warn("[ai-subtitle] raw response length:", raw.length);
    return null;
  }
}

/**
 * Recover as many complete entry objects as possible from a truncated or
 * malformed JSON response. The AI occasionally hits the output token limit,
 * leaving the trailing entries (and closing brackets) cut off. Rather than
 * discarding the whole response, we scan the `e` array and JSON.parse each
 * complete `{...}` object individually.
 */
function salvageSubtitleJSON(jsonStr: string): SubtitleJSON | null {
  const fMatch = jsonStr.match(/"f"\s*:\s*"(srt|ass)"/);
  const format: SubtitleJSON["f"] = fMatch?.[1] === "ass" ? "ass" : "srt";

  const eKey = jsonStr.search(/"e"\s*:\s*\[/);
  if (eKey === -1) return null;
  const arrStart = jsonStr.indexOf("[", eKey);
  if (arrStart === -1) return null;

  const entries: SubtitleJSONEntry[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = arrStart + 1; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(jsonStr.slice(objStart, i + 1)) as SubtitleJSONEntry;
          if (
            typeof obj.i === "number" &&
            typeof obj.s === "string" &&
            (obj.t === null || obj.t === undefined || typeof obj.t === "string") &&
            (obj.st === undefined || ["i", "b", "u"].includes(obj.st))
          ) {
            entries.push({ ...obj, sh: obj.sh !== false });
          }
        } catch {
          // skip incomplete/invalid object
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }

  if (entries.length === 0) return null;
  return { f: format, e: entries };
}

// ─── AI invocation & main processing ────────────────────────────────────────

const CHUNK_SIZE = 200;

export async function processSubtitleWithAI(
  content: string,
  format: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await invoke<string>("call_deepseek_api", {
    content,
    format,
    apiKey,
    model,
  });
  console.debug("[ai-subtitle] AI response length:", response.length);
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

  // Extract entries (timestamps preserved in memory)
  const entries = preprocessSubtitleEntries(content);
  if (entries.length === 0) {
    throw new Error("No subtitle entries found in the file");
  }

  console.debug("[ai-subtitle] extracted", entries.length, "entries");

  // Build full input for hash (dedup uses full content)
  const fullAiInput = buildEntriesForAI(entries);
  const hash = await hashContent(fullAiInput);
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

  // Detect format from content for the AI hint
  const lower = content.trim().toLowerCase();
  const detectedFormat = lower.startsWith("[script info]") || lower.startsWith("[v4") || /^Dialogue:/m.test(content)
    ? "ass"
    : "srt";

  const aiStart = performance.now();
  const captions = entries.length <= CHUNK_SIZE
    ? await processOneChunk(entries, detectedFormat, apiKey, model)
    : await processChunks(entries, detectedFormat, apiKey, model);
  console.debug("[ai-subtitle] total AI processing time:", (performance.now() - aiStart).toFixed(0), "ms, result:", captions.length, "captions");

  await setCachedSubtitle(hash, videoFileName, captions, subtitlePath);
  return captions;
}

async function processOneChunk(
  entries: SubtitleInputEntry[],
  format: string,
  apiKey: string,
  model: string,
): Promise<Caption[]> {
  const start = performance.now();
  const aiInput = buildEntriesForAI(entries);
  const rawResponse = await processSubtitleWithAI(aiInput, format, apiKey, model);
  const captions = parseAIResponse(rawResponse, entries);
  console.debug("[ai-subtitle] processed", entries.length, "entries in", (performance.now() - start).toFixed(0), "ms");
  return captions;
}

async function processChunks(
  entries: SubtitleInputEntry[],
  format: string,
  apiKey: string,
  model: string,
): Promise<Caption[]> {
  const chunks: SubtitleInputEntry[][] = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + CHUNK_SIZE));
  }

  console.debug("[ai-subtitle] processing", chunks.length, "chunks in parallel (up to", CHUNK_SIZE, "entries each)");

  const chunkStart = performance.now();
  const results = await Promise.all(
    chunks.map((chunk) =>
      processSubtitleWithAI(buildEntriesForAI(chunk), format, apiKey, model)
        .then((raw) => parseAIResponse(raw, chunk)),
    ),
  );
  console.debug("[ai-subtitle] all", chunks.length, "chunks completed in", (performance.now() - chunkStart).toFixed(0), "ms");

  const allCaptions = results.flat();
  allCaptions.sort((a, b) => a.start - b.start);
  return allCaptions;
}

function parseAIResponse(rawResponse: string, entries: SubtitleInputEntry[]): Caption[] {
  // Try JSON parsing first
  const json = tryParseJSONResponse(rawResponse);
  if (json) {
    console.debug("[ai-subtitle] JSON parsed successfully, format:", json.f, "showable entries:", json.e.filter((e) => e.sh).length);
    const captions = parseSubtitleJSON(json, entries);

    if (captions.length === 0) {
      throw new Error("AI returned no showable entries");
    }

    return captions;
  }

  // Fallback: parse as legacy text format
  console.debug("[ai-subtitle] JSON parse failed, falling back to legacy text parsing");
  const captions = parseSubtitles(rawResponse);
  if (captions.length === 0) {
    const preview =
      rawResponse.length > 200
        ? rawResponse.slice(0, 200) + "..."
        : rawResponse;
    throw new Error(
      `AI-processed subtitles could not be parsed. Response preview: "${preview}"`,
    );
  }

  return captions;
}

// Re-export preprocessSrtContent as a backward-compat alias for existing callers
export function preprocessSrtContent(content: string): string {
  const entries = preprocessSubtitleEntries(content);
  return entries
    .map((entry) => `${entry.index}\n${entry.timestamp}\n${entry.text}`)
    .join("\n\n");
}
