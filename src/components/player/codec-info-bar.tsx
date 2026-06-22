import { memo } from "react";
import { AlertTriangle, AudioLines, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type VideoCodecResult, isAudioCodecUnsupported } from "@/lib/player-constants";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CodecInfoBarProps {
  codecInfo: VideoCodecResult | null;
  transcodeState: "idle" | "converting" | "done" | "error";
  transcodeProgress: number;
  isTranscoded: boolean;
  onTranscodeAudio: () => void;
  onCancelTranscode: () => void;
}

export const CodecInfoBar = memo(function CodecInfoBar({
  codecInfo,
  transcodeState,
  transcodeProgress,
  isTranscoded,
  onTranscodeAudio,
  onCancelTranscode,
}: CodecInfoBarProps) {
  const { t } = useTranslation();

  const unsupported = codecInfo?.audio
    ? isAudioCodecUnsupported(codecInfo.audio.codec_name)
    : false;

  if (!codecInfo) return null;

  return (
    <div className="flex justify-end items-center gap-2 px-1 py-1 pointer-events-auto">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t("video.codecInfo")}
          >
            <Badge
              variant="secondary"
              className={cn(
                "font-mono rounded-md hover:bg-secondary/80 transition-colors"
              )}
            >
              {codecInfo.video && (
                <span>{codecInfo.video.codec_name.toUpperCase()}</span>
              )}
              {codecInfo.video && codecInfo.audio && (
                <span>/</span>
              )}
              {codecInfo.audio && (
                <span
                  className={cn(
                    unsupported && "text-destructive",
                    "inline-flex items-center gap-0.5"
                  )}
                >
                  {transcodeState === "converting" ? (
                    <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                  ) : unsupported ? (
                    <AlertTriangle size={10} aria-hidden="true" />
                  ) : null}
                  {codecInfo.audio.codec_name.toUpperCase()}
                </span>
              )}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-64 p-3"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              {codecInfo.video && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">Video</span>
                  <span className="font-mono font-medium truncate">
                    {codecInfo.video.codec_long_name}
                  </span>
                </div>
              )}
              {codecInfo.audio && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0">Audio</span>
                  <span
                    className={cn(
                      "font-mono font-medium inline-flex items-center gap-1 truncate",
                      unsupported && "text-destructive"
                    )}
                  >
                    {unsupported && (
                      <AlertTriangle size={10} aria-hidden="true" className="shrink-0" />
                    )}
                    <span className="truncate">{codecInfo.audio.codec_long_name}</span>
                  </span>
                </div>
              )}
            </div>

            {unsupported && (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("video.codecWarning", {
                    codec: codecInfo.audio!.codec_name.toUpperCase(),
                  })}
                </p>

                <div className="flex items-center gap-2">
                  {transcodeState === "converting" ? (
                    <>
                      <div className="flex-1 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-(--player-accent)" />
                        <span className="text-xs text-muted-foreground">
                          {t("video.transcoding")} {transcodeProgress}%
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onCancelTranscode}
                        aria-label={t("video.transcodeCancel")}
                      >
                        <X size={14} />
                      </Button>
                    </>
                  ) : transcodeState === "done" || (transcodeState === "idle" && isTranscoded) ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs gap-1.5"
                      disabled
                    >
                      <AudioLines size={14} />
                      {t("video.transcodeDone")}
                    </Button>
                  ) : (
                    <Button
                      variant={transcodeState === "error" ? "destructive" : "default"}
                      size="sm"
                      className="w-full text-xs gap-1.5 transition-colors duration-200"
                      onClick={onTranscodeAudio}
                    >
                      <AudioLines size={14} />
                      {transcodeState === "error"
                        ? t("video.transcodeRetry")
                        : t("video.transcode")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
