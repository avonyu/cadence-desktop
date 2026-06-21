import { memo } from "react";
import { Loader2 } from "lucide-react";
import { type Caption } from "@/lib/subtitles";
import { type BlurMode } from "@/stores/player-store";
import ShinyText from "@/components/ShinyText";
import { useTranslation } from "react-i18next";
import { sanitizeSubtitleHtml } from "@/lib/html-sanitize";
import { wrapSubtitleWords } from "@/lib/wrap-subtitle-words";

interface CaptionsDisplayProps {
  activeCaptionData: Caption | null;
  activeDisplay: { primary: string; secondary: string } | null;
  captions: Caption[];
  isAiProcessing: boolean;
  blurMode: BlurMode;
  onWordClick?: (e: React.MouseEvent) => void;
  onMouseOver?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
}

export const CaptionsDisplay = memo(function CaptionsDisplay({
  activeCaptionData,
  activeDisplay,
  captions,
  isAiProcessing,
  blurMode,
  onWordClick,
  onMouseOver,
  onMouseOut,
}: CaptionsDisplayProps) {
  const { t } = useTranslation();

  return (
    <div
      className="group flex h-44 w-full shrink-0 flex-col items-center justify-center overflow-hidden py-5 text-center"
      onClick={onWordClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {isAiProcessing ? (
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin text-(--player-accent)" />
          <ShinyText
            text={t("ai.processing")}
            speed={2}
            shineColor="var(--player-accent)"
            className="text-lg"
          />
        </div>
      ) : captions.length > 0 ? (
        activeCaptionData &&
        activeDisplay && (
          <>
            <p
              className={`text-2xl font-semibold leading-[1.4] text-foreground max-w-5xl transition-[filter] duration-300 select-none ${
                blurMode === "primary" || blurMode === "all"
                  ? "blur group-hover:blur-none"
                  : ""
              }`}
              dangerouslySetInnerHTML={{
                __html: wrapSubtitleWords(
                  sanitizeSubtitleHtml(activeDisplay.primary),
                ),
              }}
            />
            <p
              className={`mt-5 text-2xl leading-[1.4] text-muted-foreground max-w-5xl transition-[filter] duration-300 select-none ${
                blurMode === "secondary" || blurMode === "all"
                  ? "blur group-hover:blur-none"
                  : ""
              }`}
              dangerouslySetInnerHTML={{
                __html: wrapSubtitleWords(
                  sanitizeSubtitleHtml(activeDisplay.secondary),
                ),
              }}
            />
          </>
        )
      ) : (
        <p className="text-lg text-muted-foreground">
          {t("subtitle.noSubtitles")}
        </p>
      )}
    </div>
  );
});
