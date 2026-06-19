import { useRef, useLayoutEffect, useState, useEffect, useCallback } from "react";
import { Loader2, X, Volume2 } from "lucide-react";
import type { WordDefinition } from "@/lib/dictionary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
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
}

export function WordTranslatePopover({
  word,
  definition,
  loading,
  open,
  anchorEl,
  onOpenChange,
  onClose,
}: WordTranslatePopoverProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pronouncing, setPronouncing] = useState(false);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  const handlePronounce = useCallback(async () => {
    if (!word || pronouncing) return;
    setPronouncing(true);
    cleanupAudio();
    try {
      const base64 = await invoke<string>("synthesize_edge_tts", {
        text: word,
      });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPronouncing(false);
      };
      audio.onerror = () => {
        setPronouncing(false);
      };
      await audio.play();
    } catch {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.onend = () => setPronouncing(false);
      utterance.onerror = () => setPronouncing(false);
      speechSynthesis.speak(utterance);
    }
  }, [word, pronouncing, cleanupAudio]);

  // Close immediately when the anchor word leaves the DOM on any re-render
  // (e.g. navigating to the next caption replaces the subtitle text).
  useLayoutEffect(() => {
    if (open && anchorEl && !anchorEl.isConnected) {
      onClose();
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
        className="max-w-sm rounded-lg p-0 gap-0"
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
            <span className="text-sm font-semibold text-(--player-accent) truncate">
              {word}
            </span>
            {definition?.phonetic && (
              <span className="text-xs text-muted-foreground shrink-0">
                {definition.phonetic}
              </span>
            )}
            {word && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
                onClick={handlePronounce}
                disabled={pronouncing}
                title="Pronounce"
              >
                {pronouncing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Volume2 size={14} />
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <ScrollArea className="max-h-64 **:data-[slot=scroll-area-viewport]:max-h-64">
          <div className="px-3 py-2 text-sm">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span>{t("wordTranslate.lookingUp")}</span>
              </div>
            )}

            {!loading && !definition && word && (
              <p className="py-2 text-muted-foreground text-xs">
                No definition found for "
                <span className="font-medium text-foreground">{word}</span>"
              </p>
            )}

            {definition?.meanings.map((meaning, i) => (
              <div key={i} className={i > 0 ? "mt-2" : ""}>
                <span className="text-xs font-medium text-(--player-accent) italic">
                  {meaning.partOfSpeech}
                </span>
                <ol className="mt-1 list-decimal list-inside space-y-0.5">
                  {meaning.definitions.map((d, j) => (
                    <li key={j} className="text-xs leading-relaxed">
                      <span>{d.definition}</span>
                      {d.example && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 ml-4 italic">
                          "{d.example}"
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
