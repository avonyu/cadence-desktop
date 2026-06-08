import { type Caption, parseSubtitles } from "./subtitles";
import OpenAI from "openai";

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

const SYSTEM_PROMPT = `You are a subtitle processor. Your task is to clean and enhance subtitle files.

Rules:
1. Keep ALL original timestamps and numbering exactly as-is. Do not modify, shift, or remove any timing information.
2. Only keep dialogue-related lines (including song lyrics). Remove credits, scene descriptions, translator names, and any non-dialogue text.
3. Remove all style and control information enclosed in curly braces {}.
4. For bilingual subtitles (containing both Chinese and English), preserve the \\N line breaks that separate the two languages.
5. For single-language subtitles:
   - If the subtitle is only in Chinese, translate each line to English and append it after the original text separated by \\N.
   - If the subtitle is only in English, translate each line to Chinese and prepend it before the original text separated by \\N.
6. Output the result in the SAME format as the input (SRT stays SRT, ASS stays ASS). Do not change formats.
7. Return ONLY the processed subtitle content. Do NOT wrap the output in markdown code fences, do NOT add any explanation, do NOT add any commentary — just the raw subtitle text.`;

export async function processSubtitleWithAI(
  content: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    temperature: 0.1,
    // DeepSeek-specific: enable reasoning with thinking
    ...({ thinking: { type: "enabled" }, reasoning_effort: "high" } as Record<
      string,
      unknown
    >),
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("DeepSeek API returned an empty response");
  }

  // Strip markdown code fences if the model wraps the output
  const stripped = text
    .replace(/^```(?:srt|ass|ssa)?\n?/im, "")
    .replace(/\n?```$/m, "")
    .trim();

  return stripped;
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
