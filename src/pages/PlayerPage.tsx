import { Player, VideoPlayer, SubtitleMask } from "@/components/player";
import { VolumeOSD } from "@/components/player/volume-osd";
import { WordTranslatePopover } from "@/components/player/word-translate-popover";
import { CaptionsDisplay } from "@/components/player/captions-display";
import { CodecInfoBar } from "@/components/player/codec-info-bar";
import { PlayerControlsBar } from "@/components/player/player-controls-bar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UsageLimitBanner } from "@/components/usage-limit-banner";
import { SubtitlesSidebar } from "@/components/subtitles/subtitles-sidebar";
import { Resizable } from "re-resizable";
import { useCallback, useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useActivationStore } from "@/stores/activation-store";
import { useVideoFile } from "@/hooks/use-video-file";
import { useTranscode } from "@/hooks/use-transcode";
import { useSubtitleLoader } from "@/hooks/use-subtitle-loader";
import { useCaptionSync } from "@/hooks/use-caption-sync";
import { useCaptionNavigation } from "@/hooks/use-caption-navigation";
import { useVideoEvents } from "@/hooks/use-video-events";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useGamepad } from "@/hooks/use-gamepad";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useVolumeFeedback } from "@/hooks/use-volume-feedback";
import { useSingleSentenceLoop } from "@/hooks/use-single-sentence-loop";
import { useWordTranslate } from "@/hooks/use-word-translate";
import { useDisableContextMenu } from "@/hooks/use-disable-context-menu";
import { cn } from "@/lib/utils";
import { toggleMediaPlayback } from "@/lib/media-playback";
import { SPEEDS } from "@/lib/player-constants";
import { Gamepad2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export const PlayerPage = () => {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const { t } = useTranslation();

  // ---- Video source ----
  const {
    videoSrc,
    videoFileName,
    codecInfo,
    needsTranscode,
    setVideoSrc,
    setCodecInfo,
    captions,
    setCaptions,
    videoRef,
    videoFilePathRef,
    handleOpenFile,
    loadLastVideo,
  } = useVideoFile();

  // ---- Auto-load last video on mount ----
  useEffect(() => {
    loadLastVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTranscoded = videoSrc?.includes("_transcoded.mp4") ?? false;

  // ---- Transcode ----
  const { transcodeState, transcodeProgress, handleTranscodeAudio, handleCancelTranscode, resetTranscode } =
    useTranscode(setVideoSrc, setCodecInfo, videoFilePathRef, videoRef);

  // ---- Subtitle loading ----
  const { handleLoadSubtitle, handleRegenerateSubtitle, handleClearSubtitleCache } = useSubtitleLoader(setCaptions);

  // ---- Caption sync ----
  const { handleTimeUpdate, activeCaptionData, activeDisplay } = useCaptionSync(captions);

  // ---- Caption navigation ----
  const { goToPrevCaption, goToNextCaption, handleSeekToCaption } = useCaptionNavigation(captions, videoRef);

  // ---- Video element events ----
  const { currentVideoTime, setCurrentVideoTime, duration, isPlaying, playbackRate, setIsPlaying } = useVideoEvents(
    videoRef,
    videoSrc,
  );

  // ---- Store ----
  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const blurMode = usePlayerStore((s) => s.blurMode);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const subtitleMaskVisible = usePlayerStore((s) => s.subtitleMaskVisible);
  const autoTranscode = usePlayerStore((s) => s.autoTranscode);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);
  const toggleSubtitleMask = usePlayerStore((s) => s.toggleSubtitleMask);
  const cycleBlurMode = usePlayerStore((s) => s.cycleBlurMode);
  const toggleSwap = usePlayerStore((s) => s.toggleSwap);
  const singleSentenceLoop = usePlayerStore((s) => s.singleSentenceLoop);
  const toggleSingleSentenceLoop = usePlayerStore((s) => s.toggleSingleSentenceLoop);

  // ---- Single sentence loop ----
  const handleLoopCheck = useSingleSentenceLoop(videoRef, captions);

  // ---- Word translation ----
  const wordTranslate = useWordTranslate(videoRef);

  // ---- Volume feedback OSD ----
  const volumeFeedback = useVolumeFeedback(videoRef);

  // ---- Activation store hydration ----
  const hydrateActivation = useActivationStore((s) => s.hydrate);

  useEffect(() => {
    hydrateActivation();
  }, [hydrateActivation]);

  // ---- Derived state ----
  const isAiProcessing = aiProcessing === "processing" || aiProcessing === "loading";

  // ---- Fullscreen ----
  const isFullscreen = useFullscreen();

  // ---- Auto-transcode when unsupported audio codec detected ----
  useEffect(() => {
    if (needsTranscode && autoTranscode && videoFilePathRef.current) {
      handleTranscodeAudio(videoFilePathRef.current, true);
    }
  }, [needsTranscode, autoTranscode, handleTranscodeAudio, videoFilePathRef]);

  // ---- Disable context menu ----
  useDisableContextMenu();

  // ---- Combined time update callback for VideoPlayer ----
  const onTimeUpdate = useCallback(
    (currentTime: number) => {
      setCurrentVideoTime(currentTime);
      handleTimeUpdate(currentTime);
      handleLoopCheck(currentTime);
    },
    [setCurrentVideoTime, handleTimeUpdate, handleLoopCheck],
  );

  // ---- Playback controls ----
  const handleTogglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(await toggleMediaPlayback(video));
  }, [videoRef, setIsPlaying]);

  const handleToggleFullscreen = useCallback(() => {
    const el = document.querySelector(".video-player-surface");
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
      }
    },
    [videoRef],
  );

  const handleVolumeUp = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.min(1, Math.round((video.volume + 0.1) * 10) / 10);
    video.muted = false;
  }, [videoRef]);

  const handleVolumeDown = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.round((video.volume - 0.1) * 10) / 10);
    video.muted = false;
  }, [videoRef]);

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, [videoRef]);

  const handleSpeedUp = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const idx = SPEEDS.indexOf(video.playbackRate);
    video.playbackRate = idx === -1 ? 1 : SPEEDS[(idx + 1) % SPEEDS.length];
  }, [videoRef]);

  const handleSpeedDown = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const idx = SPEEDS.indexOf(video.playbackRate);
    video.playbackRate = idx === -1 ? 1 : SPEEDS[(idx - 1 + SPEEDS.length) % SPEEDS.length];
  }, [videoRef]);

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({
    videoRef,
    goToPrevCaption,
    goToNextCaption,
    toggleSingleSentenceLoop,
    toggleFullscreen: handleToggleFullscreen,
    volumeUp: handleVolumeUp,
    volumeDown: handleVolumeDown,
    toggleMute: handleToggleMute,
    speedUp: handleSpeedUp,
    speedDown: handleSpeedDown,
    toggleSidebar,
    cycleBlurMode,
    toggleSubtitleMask,
    toggleSwap,
  });

  const handleTranscode = useCallback(() => {
    handleTranscodeAudio(videoFilePathRef.current);
  }, [handleTranscodeAudio, videoFilePathRef]);

  const handleOpenFileWithReset = useCallback(async () => {
    resetTranscode();
    await handleOpenFile();
  }, [resetTranscode, handleOpenFile]);

  const handleLoadSubtitleFile = useCallback(() => {
    handleLoadSubtitle(videoFileName);
  }, [handleLoadSubtitle, videoFileName]);

  const handleRegenerate = useCallback(() => {
    handleRegenerateSubtitle(videoFileName);
  }, [handleRegenerateSubtitle, videoFileName]);

  const handleClearCache = useCallback(() => {
    handleClearSubtitleCache(videoFileName);
  }, [handleClearSubtitleCache, videoFileName]);

  const handleOpenSettings = useCallback(() => {
    setSettingsDialogOpen((prev) => !prev);
  }, []);

  // ---- Gamepad ----
  const { isConnected: isGamepadConnected } = useGamepad({
    videoRef,
    onTogglePlay: handleTogglePlay,
    onPrevCaption: goToPrevCaption,
    onNextCaption: goToNextCaption,
    onToggleFullscreen: handleToggleFullscreen,
    onOpenFile: handleOpenFileWithReset,
    onOpenSettings: handleOpenSettings,
    toggleSidebar,
    toggleSubtitleMask,
    toggleSingleSentenceLoop,
    disabled: settingsDialogOpen,
  });

  // ---- Render ----
  return (
    <Player.Provider>
      <section className="flex overflow-hidden h-screen bg-background text-foreground">
        <main className="relative flex flex-col min-h-0 flex-1 min-w-0 border-r border-border bg-card">
          <div className={cn("flex-1 px-6 pt-6 pb-0", "flex flex-col min-h-0 items-center h-full")}>
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
              <VideoPlayer src={videoSrc} videoRef={videoRef} onTimeUpdate={onTimeUpdate}>
                {subtitleMaskVisible && <SubtitleMask activeDisplay={activeDisplay} isFullscreen={isFullscreen} />}
              </VideoPlayer>
              <VolumeOSD volume={volumeFeedback.volume} muted={volumeFeedback.muted} visible={volumeFeedback.visible} />
            </div>

            <CaptionsDisplay
              activeCaptionData={activeCaptionData}
              activeDisplay={activeDisplay}
              captions={captions}
              isAiProcessing={isAiProcessing}
              blurMode={blurMode}
              onWordClick={wordTranslate.handleWordClick}
              onMouseOver={wordTranslate.handleMouseOver}
              onMouseOut={wordTranslate.handleMouseOut}
            />
          </div>

          <div className="relative">
            <PlayerControlsBar
              videoSrc={videoSrc}
              videoRef={videoRef}
              captions={captions}
              isPlaying={isPlaying}
              isFullscreen={isFullscreen}
              playbackRate={playbackRate}
              currentVideoTime={currentVideoTime}
              duration={duration}
              isAiProcessing={isAiProcessing}
              singleSentenceLoop={singleSentenceLoop}
              onTogglePlay={handleTogglePlay}
              onToggleFullscreen={handleToggleFullscreen}
              onSpeedChange={handleSpeedChange}
              onOpenFile={handleOpenFileWithReset}
              onLoadSubtitle={handleLoadSubtitleFile}
              onRegenerateSubtitle={handleRegenerate}
              onClearSubtitleCache={handleClearCache}
              onPrevCaption={goToPrevCaption}
              onNextCaption={goToNextCaption}
              onOpenSettings={handleOpenSettings}
              onToggleSingleSentenceLoop={toggleSingleSentenceLoop}
            />
            <div className="absolute bottom-full left-3 mb-2 z-10">
              <UsageLimitBanner />
            </div>
            <div className="absolute bottom-full right-0 z-10 flex items-center gap-1">
              {isGamepadConnected && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Gamepad2 size={16} className="text-(--player-accent) pointer-events-auto mt-0.5" />
                    </TooltipTrigger>
                    <TooltipContent>{t("gamepad.connected")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="pointer-events-none">
                <CodecInfoBar
                  codecInfo={codecInfo}
                  transcodeState={transcodeState}
                  transcodeProgress={transcodeProgress}
                  isTranscoded={isTranscoded}
                  onTranscodeAudio={handleTranscode}
                  onCancelTranscode={handleCancelTranscode}
                />
              </div>
            </div>
          </div>
        </main>

        <Resizable
          defaultSize={{ width: 360, height: "100%" }}
          minWidth={280}
          maxWidth={600}
          enable={{ left: true }}
          className={`min-h-0 ${sidebarOpen ? "" : "hidden"}`}
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
          <SubtitlesSidebar captions={captions} onSeekToCaption={handleSeekToCaption} onClose={toggleSidebar} videoFileName={videoFileName} />
        </Resizable>

        <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />

        <WordTranslatePopover
          word={wordTranslate.word}
          definition={wordTranslate.definition}
          loading={wordTranslate.loading}
          open={wordTranslate.open}
          anchorEl={wordTranslate.anchorEl}
          onOpenChange={wordTranslate.handleOpenChange}
          onClose={wordTranslate.handleClose}
          tryRecoverAnchor={wordTranslate.tryRecoverAnchor}
        />
      </section>
    </Player.Provider>
  );
};
