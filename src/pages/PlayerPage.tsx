import { VideoPlayer } from "@/components/player";
import {
  FolderOpen,
  FileText,
  Subtitles,
  X,
  Settings,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRef, useCallback, useEffect, useState } from "react";
import { parseSubtitles, type Caption } from "@/lib/subtitles";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerStore, type BlurMode } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { SubtitleSettingsPopover } from "@/components/player/subtitle-settings-popover";
import { SettingsDialog } from "@/components/player/settings-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function getSidebarBlurClasses(blurMode: BlurMode, target: "text" | "translation") {
  if (blurMode === "off") return "";
  if (blurMode === "primary" && target === "text") return "blur-[4px]";
  if (blurMode === "secondary" && target === "translation") return "blur-[4px]";
  if (blurMode === "all") return "blur-[4px]";
  return "";
}

function formatCaptionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PlayerPage = () => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const {
    sidebarOpen,
    blurMode,
    swapSubtitles,
    activeCaption,
    setActiveCaption,
    toggleSidebar,
  } = usePlayerStore();

  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

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
    }
  };

  const handleLoadSubtitle = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Subtitle",
          extensions: ["srt", "ass"],
        },
      ],
    });
    if (selected) {
      try {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const content = await readTextFile(selected);
        const parsed = parseSubtitles(content);
        if (parsed.length > 0) {
          setCaptions(parsed);
          setActiveCaption(null);
        }
      } catch (error) {
        console.error("Failed to load subtitle file:", error);
      }
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

      if (newIndex === null) {
        for (let i = captions.length - 1; i >= 0; i--) {
          if (currentTime >= captions[i].start) {
            newIndex = i;
            break;
          }
        }
      }

      if (newIndex !== null && newIndex !== activeCaption) {
        setActiveCaption(newIndex);
      }
    },
    [captions, activeCaption, setActiveCaption],
  );

  const handleSeekToCaption = useCallback(
    (caption: Caption) => {
      if (videoRef.current) {
        videoRef.current.currentTime = caption.start;
        videoRef.current.play?.();
      }
    },
    [],
  );

  useEffect(() => {
    if (activeItemRef.current && sidebarRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeCaption]);

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
        let idx = activeCaption;
        if (idx === null) {
          for (let i = 0; i < captions.length; i++) {
            if (videoRef.current && videoRef.current.currentTime >= captions[i].start)
              idx = i;
          }
        }
        if (idx == null) idx = 0;
        const prev = Math.max(0, idx - 1);
        setActiveCaption(prev);
        handleSeekToCaption(captions[prev]);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        let idx = activeCaption;
        if (idx === null) {
          for (let i = 0; i < captions.length; i++) {
            if (videoRef.current && videoRef.current.currentTime >= captions[i].start)
              idx = i;
          }
        }
        if (idx == null) idx = 0;
        const next = Math.min(captions.length - 1, idx + 1);
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

  return (
    <section
      className="overflow-hidden grid h-screen bg-background text-foreground"
      style={{
        gridTemplateColumns: sidebarOpen ? "1fr minmax(280px, 430px)" : "1fr",
      }}
    >
      <main className="relative flex min-h-0 flex-col border-r border-border bg-card">
        <div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-6 pb-0">
          <div className="relative mx-auto w-full max-w-[960px] aspect-video overflow-hidden border border-border rounded-2xl bg-black flex-shrink-0">
            <VideoPlayer
              src={videoSrc}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          <div className="group flex w-full max-w-[64rem] flex-col items-center justify-center py-5 text-center min-h-[9rem]">
            {captions.length > 0 && activeDisplay ? (
              <>
                <p
                  className={`text-2xl font-semibold leading-[1.4] text-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                    blurMode === "primary" || blurMode === "all"
                      ? "blur-[8px] group-hover:blur-0"
                      : ""
                  }`}
                >
                  {activeDisplay.primary}
                </p>
                <p
                  className={`mt-5 text-2xl leading-[1.4] text-muted-foreground max-w-[64rem] transition-[filter] duration-300 select-none ${
                    blurMode === "secondary" || blurMode === "all"
                      ? "blur-[8px] group-hover:blur-0"
                      : ""
                  }`}
                >
                  {activeDisplay.secondary}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">
                {t("subtitle.noSubtitles")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto z-1 flex h-14 items-center justify-end gap-1 border-t border-border px-4 bg-card">
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
                <Button variant="ghost" size="icon-sm" onClick={handleLoadSubtitle}>
                  <FileText size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("subtitle.loadSubtitle")}</TooltipContent>
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
                <Button variant="ghost" size="icon-sm" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("settings.title")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </main>

      {sidebarOpen && (
        <aside className="flex min-h-0 flex-col bg-popover">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Subtitles size={20} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                {t("subtitle.subtitlesList")}
              </span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
              <X size={20} />
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-5 py-4">
              {captions.length > 0 ? (
                <div className="space-y-2" ref={sidebarRef}>
                  {captions.map((caption, index) => {
                    const isActive = index === activeCaption;
                    const ref = isActive ? activeItemRef : null;
                    const { primary, secondary } = getDisplayText(caption);

                    return (
                      <button
                        ref={ref}
                        className={`group/item grid w-full grid-cols-[62px_1fr] gap-1 rounded-md px-2 py-2 text-left transition ${
                          isActive
                            ? "bg-accent text-[var(--player-accent)]"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                        key={`${caption.start}-${caption.text}`}
                        onClick={() => handleSeekToCaption(caption)}
                      >
                        <span
                          className={`text-sm font-bold text-center transition cursor-pointer hover:text-[var(--player-accent)] ${
                            isActive
                              ? "text-[var(--player-accent)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatCaptionTime(caption.start)}
                        </span>
                        <span>
                          <span
                            className={`block text-sm font-bold leading-snug tracking-tight transition-[filter] duration-300 ${
                              getSidebarBlurClasses(blurMode, "text") || ""
                            } group-hover/item:blur-none`}
                          >
                            {primary}
                          </span>
                          <span
                            className={`mt-2 block text-sm leading-snug tracking-tight transition-[filter] duration-300 ${
                              isActive
                                ? "text-foreground"
                                : "text-muted-foreground"
                            } ${
                              getSidebarBlurClasses(blurMode, "translation") || ""
                            } group-hover/item:blur-none`}
                          >
                            {secondary}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    {t("subtitle.noSubtitles")}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </section>
  );
};