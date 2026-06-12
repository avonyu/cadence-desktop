import { Minus, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type VideoCodecResult, isAudioCodecUnsupported } from "@/lib/player-constants";
import { useTranslation } from "react-i18next";

interface CodecInfoBarProps {
  codecInfo: VideoCodecResult | null;
  transcodeState: "idle" | "converting" | "done" | "error";
  transcodeProgress: number;
  transcodeDismissed: boolean;
  setTranscodeDismissed: (dismissed: boolean) => void;
  onTranscodeAudio: () => void;
}

export function CodecInfoBar({
  codecInfo,
  transcodeState,
  transcodeProgress,
  transcodeDismissed,
  setTranscodeDismissed,
  onTranscodeAudio,
}: CodecInfoBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end items-center gap-2 px-4 py-1">
      {codecInfo && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
          {codecInfo.video && (
            <span>{codecInfo.video.codec_name.toUpperCase()}</span>
          )}
          {codecInfo.video && codecInfo.audio && (
            <span className="text-border">/</span>
          )}
          {codecInfo.audio && (
            <span
              className={
                isAudioCodecUnsupported(codecInfo.audio.codec_name)
                  ? "text-destructive"
                  : ""
              }
            >
              {codecInfo.audio.codec_name.toUpperCase()}
            </span>
          )}
        </span>
      )}
      {codecInfo?.audio &&
        isAudioCodecUnsupported(codecInfo.audio.codec_name) &&
        !transcodeDismissed && (
          <span className="relative inline-flex items-center">
            {transcodeState !== "converting" && (
              <button
                type="button"
                className="absolute -top-1.5 -right-1.5 z-10 flex size-3.5 items-center justify-center rounded-full bg-red-400 text-white hover:bg-red-500"
                onClick={() => setTranscodeDismissed(true)}
              >
                <Minus size={10} strokeWidth={3} />
              </button>
            )}
            <ShadcnTooltipProvider>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    disabled={transcodeState === "converting"}
                    onClick={onTranscodeAudio}
                  >
                    {transcodeState !== "converting" && (
                      <AudioLines size={12} />
                    )}
                    {transcodeState === "converting"
                      ? `${t("video.transcoding")} ${transcodeProgress}%`
                      : transcodeState === "done"
                        ? t("video.transcodeDone")
                        : t("video.transcode")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("video.transcodeTooltip")}
                </TooltipContent>
              </ShadcnTooltip>
            </ShadcnTooltipProvider>
          </span>
        )}
    </div>
  );
}
