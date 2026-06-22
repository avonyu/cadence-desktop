import { useEffect, useRef } from "react";
import { toggleMediaPlayback } from "@/lib/media-playback";

interface UseKeyboardShortcutsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  goToPrevCaption: () => void;
  goToNextCaption: () => void;
  toggleSingleSentenceLoop: () => void;
  toggleFullscreen: () => void;
  volumeUp: () => void;
  volumeDown: () => void;
  toggleMute: () => void;
  speedUp: () => void;
  speedDown: () => void;
  toggleSidebar: () => void;
  cycleBlurMode: () => void;
  toggleSubtitleMask: () => void;
  toggleSwap: () => void;
}

export function useKeyboardShortcuts({
  videoRef,
  goToPrevCaption,
  goToNextCaption,
  toggleSingleSentenceLoop,
  toggleFullscreen,
  volumeUp,
  volumeDown,
  toggleMute,
  speedUp,
  speedDown,
  toggleSidebar,
  cycleBlurMode,
  toggleSubtitleMask,
  toggleSwap,
}: UseKeyboardShortcutsOptions) {
  const prevRef = useRef(goToPrevCaption);
  const nextRef = useRef(goToNextCaption);
  const loopRef = useRef(toggleSingleSentenceLoop);
  const fullscreenRef = useRef(toggleFullscreen);
  const volUpRef = useRef(volumeUp);
  const volDownRef = useRef(volumeDown);
  const muteRef = useRef(toggleMute);
  const speedUpRef = useRef(speedUp);
  const speedDownRef = useRef(speedDown);
  const sidebarRef = useRef(toggleSidebar);
  const blurRef = useRef(cycleBlurMode);
  const maskRef = useRef(toggleSubtitleMask);
  const swapRef = useRef(toggleSwap);

  prevRef.current = goToPrevCaption;
  nextRef.current = goToNextCaption;
  loopRef.current = toggleSingleSentenceLoop;
  fullscreenRef.current = toggleFullscreen;
  volUpRef.current = volumeUp;
  volDownRef.current = volumeDown;
  muteRef.current = toggleMute;
  speedUpRef.current = speedUp;
  speedDownRef.current = speedDown;
  sidebarRef.current = toggleSidebar;
  blurRef.current = cycleBlurMode;
  maskRef.current = toggleSubtitleMask;
  swapRef.current = toggleSwap;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === " ") {
        if (isInput) return;
        e.preventDefault();
        const video = videoRef.current;
        if (video) {
          toggleMediaPlayback(video).catch(() => {});
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevRef.current();
          return;
        case "ArrowRight":
          e.preventDefault();
          nextRef.current();
          return;
        case "ArrowUp":
          e.preventDefault();
          volUpRef.current();
          return;
        case "ArrowDown":
          e.preventDefault();
          volDownRef.current();
          return;
      }

      if (isInput) return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          fullscreenRef.current();
          break;
        case "m":
          e.preventDefault();
          muteRef.current();
          break;
        case "l":
          e.preventDefault();
          loopRef.current();
          break;
        case "s":
          e.preventDefault();
          sidebarRef.current();
          break;
        case "b":
          e.preventDefault();
          blurRef.current();
          break;
        case "r":
          e.preventDefault();
          maskRef.current();
          break;
        case "t":
          e.preventDefault();
          swapRef.current();
          break;
        case ",":
        case "<":
          e.preventDefault();
          speedDownRef.current();
          break;
        case ".":
        case ">":
          e.preventDefault();
          speedUpRef.current();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [videoRef]);
}
