import { memo, useState, useCallback, useEffect, useRef } from "react";
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
  Volume2,
  VolumeX,
  Repeat1,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PlayerControlsBarProps {
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captions: Caption[];
  isPlaying: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  currentVideoTime: number;
  duration: number;
  isAiProcessing: boolean;
  singleSentenceLoop: boolean;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenFile: () => void;
  onLoadSubtitle: () => void;
  onPrevCaption: () => void;
  onNextCaption: () => void;
  onOpenSettings: () => void;
  onToggleSingleSentenceLoop: () => void;
}

export const PlayerControlsBar = memo(function PlayerControlsBar({
  videoSrc,
  videoRef,
  captions,
  isPlaying,
  isFullscreen,
  playbackRate,
  currentVideoTime,
  duration,
  isAiProcessing,
  singleSentenceLoop,
  onTogglePlay,
  onToggleFullscreen,
  onSpeedChange,
  onOpenFile,
  onLoadSubtitle,
  onPrevCaption,
  onNextCaption,
  onOpenSettings,
  onToggleSingleSentenceLoop,
}: PlayerControlsBarProps) {
  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);
  const subtitleMaskVisible = usePlayerStore((s) => s.subtitleMaskVisible);
  const toggleSubtitleMask = usePlayerStore((s) => s.toggleSubtitleMask);
  const { t } = useTranslation();

  // ---- Volume state ----
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const prevVolumeRef = useRef(1);
  const volumeSyncedRef = useRef(false);

  // Sync volume from the video element when it becomes available
  useEffect(() => {
    const video = videoRef.current;
    if (!video || volumeSyncedRef.current) return;
    setVolume(video.volume);
    setMuted(video.muted);
    volumeSyncedRef.current = true;
  }, [videoRef]);

  // Listen for external volume changes (e.g. from gamepad)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    video.addEventListener("volumechange", onVolumeChange);
    return () => video.removeEventListener("volumechange", onVolumeChange);
  }, [videoRef]);

  // Reset sync flag when video source changes
  useEffect(() => {
    volumeSyncedRef.current = false;
  }, [videoSrc]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(0, Math.min(1, newVolume));
      video.volume = clamped;
      setVolume(clamped);
      if (clamped > 0 && muted) {
        video.muted = false;
        setMuted(false);
      }
    },
    [videoRef, muted],
  );

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.volume === 0) {
      const restore = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5;
      video.volume = restore;
      video.muted = false;
      setVolume(restore);
      setMuted(false);
    } else {
      prevVolumeRef.current = video.volume;
      video.muted = !video.muted;
      setMuted(!muted);
    }
  }, [videoRef, muted]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : Volume2;

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
              {isPlaying ? t("player.pause") : t("player.play")} (Space)
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
            <TooltipContent>{t("player.previousSubtitle")} (←)</TooltipContent>
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
            <TooltipContent>{t("player.nextSubtitle")} (→)</TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={captions.length === 0}
                className={singleSentenceLoop ? "text-(--player-accent)" : ""}
                onClick={onToggleSingleSentenceLoop}
              >
                <Repeat1 size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("player.singleSentenceLoop")} (L)
            </TooltipContent>
          </ShadcnTooltip>
        </ShadcnTooltipProvider>

        <span className="text-xs text-muted-foreground font-mono tabular-nums select-none ml-1">
          {formatTime(currentVideoTime)}
        </span>
        <span className="text-xs text-muted-foreground font-mono tabular-nums select-none mx-0.5">
          /
        </span>
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
              <TooltipContent>{t("player.playbackSpeed")} (, / .)</TooltipContent>
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

          {/* Volume control */}
          <Popover>
            <ShadcnTooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={!videoSrc}>
                    <VolumeIcon size={18} />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>{t("player.volume")} (M / ↑↓)</TooltipContent>
            </ShadcnTooltip>
            <PopoverContent className="w-12 p-2" align="center" sideOffset={8}>
              <div className="flex flex-col items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    handleVolumeChange(parseFloat(e.target.value));
                  }}
                  className="volume-slider h-24 w-1.5 rounded-full appearance-none cursor-pointer bg-muted-foreground/20 accent-(--player-accent) [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--player-accent) [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-(--player-accent) [&::-moz-range-thumb]:border-0"
                  style={{
                    WebkitAppearance: "slider-vertical",
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  }}
                />
                <button
                  type="button"
                  className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMute();
                  }}
                >
                  <VolumeIcon size={16} />
                </button>
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
                : t("player.enterFullscreen")}{" "}
              (F)
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
                className={subtitleMaskVisible ? "text-(--player-accent)" : ""}
                onClick={toggleSubtitleMask}
              >
                <RectangleHorizontal size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("subtitle.subtitleMask")} (R)</TooltipContent>
          </ShadcnTooltip>

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
            <TooltipContent>{t("subtitle.subtitlesSidebar")} (S)</TooltipContent>
          </ShadcnTooltip>

          <ShadcnTooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onOpenSettings}>
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
