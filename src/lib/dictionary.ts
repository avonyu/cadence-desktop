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

const WORD_PROMPT = `You are a precise English dictionary. Given an English word, return a JSON object with its definition.

Response format (strict JSON, no markdown, no extra text):
{
  "word": "string",
  "phonetic": "string (optional, IPA notation)",
  "meanings": [
    {
      "partOfSpeech": "string (e.g. noun, verb, adjective)",
      "definitions": [
        {
          "definition": "string (Chinese explanation)",
          "example": "string (optional example sentence)"
        }
      ]
    }
  ]
}

Rules:
- Provide the phonetic in IPA notation when possible.
- Definitions MUST be in Chinese (Simplified).
- Include 1-3 most common meanings.
- Include 1-2 example sentences per meaning when helpful.
- Only return the JSON object, no other text.`;

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
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: WORD_PROMPT },
          { role: "user", content: `Define: ${clean}` },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
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
