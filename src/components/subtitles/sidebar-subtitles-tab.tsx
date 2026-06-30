import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { type Caption } from "@/lib/subtitles";
import { sanitizeSubtitleHtml } from "@/lib/html-sanitize";
import { usePlayerStore, type BlurMode } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useCallback, memo } from "react";
import { AnimatePresence, motion } from "motion/react";

interface SidebarSubtitlesTabProps {
  captions: Caption[];
  onSeekToCaption: (caption: Caption) => void;
}

function getSidebarBlurClasses(blurMode: BlurMode, target: "text" | "translation"): string {
  if (blurMode === "off") return "";
  if (blurMode === "primary" && target === "text") return "blur-sm";
  if (blurMode === "secondary" && target === "translation") return "blur-sm";
  if (blurMode === "all") return "blur-sm";
  return "";
}

function formatCaptionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const SidebarSubtitlesTab = memo(function SidebarSubtitlesTab({
  captions,
  onSeekToCaption,
}: SidebarSubtitlesTabProps) {
  const { t } = useTranslation();
  const blurMode = usePlayerStore((s) => s.blurMode);
  const lastActiveCaption = usePlayerStore((s) => s.lastActiveCaption);
  const scrollTracking = usePlayerStore((s) => s.scrollTracking);
  const setScrollTracking = usePlayerStore((s) => s.setScrollTracking);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setPendingNavigation = usePlayerStore((s) => s.setPendingNavigation);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const getViewport = useCallback(() => {
    return sidebarRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
  }, []);

  // Detect user scroll (mouse wheel / trackpad) to cancel auto-follow.
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    const handleUserScroll = () => {
      if (isProgrammaticScroll.current) return;
      setScrollTracking(false);
    };

    viewport.addEventListener("scroll", handleUserScroll);
    viewport.addEventListener("wheel", handleUserScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", handleUserScroll);
      viewport.removeEventListener("wheel", handleUserScroll);
    };
  }, [getViewport, setScrollTracking]);

  useEffect(() => {
    if (!scrollTracking) return;
    const viewport = getViewport();
    if (!viewport) return;

    let cleanup: (() => void) | undefined;

    const raf = requestAnimationFrame(() => {
      if (!activeItemRef.current) return;

      isProgrammaticScroll.current = true;

      const containerRect = viewport.getBoundingClientRect();
      const itemRect = activeItemRef.current.getBoundingClientRect();
      const offset = itemRect.top - containerRect.top - containerRect.height * 0.25;

      viewport.scrollTo({
        top: viewport.scrollTop + offset,
        behavior: "smooth",
      });

      // Reset the programmatic-scroll flag when scrolling finishes.
      const resetFlag = () => {
        isProgrammaticScroll.current = false;
      };

      if ("onscrollend" in viewport) {
        viewport.addEventListener("scrollend", resetFlag, { once: true });
        cleanup = () => {
          viewport.removeEventListener("scrollend", resetFlag);
        };
      } else {
        const timer = setTimeout(resetFlag, 500);
        cleanup = () => {
          clearTimeout(timer);
        };
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [lastActiveCaption, scrollTracking, getViewport]);

  const handleCaptionClick = useCallback(
    (caption: Caption, index: number) => {
      setPendingNavigation(true);
      setScrollTracking(true);
      setActiveCaption(index);
      setLastActiveCaption(index);
      onSeekToCaption(caption);
    },
    [onSeekToCaption, setActiveCaption, setLastActiveCaption, setPendingNavigation, setScrollTracking],
  );

  const getDisplayText = (caption: Caption) => {
    if (swapSubtitles) {
      return { primary: caption.translation || "", secondary: caption.text };
    }
    return { primary: caption.text, secondary: caption.translation || "" };
  };

  return (
    <div className="relative flex min-h-0 h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4" ref={sidebarRef}>
          {captions.length > 0 ? (
            <div className="space-y-2">
              {captions.map((caption, index) => {
                const isActive = index === lastActiveCaption;
                const ref = isActive ? activeItemRef : null;
                const { primary, secondary } = getDisplayText(caption);

                return (
                  <div
                    ref={ref}
                    className={`group/item grid w-full grid-cols-[62px_1fr] items-start gap-1 rounded-md px-2 py-2 text-left transition ${
                      isActive
                        ? "bg-accent text-(--player-accent)"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    key={`${caption.start}-${caption.text}`}
                  >
                    <button
                      onClick={() => handleCaptionClick(caption, index)}
                      className={`text-sm font-bold text-center transition cursor-pointer hover:text-(--player-accent) ${
                        isActive ? "text-(--player-accent)" : "text-muted-foreground"
                      }`}
                    >
                      {formatCaptionTime(caption.start)}
                    </button>
                    <span>
                      <span
                        className={`block text-sm font-bold leading-snug tracking-tight transition-[filter] duration-300 ${
                          getSidebarBlurClasses(blurMode, "text") || ""
                        } group-hover/item:blur-none`}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeSubtitleHtml(primary),
                        }}
                      />
                      <span
                        className={`mt-2 block text-sm leading-snug tracking-tight transition-[filter] duration-300 ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        } ${getSidebarBlurClasses(blurMode, "translation") || ""} group-hover/item:blur-none`}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeSubtitleHtml(secondary),
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("subtitle.noSubtitles")}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <AnimatePresence>
        {!scrollTracking && captions.length > 0 && lastActiveCaption !== null && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-4 right-4 z-10"
          >
            <Button
              size="icon"
              className="size-10 rounded-full shadow-lg bg-(--player-accent)! text-white! hover:bg-(--player-accent-hover)!"
              onClick={() => {
                isProgrammaticScroll.current = true;
                setScrollTracking(true);
              }}
            >
              <RotateCw size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
