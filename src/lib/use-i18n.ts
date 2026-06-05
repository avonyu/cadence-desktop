import i18n from "@/lib/i18n";
import type { I18nKey } from "@/lib/i18n";
import { usePlayerStore, type Locale } from "@/stores/player-store";

export function t(key: I18nKey, locale: Locale): string {
  return i18n[locale][key] ?? key;
}

export function useT() {
  const locale = usePlayerStore((s) => s.locale);
  return (key: I18nKey): string => i18n[locale][key] ?? key;
}