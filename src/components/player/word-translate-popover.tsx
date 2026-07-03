import { useRef, useLayoutEffect, useEffect } from "react";
import { Loader2, Volume2, Heart } from "lucide-react";
import type { WordDefinition } from "@/lib/dictionary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useWordPronounce } from "@/hooks/use-word-pronounce";
import { useFavoritesStore } from "@/stores/favorites-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WordTranslatePopoverProps {
  word: string | null;
  definition: WordDefinition | null;
  loading: boolean;
  open: boolean;
  anchorEl: HTMLElement | null;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  tryRecoverAnchor: () => boolean;
}

export function WordTranslatePopover({
  word,
  definition,
  loading,
  open,
  anchorEl,
  onOpenChange,
  onClose,
  tryRecoverAnchor,
}: WordTranslatePopoverProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const { pronounce, pronouncingWord } = useWordPronounce();
  const pronouncing = word ? pronouncingWord === word : false;

  const favorited = useFavoritesStore((s) =>
    word ? s.isFavorited(word) : false,
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFavorites();
  }, [hydrateFavorites]);

  useEffect(() => {
    if (open && word) {
      pronounce(word);
    }
  }, [open, word]);

  // Close immediately when the anchor word leaves the DOM on any re-render
  // (e.g. navigating to the next caption replaces the subtitle text).
  useLayoutEffect(() => {
    if (open && anchorEl && !anchorEl.isConnected) {
      // Anchor may have been replaced by React (e.g. favorite toggle
      // re-renders captions). Try to recover before closing.
      if (!tryRecoverAnchor()) {
        onClose();
      }
    }
  });

  useLayoutEffect(() => {
    if (!open || !anchorEl || !triggerRef.current) return;

    const sync = () => {
      // Close the popover when the anchor word is removed from the DOM
      // (e.g. navigating to the next caption, which replaces subtitle text).
      if (!anchorEl.isConnected) {
        onClose();
        return;
      }
      const rect = anchorEl.getBoundingClientRect();
      const el = triggerRef.current;
      if (!el) return;
      el.style.position = "fixed";
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.pointerEvents = "none";
    };

    sync();

    // Re-sync on scroll/resize since the anchorEl may move
    const handleScroll = () => sync();
    const handleResize = () => sync();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, anchorEl, onClose]);

  if (!open) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span ref={triggerRef} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="min-w-[22rem] max-w-md rounded-lg p-0 gap-0"
        onPointerDownOutside={(e) => {
          // Don't close when clicking a subtitle word — the click handler
          // manages toggle (same word → close, different word → switch).
          const target = e.target as HTMLElement;
          if (target.closest(".sub-word")) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-(--player-accent) truncate">
              {word}
            </span>
            {definition?.conjugations?.baseForm &&
              definition.conjugations.baseForm !== word && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                   <span className="text-base font-semibold text-muted-foreground shrink-0">
                    {definition.conjugations.baseForm}
                  </span>
                </>
              )}
            {definition?.phonetic && (
              <span className="text-sm text-muted-foreground shrink-0">
                {definition.phonetic}
              </span>
            )}
            {word && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
                onClick={() => word && pronounce(word)}
                disabled={pronouncing}
                title="Pronounce"
              >
                {pronouncing ? (
                  <Loader2 className="size-[0.875rem] animate-spin" />
                ) : (
                  <Volume2 className="size-[0.875rem]" />
                )}
              </button>
            )}
          </div>
          {word && definition && (
            <button
              type="button"
              className={`shrink-0 transition-colors ${
                favorited
                  ? "text-(--player-accent)"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => toggleFavorite(word, definition)}
              title={
                favorited
                  ? t("wordTranslate.unfavorite")
                  : t("wordTranslate.favorite")
              }
            >
              <Heart
                className={`size-[1rem] ${favorited ? "fill-current" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="max-h-64 **:data-[slot=scroll-area-viewport]:max-h-64">
          <div className="px-3 py-2 text-base">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span>{t("wordTranslate.lookingUp")}</span>
              </div>
            )}

            {!loading && !definition && word && (
              <p className="py-2 text-muted-foreground text-sm">
                No definition found for "
                <span className="font-medium text-foreground">{word}</span>"
              </p>
            )}

            {definition?.meanings.map((meaning, i) => (
              <div key={i} className={i > 0 ? "mt-2" : ""}>
                <span className="text-sm font-medium text-(--player-accent) italic">
                  {meaning.partOfSpeech}
                </span>
                <ol className="mt-1 list-decimal list-inside space-y-0.5">
                  {meaning.definitions.map((d, j) => (
                    <li key={j} className="text-sm leading-relaxed">
                      <span>{d.definition}</span>
                      {d.example && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-4 italic">
                          "{d.example}"
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {definition?.conjugations && (
              <div className="mt-3 pt-2 border-t border-border flex flex-wrap gap-1.5">
                {definition.conjugations.presentThirdPerson && (
                  <Badge variant="outline">
                    {definition.conjugations.presentThirdPerson}
                  </Badge>
                )}
                {definition.conjugations.presentParticiple && (
                  <Badge variant="outline">
                    {definition.conjugations.presentParticiple}
                  </Badge>
                )}
                {definition.conjugations.pastTense && (
                  <Badge variant="outline">
                    {definition.conjugations.pastTense}
                  </Badge>
                )}
                {definition.conjugations.pastParticiple && (
                  <Badge variant="outline">
                    {definition.conjugations.pastParticiple}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
