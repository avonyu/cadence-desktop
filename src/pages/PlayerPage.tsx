import { VideoPlayer } from "@/components/player";
import { FolderOpen, Subtitles, X, FileText } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useRef, useState, useCallback, useEffect } from "react";
import { parseSubtitles, type Caption } from "@/lib/subtitles";

export const PlayerPage = () => {
  const [activeCaption, setActiveCaption] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
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

  // Find the active caption index based on video current time
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

      // If no exact match, find the closest previous caption
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
    [captions, activeCaption],
  );

  // Seek video to caption time
  const handleSeekToCaption = useCallback((caption: Caption) => {
    if (videoRef.current) {
      videoRef.current.currentTime = caption.start;
      videoRef.current.play?.();
    }
  }, []);

  // Auto-scroll sidebar to active caption
  useEffect(() => {
    if (activeItemRef.current && sidebarRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeCaption]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space = toggle play/pause (always available)
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
  }, [captions, activeCaption, handleSeekToCaption]);

  return (
    <section
      className="overflow-hidden grid h-screen bg-[#0a0a0a] text-zinc-100"
      style={{
        gridTemplateColumns: sidebarOpen ? "1fr minmax(280px, 430px)" : "1fr",
      }}
    >
      <main className="relative flex min-h-0 flex-col border-r border-white/10 bg-[#0b0b0b]">
        <div className="min-h-0 flex-1 px-3 py-4">
          {/* Video Player */}
          <div className="max-h-140 p-4 relative mx-auto aspect-video min-w-200 overflow-hidden bg-black shadow-2xl shadow-black/60">
            <VideoPlayer
              src={videoSrc}
              videoRef={videoRef}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Captions */}
          <div className="h-0.3 mx-auto flex min-h-37 w-full flex-col items-center justify-center text-center">
            {captions.length > 0 &&
            activeCaption !== null &&
            captions[activeCaption] ? (
              <>
                <p className="max-w-5xl text-2xl font-semibold leading-tight tracking-normal text-zinc-200">
                  {captions[activeCaption].text}
                </p>
                <p className="mt-5 text-2xl leading-tight tracking-normal text-zinc-400">
                  {captions[activeCaption].translation}
                </p>
              </>
            ) : (
              <p className="text-lg text-zinc-600">No subtitles loaded</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-auto z-100 flex h-14 items-center justify-end gap-1 border-t border-white/8 px-4 bg-[#0b0b0b]">
          <button
            className="flex size-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
            onClick={handleOpenFile}
            title="Open Video"
          >
            <FolderOpen size={18} />
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
            onClick={handleLoadSubtitle}
            title="Load Subtitle"
          >
            <FileText size={18} />
          </button>
          <button
            className={`flex size-9 items-center justify-center rounded-md transition hover:bg-white/5 ${
              sidebarOpen
                ? "text-[#f5cc64]"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
            onClick={() => setSidebarOpen((open) => !open)}
            title="Subtitles"
          >
            <Subtitles size={18} />
          </button>
          {/*<button
            className="flex size-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
            title="Settings"
          >
            <Settings size={18} />
          </button>*/}
        </div>
      </main>

      {sidebarOpen && (
        <aside className="relative flex min-h-0 flex-col bg-[#101010]">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 px-8">
            <div className="flex items-center gap-2 text-zinc-300">
              <Subtitles size={20} />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                Subtitles
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex size-8 items-center justify-center rounded-md border border-white/20 text-zinc-500 transition hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:#4b4b4b_transparent] scrollbar-thin">
            {captions.length > 0 ? (
              <div className="space-y-2" ref={sidebarRef}>
                {captions.map((caption, index) => {
                  const isActive = index === activeCaption;
                  const ref = isActive ? activeItemRef : null;

                  return (
                    <button
                      ref={ref}
                      className={`grid w-full grid-cols-[62px_1fr] gap-1 rounded-md px-0 py-2 text-left transition ${
                        isActive
                          ? "text-[#f5cc64]"
                          : "text-zinc-500 hover:bg-white/3 hover:text-zinc-300"
                      }`}
                      key={`${caption.time}-${caption.text}`}
                      onClick={() => handleSeekToCaption(caption)}
                    >
                      <span
                        className={`text-md font-bold text-center cursor-pointer hover:text-[#f5cc64] transition ${
                          isActive ? "text-[#f5cc64]" : "text-zinc-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeekToCaption(caption);
                        }}
                      >
                        {caption.time}
                      </span>
                      <span>
                        <span className="block text-md font-bold leading-snug tracking-normal">
                          {caption.text}
                        </span>
                        <span
                          className={`mt-2 block text-md leading-snug tracking-normal ${
                            isActive ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          {caption.translation}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-600">No subtitles loaded</p>
              </div>
            )}
          </div>
        </aside>
      )}
    </section>
  );
};
