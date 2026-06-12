import { useCallback, useMemo } from "react";
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

  const handleTimeUpdate = useCallback(
    (currentTime: number) => {
      if (captions.length === 0) return;

      let newIndex: number | null = null;
      for (let i = 0; i < captions.length; i++) {
        if (currentTime >= captions[i].start && currentTime < captions[i].end + 0.001) {
          newIndex = i;
          break;
        }
      }

      if (newIndex !== activeCaption) {
        setActiveCaption(newIndex);
      }
      if (newIndex !== null) {
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
