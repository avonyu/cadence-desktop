import { useCallback, useMemo, useRef } from "react";
import { type Caption } from "@/lib/subtitles";
import { usePlayerStore } from "@/stores/player-store";

interface UseCaptionSyncReturn {
  handleTimeUpdate: (currentTime: number) => void;
  activeCaptionData: Caption | null;
  activeDisplay: { primary: string; secondary: string } | null;
}

export function useCaptionSync(captions: Caption[]): UseCaptionSyncReturn {
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
  const pendingNavigation = usePlayerStore((s) => s.pendingNavigation);
  const setPendingNavigation = usePlayerStore((s) => s.setPendingNavigation);

  const lastFoundIndexRef = useRef(0);
  const lastActiveCaptionRef = useRef<number | null>(null);

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (captions.length === 0) return;

      // If a user-initiated navigation is pending, wait for the seek to
      // settle before allowing time-sync to change activeCaption.
      if (
        pendingNavigation &&
        activeCaption !== null &&
        activeCaption < captions.length
      ) {
        const target = captions[activeCaption];
        if (currentTime >= target.start && currentTime < target.end + 0.001) {
          // Seek complete — currentTime now matches the navigated-to caption.
          setPendingNavigation(false);
          lastFoundIndexRef.current = activeCaption;
          if (activeCaption !== lastActiveCaptionRef.current) {
            lastActiveCaptionRef.current = activeCaption;
            setLastActiveCaption(activeCaption);
          }
          return;
        }
        // Still seeking — don't interfere with navigation.
        return;
      }

      // If activeCaption is still valid for the current time, don't change it.
      if (activeCaption !== null && activeCaption < captions.length) {
        const current = captions[activeCaption];
        if (currentTime >= current.start && currentTime < current.end + 0.001) {
          lastFoundIndexRef.current = activeCaption;
          return;
        }
      }

      let newIndex: number | null = null;
      let startFrom = lastFoundIndexRef.current;

      if (
        startFrom >= captions.length ||
        (startFrom > 0 && currentTime < captions[startFrom].start)
      ) {
        startFrom = 0;
      }

      for (let i = startFrom; i < captions.length; i++) {
        if (currentTime < captions[i].start) break;
        if (
          currentTime >= captions[i].start &&
          currentTime < captions[i].end + 0.001
        ) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== null) {
        lastFoundIndexRef.current = newIndex;
      }

      if (newIndex !== activeCaption) {
        setActiveCaption(newIndex);
      }
      if (newIndex !== null && newIndex !== lastActiveCaptionRef.current) {
        lastActiveCaptionRef.current = newIndex;
        setLastActiveCaption(newIndex);
      }
    },
    [
      captions,
      activeCaption,
      pendingNavigation,
      setActiveCaption,
      setLastActiveCaption,
      setPendingNavigation,
    ],
  );

  const getDisplayText = useCallback(
    (caption: Caption): { primary: string; secondary: string } => {
      if (swapSubtitles) {
        return { primary: caption.translation, secondary: caption.text };
      }
      return { primary: caption.text, secondary: caption.translation };
    },
    [swapSubtitles],
  );

  const activeCaptionData = useMemo(
    () =>
      activeCaption !== null && captions[activeCaption]
        ? captions[activeCaption]
        : null,
    [activeCaption, captions],
  );

  const activeDisplay = useMemo(
    () => (activeCaptionData ? getDisplayText(activeCaptionData) : null),
    [activeCaptionData, getDisplayText],
  );

  return { handleTimeUpdate, activeCaptionData, activeDisplay };
}
