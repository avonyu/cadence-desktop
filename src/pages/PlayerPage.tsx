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
import { useT } from "@/lib/use-i18n";
import { SubtitleSettingsPopover } from "@/components/player/subtitle-settings-popover";
import { SettingsDialog } from "@/components/player/settings-dialog";

function getSidebarBlurClasses(blurMode: BlurMode, target: "text" | "translation") {
  if (blurMode === "off") return "";
  if (blurMode === "primary" && target === "text") return "blur-[4px]";
  if (blurMode === "secondary" && target === "translation")
    return "blur-[4px]";
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
    theme,
    setActiveCaption,
    toggleSidebar,
  } = usePlayerStore();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const t = useT();
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
            if (
              videoRef.current &&
              videoRef.current.currentTime >= captions[i].start
            )
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
            if (
              videoRef.current &&
              videoRef.current.currentTime >= captions[i].start
            )
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
      className="overflow-hidden grid h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={{
        gridTemplateColumns: sidebarOpen ? "1fr minmax(280px, 430px)" : "1fr",
      }}
    >
      <main className="relative flex min-h-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex min-h-0 flex-1 flex-col items-center px-6 pt-6 pb-0">
          {/* Video Player */}
          <div className="relative mx-auto w-full max-w-[960px] aspect-video overflow-hidden border border-zinc-800 rounded-2xl bg-black flex-shrink-0">
            <VideoPlayer
              src={videoSrc}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Captions Display */}
          <div
            className={`group flex w-full max-w-[64rem] flex-col items-center justify-center py-5 text-center min-h-[9rem] ${
              blurMode !== "off" ? "" : ""
            }`}
          >
            {captions.length > 0 && activeDisplay ? (
              <>
                <p
                  className={`text-2xl font-semibold leading-[1.4] text-[var(--text-primary)] max-w-[64rem] transition-[filter] duration-300 select-none ${
                    blurMode === "primary" || blurMode === "all"
                      ? "blur-[8px] group-hover:blur-0"
                      : ""
                  }`}
                >
                  {activeDisplay.primary}
                </p>
                <p
                  className={`mt-5 text-2xl leading-[1.4] text-[var(--text-secondary)] max-w-[64rem] transition-[filter] duration-300 select-none ${
                    blurMode === "secondary" || blurMode === "all"
                      ? "blur-[8px] group-hover:blur-0"
                      : ""
                  }`}
                >
                  {activeDisplay.secondary}
                </p>
              </>
            ) : (
              <p className="text-lg text-[var(--text-muted)]">
                {t("noSubtitles")}
              </p>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mt-auto z-1 flex h-14 items-center justify-end gap-1 border-t border-[var(--border-color-light)] px-4 bg-[var(--bg-secondary)]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleOpenFile}
                >
                  <FolderOpen size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("openVideo")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleLoadSubtitle}
                >
                  <FileText size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("loadSubtitle")}</TooltipContent>
            </Tooltip>

            <SubtitleSettingsPopover />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={
                    sidebarOpen
                      ? "text-[#8b5cf6]"
                      : "text-zinc-400"
                  }
                  onClick={toggleSidebar}
                >
                  <Subtitles size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("subtitlesSidebar")}</TooltipContent>
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
              <TooltipContent>{t("settings")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </main>

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="flex min-h-0 flex-col bg-[var(--bg-tertiary)]">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-color-light)] px-8">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Subtitles size={20} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                {t("subtitlesList")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
            >
              <X size={20} />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin [scrollbar-color:#4b4b4b_transparent]">
            {captions.length > 0 ? (
              <div className="space-y-2" ref={sidebarRef}>
                {captions.map((caption, index) => {
                  const isActive = index === activeCaption;
                  const ref = isActive ? activeItemRef : null;
                  const { primary, secondary } = getDisplayText(caption);

                  return (
                    <button
                      ref={ref}
                      className={`group/item grid w-full grid-cols-[62px_1fr] gap-1 rounded-md px-0 py-2 text-left transition ${
                        isActive
                          ? "text-[#8b5cf6]"
                          : "text-[var(--text-muted)] hover:bg-[var(--subtitle-hover-bg)] hover:text-[var(--text-secondary)]"
                      }`}
                      key={`${caption.start}-${caption.text}`}
                      onClick={() => handleSeekToCaption(caption)}
                    >
                      <span
                        className={`text-sm font-bold text-center transition cursor-pointer hover:text-[#8b5cf6] ${
                          isActive
                            ? "text-[#8b5cf6]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {formatCaptionTime(caption.start)}
                      </span>
                      <span>
                        <span
                          className={`block text-sm font-bold leading-snug tracking-tight transition-[filter] duration-300 ${
                            getSidebarBlurClasses(blurMode, "text") ||
                            ""
                          } group-hover/item:blur-none`}
                        >
                          {primary}
                        </span>
                        <span
                          className={`mt-2 block text-sm leading-snug tracking-tight transition-[filter] duration-300 ${
                            isActive
                              ? "text-[var(--subtitle-translation-active)]"
                              : "text-[var(--text-muted)]"
                          } ${
                            getSidebarBlurClasses(blurMode, "translation") ||
                            ""
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
                <p className="text-sm text-[var(--text-muted)]">
                  {t("noSubtitles")}
                </p>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Dialogs */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </section>
  );
};