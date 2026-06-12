import { useEffect } from "react";

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
        goToPrevCaption();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextCaption();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [videoRef, goToPrevCaption, goToNextCaption]);
}
