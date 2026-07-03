import { invoke } from "@tauri-apps/api/core";
import { usePlayerStore } from "@/stores/player-store";
import {
  getCachedExplanation,
  setCachedExplanation,
} from "./sentence-explanation-cache";

export interface GrammarPoint {
  pattern: string;
  explanation: string;
}

export interface KeyVocabulary {
  word: string;
  meaning: string;
  note?: string;
}

export interface SentenceExplanation {
  overallMeaning: string;
  grammarPoints: GrammarPoint[];
  keyVocabulary: KeyVocabulary[];
}

function buildCacheKey(sentence: string, videoName: string): string {
  const normalized = sentence.trim().toLowerCase();
  return `${videoName}::${normalized}`;
}

export async function explainSentence(
  sentence: string,
  translation: string,
  videoName: string,
): Promise<SentenceExplanation | null> {
  const clean = sentence.trim();
  if (!clean) return null;

  const apiKey = usePlayerStore.getState().deepseekApiKey;
  const model = usePlayerStore.getState().deepseekModel || "deepseek-v4-flash";
  const nativeLanguage = usePlayerStore.getState().nativeLanguage;
  const learningLanguage = usePlayerStore.getState().learningLanguage;

  if (!apiKey) return null;

  const cacheKey = buildCacheKey(clean, videoName);

  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as SentenceExplanation;
    } catch {
      // corrupted cache, proceed to fetch
    }
  }

  try {
    const text: string = await invoke("call_deepseek_explain_sentence", {
      sentence: clean,
      translation: translation.trim(),
      learningLanguage,
      nativeLanguage,
      apiKey,
      model,
    });

    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as SentenceExplanation;

    await setCachedExplanation(cacheKey, JSON.stringify(parsed));

    return parsed;
  } catch (e) {
    console.warn(
      "[sentence-explanation] explainSentence failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
