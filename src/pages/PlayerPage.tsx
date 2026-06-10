import { VideoPlayer } from "@/components/player";
import {
  FolderOpen,
  FileText,
  Subtitles,
  Settings,
  Loader2,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRef, useCallback, useEffect, useState } from "react";
import { type Caption } from "@/lib/subtitles";
import { processSubtitle, getSubtitlesForVideo } from "@/lib/ai-subtitle";
import {
  getNextCaptionIndex,
  getPreviousCaptionIndex,
} from "@/lib/caption-navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerStore } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { SubtitleSettingsPopover } from "@/components/subtitle-settings-popover";
import { SettingsDialog } from "@/components/settings-dialog";
import { SubtitlesSidebar } from "@/components/subtitles/subtitles-sidebar";
import ShinyText from "@/components/ShinyText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const PlayerPage = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const sidebarOpen = usePlayerStore((s) => s.sidebarOpen);
  const blurMode = usePlayerStore((s) => s.blurMode);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const toggleSidebar = usePlayerStore((s) => s.toggleSidebar);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const deepseekApiKey = usePlayerStore((s) => s.deepseekApiKey);
  const deepseekModel = usePlayerStore((s) => s.deepseekModel);
  const setAiProcessing = usePlayerStore((s) => s.setAiProcessing);

  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      // Extract file name from path
      const fileName = selected.split(/[\\/]/).pop() || selected;
      setVideoFileName(fileName);

      // Clear previous subtitles
      setCaptions([]);
      setActiveCaption(null);

      // Try to load cached subtitles for this video
      const cached = await getSubtitlesForVideo(fileName);
      if (cached && cached.length > 0) {
        setCaptions(cached);
      }
    }
  };

  const handleLoadSubtitle = async () => {
    // Check for API key
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

    // Start AI processing
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

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (captions.length === 0) return;

      let newIndex: number | null = null;
      for (let i = 0; i < captions.length; i++) {
        if (currentTime >= captions[i].start && currentTime < captions[i].end) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== activeCaption) {
        setActiveCaption(newIndex);
      }
    },
    [captions, activeCaption, setActiveCaption],
  );

  const handleSeekToCaption = useCallback((caption: Caption) => {
    if (videoRef.current) {
      videoRef.current.currentTime = caption.start;
      videoRef.current.play?.();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
        return;
      }

      if (captions.length === 0) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = getPreviousCaptionIndex(
          captions,
          videoRef.current?.currentTime ?? 0,
          activeCaption,
        );
        if (prev === null) return;
        setActiveCaption(prev);
        handleSeekToCaption(captions[prev]);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = getNextCaptionIndex(
          captions,
          videoRef.current?.currentTime ?? 0,
          activeCaption,
        );
        if (next === null) return;
        setActiveCaption(next);
        handleSeekToCaption(captions[next]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captions, activeCaption, handleSeekToCaption, setActiveCaption]);

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
    <section
      className="overflow-hidden grid h-screen bg-background text-foreground"
      style={{
        gridTemplateColumns: sidebarOpen ? "1fr minmax(280px, 430px)" : "1fr",
      }}
    >
      <main className="relative flex flex-col min-h-0 border-r border-border bg-card">
        {/* Main Content */}
        <div
          className={cn(
            "flex-1 px-6 pt-6 pb-0",
            "flex flex-col min-h-0 items-center h-full",
          )}
        >
          {/* Video Player */}
          <div className="relative w-full max-w-[1920px] aspect-video overflow-hidden">
            <VideoPlayer
              src={videoSrc}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Captions */}
          <div className="group flex w-full flex-col items-center justify-center py-5 text-center min-h-36">
            {captions.length > 0 ? (
              activeDisplay && (
                <>
                  <p
                    className={`text-2xl font-semibold leading-[1.4] text-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                      blurMode === "primary" || blurMode === "all"
                        ? "blur group-hover:blur-none"
                        : ""
                    }`}
                  >
                    {activeDisplay.primary}
                  </p>
                  <p
                    className={`mt-5 text-2xl leading-[1.4] text-muted-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                      blurMode === "secondary" || blurMode === "all"
                        ? "blur group-hover:blur-none"
                        : ""
                    }`}
                  >
                    {activeDisplay.secondary}
                  </p>
                </>
              )
            ) : isAiProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-(--player-accent)" />
                <ShinyText
                  text={t("ai.processing")}
                  speed={2}
                  shineColor="var(--player-accent)"
                  className="text-lg"
                />
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                {t("subtitle.noSubtitles")}
              </p>
            )}
          </div>
        </div>

        {/* Tools bar */}
        <div className="mt-auto flex z-1 h-14 items-center justify-end gap-1 border-t border-border px-4 bg-card">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={handleOpenFile}>
                  <FolderOpen size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("video.openVideo")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={
                    isAiProcessing ? "text-[var(--player-accent)]" : ""
                  }
                  disabled={isAiProcessing || !videoSrc}
                  onClick={handleLoadSubtitle}
                >
                  {isAiProcessing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <FileText size={18} />
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
            </Tooltip>

            <SubtitleSettingsPopover />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={sidebarOpen ? "text-[var(--player-accent)]" : ""}
                  onClick={toggleSidebar}
                >
                  <Subtitles size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("subtitle.subtitlesSidebar")}</TooltipContent>
            </Tooltip>

            <Tooltip>
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
            </Tooltip>
          </TooltipProvider>
        </div>
      </main>

      {sidebarOpen && (
        <SubtitlesSidebar
          captions={captions}
          onSeekToCaption={handleSeekToCaption}
          onClose={toggleSidebar}
        />
      )}

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </section>
  );
};
