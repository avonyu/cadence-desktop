import { memo } from "react";
import {
  FolderOpen,
  PanelRight,
  Subtitles,
  Settings,
  Loader2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Maximize,
  Minimize,
  RectangleHorizontal,
} from "lucide-react";
import { TimeSlider } from "@videojs/react";
import { type Caption } from "@/lib/subtitles";
import { SPEEDS, formatTime } from "@/lib/player-constants";
import { Button } from "@/components/ui/button";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubtitleSettingsPopover } from "@/components/subtitle-settings-popover";
import { usePlayerStore } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PlayerControlsBarProps {
  videoSrc: string | null;
  captions: Caption[];
  isPlaying: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  currentVideoTime: number;
  duration: number;
  isAiProcessing: boolean;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenFile: () => void;
  onLoadSubtitle: () => void;
  onPrevCaption: () => void;
  onNextCaption: () => void;
  onOpenSettings: () => void;
}

export const PlayerControlsBar = memo(function PlayerControlsBar({
  videoSrc,
  captions,
  isPlaying,
  isFullscreen,
  playbackRate,
  currentVideoTime,
  duration,
  isAiProcessing,
  onTogglePlay,
  onToggleFullscreen,
  onSpeedChange,
  onOpenFile,
  onLoadSubtitle,
  onPrevCaption,
  onNextCaption,
  onOpenSettings,
}: PlayerControlsBarProps) {
  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);
  const subtitleMaskVisible = usePlayerStore((s) => s.subtitleMaskVisible);
  const toggleSubtitleMask = usePlayerStore((s) => s.toggleSubtitleMask);
  const { t } = useTranslation();

  return (
    <div className="media-default-skin mt-auto z-1 bg-card">
      <TimeSlider.Root className="media-slider h-8">
        <TimeSlider.Track className="media-slider__track">
          <TimeSlider.Buffer className="media-slider__buffer" />
          <TimeSlider.Fill className="media-slider__fill" />
        </TimeSlider.Track>
        <TimeSlider.Thumb className="media-slider__thumb" />
      </TimeSlider.Root>

      <div className="flex h-12 items-center gap-1 px-4">
        <ShadcnTooltipProvider>
          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!videoSrc}
                onClick={onTogglePlay}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? t("player.pause") : t("player.play")}
            </TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={captions.length === 0}
                onClick={onPrevCaption}
              >
                <SkipBack size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("player.previousSubtitle")} (←)
            </TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={captions.length === 0}
                onClick={onNextCaption}
              >
                <SkipForward size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("player.nextSubtitle")} (→)
            </TooltipContent>
          </ShadcnTooltip>
        </ShadcnTooltipProvider>

        <span className="text-xs text-muted-foreground font-mono tabular-nums select-none ml-1">
          {formatTime(currentVideoTime)}
        </span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums select-none mx-0.5">/</span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums select-none">
          {formatTime(duration)}
        </span>

        <ShadcnTooltipProvider>
          <Popover>
            <ShadcnTooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-xs font-mono w-auto px-1.5"
                  >
                    {playbackRate}x
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {t("player.playbackSpeed")}
              </TooltipContent>
            </ShadcnTooltip>
            <PopoverContent className="w-24 p-1" align="center" sideOffset={8}>
              <div className="flex flex-col gap-0.5">
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={cn(
                      "w-full rounded px-2 py-1 text-xs text-left hover:bg-accent transition-colors",
                      playbackRate === speed &&
                        "text-(--player-accent) font-medium",
                    )}
                    onClick={() => onSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen
                ? t("player.exitFullscreen")
                : t("player.enterFullscreen")}
            </TooltipContent>
          </ShadcnTooltip>
        </ShadcnTooltipProvider>

        <div className="flex-1" />

        <ShadcnTooltipProvider>
          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onOpenFile}>
                <FolderOpen size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("video.openVideo")}</TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={isAiProcessing ? "text-(--player-accent)" : ""}
                disabled={isAiProcessing || !videoSrc}
                onClick={onLoadSubtitle}
              >
                {isAiProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Subtitles size={18} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isAiProcessing
                ? t("ai.processing")
                : !videoSrc
                  ? t("ai.noVideo")
                  : t("subtitle.loadSubtitle")}
            </TooltipContent>
          </ShadcnTooltip>

          <SubtitleSettingsPopover />

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={sidebarOpen ? "text-(--player-accent)" : ""}
                onClick={toggleSidebar}
              >
                <PanelRight size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("subtitle.subtitlesSidebar")}</TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={
                  subtitleMaskVisible ? "text-(--player-accent)" : ""
                }
                onClick={toggleSubtitleMask}
              >
                <RectangleHorizontal size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("subtitle.subtitleMask")}
            </TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenSettings}
              >
                <Settings size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("settings.title")}</TooltipContent>
          </ShadcnTooltip>
        </ShadcnTooltipProvider>
      </div>
    </div>
  );
});
