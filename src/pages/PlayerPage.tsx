import { Player, VideoPlayer, SubtitleMask } from "@/components/player";
import { CaptionsDisplay } from "@/components/player/captions-display";
import { CodecInfoBar } from "@/components/player/codec-info-bar";
import { PlayerControlsBar } from "@/components/player/player-controls-bar";
import { SettingsDialog } from "@/components/settings-dialog";
import { SubtitlesSidebar } from "@/components/subtitles/subtitles-sidebar";
import { Resizable } from "re-resizable";
import { useCallback, useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";
import { useVideoFile } from "@/hooks/use-video-file";
import { useTranscode } from "@/hooks/use-transcode";
import { useSubtitleLoader } from "@/hooks/use-subtitle-loader";
import { useCaptionSync } from "@/hooks/use-caption-sync";
import { useCaptionNavigation } from "@/hooks/use-caption-navigation";
import { useVideoEvents } from "@/hooks/use-video-events";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

export const PlayerPage = () => {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // ---- Video source ----
  const {
    videoSrc,
    videoFileName,
    codecInfo,
    setVideoSrc,
    setCodecInfo,
    captions,
    setCaptions,
    videoRef,
    videoFilePathRef,
    handleOpenFile,
  } = useVideoFile();

  // ---- Transcode ----
  const {
    transcodeState,
    transcodeProgress,
    transcodeDismissed,
    setTranscodeDismissed,
    handleTranscodeAudio,
  } = useTranscode(setVideoSrc, setCodecInfo, videoFilePathRef);

  // ---- Subtitle loading ----
  const { handleLoadSubtitle } = useSubtitleLoader(setCaptions);

  // ---- Caption sync ----
  const { handleTimeUpdate, activeCaptionData, activeDisplay } =
    useCaptionSync(captions);

  // ---- Caption navigation ----
  const { goToPrevCaption, goToNextCaption, handleSeekToCaption } =
    useCaptionNavigation(captions, videoRef);

  // ---- Video element events ----
  const {
    currentVideoTime,
    setCurrentVideoTime,
    duration,
    isPlaying,
    playbackRate,
    setIsPlaying,
  } = useVideoEvents(videoRef, videoSrc);

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({ videoRef, goToPrevCaption, goToNextCaption });

  // ---- Store ----
  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const blurMode = usePlayerStore((s) => s.blurMode);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const subtitleMaskVisible = usePlayerStore((s) => s.subtitleMaskVisible);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);

  // ---- Derived state ----
  const isAiProcessing =
    aiProcessing === "processing" || aiProcessing === "loading";

  // ---- Fullscreen ----
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // ---- Disable context menu ----
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // ---- Combined time update callback for VideoPlayer ----
  const onTimeUpdate = useCallback(
    (currentTime: number) => {
      setCurrentVideoTime(currentTime);
      handleTimeUpdate(currentTime);
    },
    [setCurrentVideoTime, handleTimeUpdate],
  );

  // ---- Playback controls ----
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

  const handleTranscode = useCallback(() => {
    handleTranscodeAudio(videoFilePathRef.current);
  }, [handleTranscodeAudio, videoFilePathRef]);

  const handleLoadSubtitleFile = useCallback(() => {
    handleLoadSubtitle(videoFileName);
  }, [handleLoadSubtitle, videoFileName]);

  const handleOpenSettings = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  // ---- Render ----
  return (
    <Player.Provider>
      <section className="flex overflow-hidden h-screen bg-background text-foreground">
        <main className="relative flex flex-col min-h-0 flex-1 min-w-0 border-r border-border bg-card">
          <div
            className={cn(
              "flex-1 px-6 pt-6 pb-0",
              "flex flex-col min-h-0 items-center h-full",
            )}
          >
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
              <VideoPlayer
                src={videoSrc}
                videoRef={videoRef}
                onTimeUpdate={onTimeUpdate}
              >
                {subtitleMaskVisible && <SubtitleMask />}
              </VideoPlayer>
            </div>

            <CaptionsDisplay
              activeCaptionData={activeCaptionData}
              activeDisplay={activeDisplay}
              currentVideoTime={currentVideoTime}
              captions={captions}
              isAiProcessing={isAiProcessing}
              blurMode={blurMode}
            />
          </div>

          <CodecInfoBar
            codecInfo={codecInfo}
            transcodeState={transcodeState}
            transcodeProgress={transcodeProgress}
            transcodeDismissed={transcodeDismissed}
            setTranscodeDismissed={setTranscodeDismissed}
            onTranscodeAudio={handleTranscode}
          />

          <PlayerControlsBar
            videoSrc={videoSrc}
            captions={captions}
            isPlaying={isPlaying}
            isFullscreen={isFullscreen}
            playbackRate={playbackRate}
            currentVideoTime={currentVideoTime}
            duration={duration}
            isAiProcessing={isAiProcessing}
            onTogglePlay={handleTogglePlay}
            onToggleFullscreen={handleToggleFullscreen}
            onSpeedChange={handleSpeedChange}
            onOpenFile={handleOpenFile}
            onLoadSubtitle={handleLoadSubtitleFile}
            onPrevCaption={goToPrevCaption}
            onNextCaption={goToNextCaption}
            onOpenSettings={handleOpenSettings}
          />
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
