import { Player, VideoPlayer, SubtitleMask } from "@/components/player";
import {
  FolderOpen,
  PanelRight,
  Subtitles,
  Settings,
  Loader2,
  AudioLines,
  Minus,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Maximize,
  Minimize,
  RectangleHorizontal,
} from "lucide-react";
import { TimeSlider } from "@videojs/react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useRef, useCallback, useEffect, useState } from "react";
import { type Caption } from "@/lib/subtitles";
import { processSubtitle, getSubtitlesForVideo } from "@/lib/ai-subtitle";
import {
  getNextCaptionIndex,
  getPreviousCaptionIndex,
} from "@/lib/caption-navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerStore } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { SubtitleSettingsPopover } from "@/components/subtitle-settings-popover";
import { Resizable } from "re-resizable";
import { SettingsDialog } from "@/components/settings-dialog";
import { SubtitlesSidebar } from "@/components/subtitles/subtitles-sidebar";
import ShinyText from "@/components/ShinyText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CodecInfo {
  codec_name: string;
  codec_long_name: string;
}

interface VideoCodecResult {
  video: CodecInfo | null;
  audio: CodecInfo | null;
}

const UNSUPPORTED_AUDIO_CODECS = new Set([
  "dts",
  "ac3",
  "eac3",
  "truehd",
  "mlp",
  "wmapro",
  "wmalossless",
  "wmavoice",
  "dtshd",
]);

