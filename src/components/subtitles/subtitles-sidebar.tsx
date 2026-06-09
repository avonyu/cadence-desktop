import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Subtitles, X, Loader2 } from "lucide-react";
import { type Caption } from "@/lib/subtitles";
import { usePlayerStore, type BlurMode } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { useRef, useEffect } from "react";
import ShinyText from "@/components/ShinyText";

interface SubtitlesSidebarProps {
  captions: Caption[];
  onSeekToCaption: (caption: Caption) => void;
  onClose: () => void;
}

function getSidebarBlurClasses(
  blurMode: BlurMode,
  target: "text" | "translation",
): string {
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

export function SubtitlesSidebar({
  captions,
  onSeekToCaption,
  onClose,
}: SubtitlesSidebarProps) {
  const { t } = useTranslation();
  const blurMode = usePlayerStore((s) => s.blurMode);
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
  const isAiProcessing =
    aiProcessing === "processing" || aiProcessing === "loading";

  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeItemRef.current && sidebarRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeCaption]);

  const getDisplayText = (caption: Caption) => {
    if (swapSubtitles) {
      return { primary: caption.translation || "", secondary: caption.text };
    }
    return { primary: caption.text, secondary: caption.translation || "" };
  };

  return (
    <aside className="relative flex min-h-0 flex-col bg-popover">
      {/* AI Processing overlay */}
      {isAiProcessing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-(--player-accent)" />
            <ShinyText
              text={t("ai.processing")}
              speed={2}
              shineColor="var(--player-accent)"
              className="text-sm font-medium"
            />
          </div>
        </div>
      )}

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Subtitles size={20} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            {t("subtitle.subtitlesList")}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4" ref={sidebarRef}>
          {captions.length > 0 ? (
            <div className="space-y-2">
              {captions.map((caption, index) => {
                const isActive = index === activeCaption;
                const ref = isActive ? activeItemRef : null;
                const { primary, secondary } = getDisplayText(caption);

                return (
                  <button
                    ref={ref}
                    className={`group/item grid w-full grid-cols-[62px_1fr] gap-1 rounded-md px-2 py-2 text-left transition ${
                      isActive
                        ? "bg-accent text-[var(--player-accent)]"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    key={`${caption.start}-${caption.text}`}
                    onClick={() => onSeekToCaption(caption)}
                  >
                    <span
                      className={`text-sm font-bold text-center transition cursor-pointer hover:text-[var(--player-accent)] ${
                        isActive
                          ? "text-[var(--player-accent)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatCaptionTime(caption.start)}
                    </span>
                    <span>
                      <span
                        className={`block text-sm font-bold leading-snug tracking-tight transition-[filter] duration-300 ${
                          getSidebarBlurClasses(blurMode, "text") || ""
                        } group-hover/item:blur-none`}
                      >
                        {primary}
                      </span>
                      <span
                        className={`mt-2 block text-sm leading-snug tracking-tight transition-[filter] duration-300 ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        } ${
                          getSidebarBlurClasses(blurMode, "translation") || ""
                        } group-hover/item:blur-none`}
                      >
                        {secondary}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("subtitle.noSubtitles")}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
