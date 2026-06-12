import { useCallback, useMemo, useRef } from "react";
import { type Caption } from "@/lib/subtitles";
import { usePlayerStore } from "@/stores/player-store";

interface UseCaptionSyncReturn {
  handleTimeUpdate: (currentTime: number) => void;
  activeCaptionData: Caption | null;
  activeDisplay: { primary: string; secondary: string } | null;
}

export function useCaptionSync(
  captions: Caption[],
): UseCaptionSyncReturn {
  const activeCaption = usePlayerStore((s) => s.activeCaption);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);

  const lastFoundIndexRef = useRef(0);
  const lastActiveCaptionRef = useRef<number | null>(null);

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (captions.length === 0) return;

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
        if (currentTime >= captions[i].start && currentTime < captions[i].end + 0.001) {
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
      if (
        newIndex !== null &&
        newIndex !== lastActiveCaptionRef.current
      ) {
        lastActiveCaptionRef.current = newIndex;
        setLastActiveCaption(newIndex);
      }
    },
    [captions, activeCaption, setActiveCaption, setLastActiveCaption],
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
