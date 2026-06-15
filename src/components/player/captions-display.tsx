import { memo } from "react";
import { Loader2 } from "lucide-react";
import { type Caption } from "@/lib/subtitles";
import { type BlurMode } from "@/stores/player-store";
import ShinyText from "@/components/ShinyText";
import { useTranslation } from "react-i18next";

interface CaptionsDisplayProps {
  activeCaptionData: Caption | null;
  activeDisplay: { primary: string; secondary: string } | null;
  currentVideoTime: number;
  captions: Caption[];
  isAiProcessing: boolean;
  blurMode: BlurMode;
}

export const CaptionsDisplay = memo(function CaptionsDisplay({
  activeCaptionData,
  activeDisplay,
  currentVideoTime,
  captions,
  isAiProcessing,
  blurMode,
}: CaptionsDisplayProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex w-full flex-col items-center justify-center py-5 text-center min-h-36">
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
        currentVideoTime >= activeCaptionData.start &&
        currentVideoTime < activeCaptionData.end + 0.001 &&
        activeDisplay && (
          <>
            <p
              className={`text-2xl font-semibold leading-[1.4] text-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                blurMode === "primary" || blurMode === "all"
                  ? "blur group-hover:blur-none"
                  : ""
              }`}
              dangerouslySetInnerHTML={{
                __html: activeDisplay.primary,
              }}
            />
            {activeDisplay.secondary && (
              <p
                className={`mt-5 text-2xl leading-[1.4] text-muted-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                  blurMode === "secondary" || blurMode === "all"
                    ? "blur group-hover:blur-none"
                    : ""
                }`}
                dangerouslySetInnerHTML={{
                  __html: activeDisplay.secondary,
                }}
              />
            )}
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
