import { useEffect, useRef } from "react";

interface UseKeyboardShortcutsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  goToPrevCaption: () => void;
  goToNextCaption: () => void;
}

export function useKeyboardShortcuts({
  videoRef,
  goToPrevCaption,
  goToNextCaption,
}: UseKeyboardShortcutsOptions) {
  const prevRef = useRef(goToPrevCaption);
  const nextRef = useRef(goToNextCaption);
  prevRef.current = goToPrevCaption;
  nextRef.current = goToNextCaption;

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
        prevRef.current();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [videoRef]);
}
