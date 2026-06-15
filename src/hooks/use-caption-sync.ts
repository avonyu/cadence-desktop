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
  const captionsRef = useRef(captions);
  captionsRef.current = captions;
  const activeCaptionRef = useRef(activeCaption);
  activeCaptionRef.current = activeCaption;

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      const capts = captionsRef.current;
      if (capts.length === 0) return;

      let newIndex: number | null = null;
      let startFrom = lastFoundIndexRef.current;

      if (
        startFrom >= capts.length ||
        (startFrom > 0 && currentTime < capts[startFrom].start)
      ) {
        startFrom = 0;
      }

      for (let i = startFrom; i < capts.length; i++) {
        if (currentTime < capts[i].start) break;
        if (currentTime >= capts[i].start && currentTime < capts[i].end + 0.001) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== null) {
        lastFoundIndexRef.current = newIndex;
      }

      if (newIndex !== activeCaptionRef.current) {
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
    [setActiveCaption, setLastActiveCaption],
  );

  const getDisplayText = useCallback(
    (caption: Caption): { primary: string; secondary: string } => {
      if (swapSubtitles) {
        return { primary: caption.translationHtml, secondary: caption.textHtml };
      }
      return { primary: caption.textHtml, secondary: caption.translationHtml };
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