function isAudioCodecUnsupported(codecName: string): boolean {
  return UNSUPPORTED_AUDIO_CODECS.has(codecName);
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const PlayerPage = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [codecInfo, setCodecInfo] = useState<VideoCodecResult | null>(null);
  const [transcodeState, setTranscodeState] = useState<
    "idle" | "converting" | "done" | "error"
  >("idle");
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const [transcodeDismissed, setTranscodeDismissed] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoFilePathRef = useRef<string | null>(null);

  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const blurMode = usePlayerStore((s) => s.blurMode);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const setScrollTracking = usePlayerStore((s) => s.setScrollTracking);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const deepseekApiKey = usePlayerStore((s) => s.deepseekApiKey);
  const deepseekModel = usePlayerStore((s) => s.deepseekModel);
  const setAiProcessing = usePlayerStore((s) => s.setAiProcessing);
  const subtitleMaskVisible = usePlayerStore((s) => s.subtitleMaskVisible);
  const toggleSubtitleMask = usePlayerStore((s) => s.toggleSubtitleMask);

  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Video element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onDurationChange = () => {
      if (isFinite(video.duration)) setDuration(video.duration);
    };
    const onRateChange = () => setPlaybackRate(video.playbackRate);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ratechange", onRateChange);

    if (isFinite(video.duration)) setDuration(video.duration);
    setIsPlaying(!video.paused);
    setPlaybackRate(video.playbackRate);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ratechange", onRateChange);
    };
  }, [videoSrc]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Video",
          extensions: ["mp4", "webm", "mkv", "avi", "mov", "flv", "wmv"],
        },
      ],
    });
    if (selected) {
      setVideoSrc(convertFileSrc(selected));
      videoFilePathRef.current = selected;
      const fileName = selected.split(/[\\/]/).pop() || selected;
      setVideoFileName(fileName);

      setCaptions([]);
      setActiveCaption(null);
      setLastActiveCaption(null);
      setTranscodeState("idle");
      setTranscodeDismissed(false);

      try {
        const result = await invoke<VideoCodecResult>("detect_video_codecs", {
          filePath: selected,
        });
        setCodecInfo(result);
        if (result.audio && isAudioCodecUnsupported(result.audio.codec_name)) {
          const label = result.audio.codec_name.toUpperCase();
          toast.warning(t("video.codecWarning", { codec: label }), {
            duration: 8000,
          });
        }
      } catch {
        setCodecInfo(null);
      }

      const tools = await invoke<{
        ffmpeg: boolean;
        ffprobe: boolean;
        ffplay: boolean;
      }>("check_ffmpeg_tools");
      if (!tools.ffmpeg) {
        toast.warning(t("video.ffmpegMissing"), { duration: 6000 });
      }
      if (!tools.ffprobe) {
        toast.warning(t("video.ffprobeMissing"), { duration: 6000 });
      }

      const cached = await getSubtitlesForVideo(fileName);
      if (cached && cached.length > 0) {
        setCaptions(cached);
      }
    }
  };

  const handleLoadSubtitle = async () => {
    if (!deepseekApiKey) {
      toast.error(t("ai.noApiKey"));
      return;
    }

    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Subtitle",
          extensions: ["srt", "ass"],
        },
      ],
    });

    if (!selected) return;

    let content: string;
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      content = await readTextFile(selected);
    } catch (error) {
      console.error("Failed to load subtitle file:", error);
      toast.error(t("ai.loadFailed"));
      return;
    }

    setAiProcessing("processing");

    try {
      const result = await processSubtitle(
        content,
        videoFileName,
        deepseekApiKey,
        deepseekModel,
      );
      if (result.length > 0) {
        setCaptions(result);
        setActiveCaption(null);
        setLastActiveCaption(null);
        setAiProcessing("done");
        setTimeout(() => setAiProcessing("idle"), 2000);
      } else {
        toast.error(t("ai.processFailed"));
        setAiProcessing("idle");
      }
    } catch (error) {
      console.error("AI processing failed:", error);
      toast.error(
        error instanceof Error ? error.message : t("ai.processFailed"),
      );
      setAiProcessing("idle");
    }
  };

  const handleTranscodeAudio = async () => {
    const inputPath = videoFilePathRef.current;
    if (!inputPath) return;

    setTranscodeState("converting");
    setTranscodeProgress(0);
    toast.warning(t("video.transcodeDoNotClose"));

    const unlisten = await listen<number>("transcode-progress", (event) => {
      setTranscodeProgress(event.payload);
    });

    try {
      const outputPath = await invoke<string>("transcode_audio", {
        inputPath,
      });
      setVideoSrc(convertFileSrc(outputPath));
      videoFilePathRef.current = outputPath;
      setTranscodeState("done");
      setTranscodeProgress(100);
      const result = await invoke<VideoCodecResult>("detect_video_codecs", {
        filePath: outputPath,
      });
      setCodecInfo(result);
      toast.success(t("video.transcodeSuccess"));
    } catch (error) {
      console.error("Transcode failed:", error);
      toast.error(
        error instanceof Error ? error.message : t("video.transcodeFailed"),
      );
      setTranscodeState("error");
    } finally {
      unlisten();
    }
  };

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      setCurrentVideoTime(currentTime);

      if (captions.length === 0) return;

      let newIndex: number | null = null;
      for (let i = 0; i < captions.length; i++) {
        if (currentTime >= captions[i].start && currentTime < captions[i].end + 0.001) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== activeCaption) {
        setActiveCaption(newIndex);
      }
      if (newIndex !== null) {
        setLastActiveCaption(newIndex);
      }
    },
    [captions, activeCaption, setActiveCaption, setLastActiveCaption],
  );

  const handleSeekToCaption = useCallback((caption: Caption) => {
    if (videoRef.current) {
      videoRef.current.currentTime = caption.start;
    }
  }, []);

  const goToPrevCaption = useCallback(() => {
    if (captions.length === 0) return;
    const prev = getPreviousCaptionIndex(
      captions,
      videoRef.current?.currentTime ?? 0,
      activeCaption,
    );
    if (prev === null) return;
    setScrollTracking(true);
    setActiveCaption(prev);
    setLastActiveCaption(prev);
    handleSeekToCaption(captions[prev]);
  }, [
    captions,
    activeCaption,
    handleSeekToCaption,
    setScrollTracking,
    setActiveCaption,
    setLastActiveCaption,
  ]);

  const goToNextCaption = useCallback(() => {
    if (captions.length === 0) return;
    const next = getNextCaptionIndex(
      captions,
      videoRef.current?.currentTime ?? 0,
      activeCaption,
    );
    if (next === null) return;
    setScrollTracking(true);
    setActiveCaption(next);
    setLastActiveCaption(next);
    handleSeekToCaption(captions[next]);
  }, [
    captions,
    activeCaption,
    handleSeekToCaption,
    setScrollTracking,
    setActiveCaption,
    setLastActiveCaption,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === " ") {
        if (!isInput) {
          e.preventDefault();
          const video = videoRef.current;
          if (video) {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevCaption();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextCaption();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [goToPrevCaption, goToNextCaption]);

  // Disable global context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = document.querySelector(".video-player-surface");
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  }, []);

  const getDisplayText = (
    caption: Caption,
  ): { primary: string; secondary: string } => {
    if (swapSubtitles) {
      return { primary: caption.translation, secondary: caption.text };
    }
    return { primary: caption.text, secondary: caption.translation };
  };

  const activeCaptionData =
    activeCaption !== null && captions[activeCaption]
      ? captions[activeCaption]
      : null;

  const activeDisplay = activeCaptionData
    ? getDisplayText(activeCaptionData)
    : null;

  const isAiProcessing =
    aiProcessing === "processing" || aiProcessing === "loading";

  return (
    <Player.Provider>
      <section className="flex overflow-hidden h-screen bg-background text-foreground">
        <main className="relative flex flex-col min-h-0 flex-1 min-w-0 border-r border-border bg-card">
          {/* Main Content */}
          <div
            className={cn(
              "flex-1 px-6 pt-6 pb-0",
              "flex flex-col min-h-0 items-center h-full",
            )}
          >
            {/* Video Player */}
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
              <VideoPlayer
                src={videoSrc}
                videoRef={videoRef}
                onTimeUpdate={handleTimeUpdate}
              >
                {subtitleMaskVisible && <SubtitleMask />}
              </VideoPlayer>
            </div>

            {/* Captions */}
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
                      className={`text-2xl font-semibold leading-[1.4] text-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${blurMode === "primary" || blurMode === "all"
                        ? "blur group-hover:blur-none"
                        : ""
                        }`}
                    >
                      {activeDisplay.primary}
                    </p>
                    <p
                      className={`mt-5 text-2xl leading-[1.4] text-muted-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${blurMode === "secondary" || blurMode === "all"
                        ? "blur group-hover:blur-none"
                        : ""
                        }`}
                    >
                      {activeDisplay.secondary}
                    </p>
                  </>
                )
              ) : (
                <p className="text-lg text-muted-foreground">
                  {t("subtitle.noSubtitles")}
                </p>
              )}
            </div>
          </div>

          {/* Codec info */}
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
                          onClick={handleTranscodeAudio}
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

          {/* Controls bar */}
          <div className="media-default-skin mt-auto z-1 bg-card">
            {/* Progress bar (videojs) */}
            <TimeSlider.Root className="media-slider h-8">
              <TimeSlider.Track className="media-slider__track">
                <TimeSlider.Buffer className="media-slider__buffer" />
                <TimeSlider.Fill className="media-slider__fill" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="media-slider__thumb" />
            </TimeSlider.Root>

            {/* Controls row */}
            <div className="flex h-12 items-center gap-1 px-4">
              <ShadcnTooltipProvider>
                <ShadcnTooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!videoSrc}
                      onClick={handleTogglePlay}
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
                      onClick={goToPrevCaption}
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
                      onClick={goToNextCaption}
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
                          onClick={() => handleSpeedChange(speed)}
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
                      onClick={handleToggleFullscreen}
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
                    <Button variant="ghost" size="icon-sm" onClick={handleOpenFile}>
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
                      className={isAiProcessing ? "text-[var(--player-accent)]" : ""}
                      disabled={isAiProcessing || !videoSrc}
                      onClick={handleLoadSubtitle}
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
                      className={sidebarOpen ? "text-[var(--player-accent)]" : ""}
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
                    subtitleMaskVisible ? "text-[var(--player-accent)]" : ""
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
                      onClick={() => setSettingsDialogOpen(true)}
                    >
                      <Settings size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("settings.title")}</TooltipContent>
                </ShadcnTooltip>
              </ShadcnTooltipProvider>
            </div>
          </div>
        </main>

        {sidebarOpen && (
          <Resizable
            defaultSize={{ width: 360, height: "100%" }}
            minWidth={280}
            maxWidth={600}
            enable={{ left: true }}
            className="min-h-0"
            handleStyles={{
              left: {
                width: "4px",
                cursor: "col-resize",
              },
            }}
            handleClasses={{
              left: "hover:bg-(--player-accent)/50 transition-colors",
            }}
          >
            <SubtitlesSidebar
              captions={captions}
              onSeekToCaption={handleSeekToCaption}
              onClose={toggleSidebar}
            />
          </Resizable>
        )}

        <SettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
        />
      </section>
    </Player.Provider>
  );
};
