import { useCallback } from "react";
import { type Caption } from "@/lib/subtitles";
import {
  getNextCaptionIndex,
  getPreviousCaptionIndex,
} from "@/lib/caption-navigation";
import { usePlayerStore } from "@/stores/player-store";

interface UseCaptionNavigationReturn {
  goToPrevCaption: () => void;
  goToNextCaption: () => void;
  handleSeekToCaption: (caption: Caption) => void;
}

export function useCaptionNavigation(
  captions: Caption[],
  videoRef: React.RefObject<HTMLVideoElement | null>,
): UseCaptionNavigationReturn {
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const setScrollTracking = usePlayerStore((s) => s.setScrollTracking);

  const handleSeekToCaption = useCallback(
    (caption: Caption) => {
      if (videoRef.current) {
        videoRef.current.currentTime = caption.start;
      }
    },
    [videoRef],
  );

  const goToPrevCaption = useCallback(() => {
    if (captions.length === 0) return;
    const prev = getPreviousCaptionIndex(
      captions,
      videoRef.current?.currentTime ?? 0,
      activeCaption,
    );
    if (prev === null) return;
    setScrollTracking(true);
    setActiveCaption(prev);
    setLastActiveCaption(prev);
    handleSeekToCaption(captions[prev]);
  }, [
    captions,
    activeCaption,
    handleSeekToCaption,
    setScrollTracking,
    setActiveCaption,
    setLastActiveCaption,
    videoRef,
  ]);

  const goToNextCaption = useCallback(() => {
    if (captions.length === 0) return;
    const next = getNextCaptionIndex(
      captions,
      videoRef.current?.currentTime ?? 0,
      activeCaption,
    );
    if (next === null) return;
    setScrollTracking(true);
    setActiveCaption(next);
    setLastActiveCaption(next);
    handleSeekToCaption(captions[next]);
  }, [
    captions,
    activeCaption,
    handleSeekToCaption,
    setScrollTracking,
    setActiveCaption,
    setLastActiveCaption,
    videoRef,
  ]);

  return { goToPrevCaption, goToNextCaption, handleSeekToCaption };
}
