import { useEffect, useRef } from "react";
import { toggleMediaPlayback } from "@/lib/media-playback";

interface UseKeyboardShortcutsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  goToPrevCaption: () => void;
  goToNextCaption: () => void;
  toggleSingleSentenceLoop: () => void;
}

export function useKeyboardShortcuts({
  videoRef,
  goToPrevCaption,
  goToNextCaption,
  toggleSingleSentenceLoop,
}: UseKeyboardShortcutsOptions) {
  const prevRef = useRef(goToPrevCaption);
  const nextRef = useRef(goToNextCaption);
  const loopRef = useRef(toggleSingleSentenceLoop);
  prevRef.current = goToPrevCaption;
  nextRef.current = goToNextCaption;
  loopRef.current = toggleSingleSentenceLoop;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === " ") {
        if (!isInput) {
          e.preventDefault();
          const video = videoRef.current;
          if (video) {
            toggleMediaPlayback(video).catch(() => {});
          }
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevRef.current();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextRef.current();
      } else if (e.key === "l" || e.key === "L") {
        if (!isInput) {
          e.preventDefault();
          loopRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [videoRef]);
}
