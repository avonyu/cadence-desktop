import { invoke } from "@tauri-apps/api/core";
import { usePlayerStore } from "@/stores/player-store";
import { loadCache, saveToCache } from "./word-cache-db";

const wordCache = new Map<string, WordDefinition>();

loadCache().then((entries) => {
  for (const [key, value] of entries) {
    wordCache.set(key, value as WordDefinition);
  }
});

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

export async function lookupWord(word: string): Promise<WordDefinition | null> {
  const clean = word.trim().toLowerCase();
  if (!clean || clean.length < 2) return null;
  if (!/^[a-z'\-]+$/i.test(clean)) return null;

  const apiKey = usePlayerStore.getState().deepseekApiKey;
  const model = usePlayerStore.getState().deepseekModel || "deepseek-v4-flash";

  if (!apiKey) return null;

  const cached = wordCache.get(clean);
  if (cached) return cached;

  try {
    const text: string = await invoke("call_deepseek_dictionary", {
      word,
      apiKey,
      model,
    });

    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as WordDefinition;
    wordCache.set(clean, parsed);
    saveToCache(clean, parsed);
    return parsed;
  } catch {
    return null;
  }
}
