/**
 * Lightweight heuristic language detection for subtitle text.
 * Distinguishes Chinese (CJK) from English (Latin).
 */

export type DetectedLang = "zh" | "en" | "unknown";

export function detectTextLanguage(text: string): DetectedLang {
  if (!text) return "unknown";

  const cjk = (
    text.match(
      /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g,
    ) || []
  ).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;

  if (cjk === 0 && latin === 0) return "unknown";
  if (cjk > latin) return "zh";
  return "en";
}
