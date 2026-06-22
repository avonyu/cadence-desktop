import { useRef, useCallback } from "react";
import { type Caption } from "@/lib/subtitles";
import { usePlayerStore } from "@/stores/player-store";

export function useSingleSentenceLoop(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  captions: Caption[],
) {
  const singleSentenceLoop = usePlayerStore((s) => s.singleSentenceLoop);
  const loopRef = useRef(singleSentenceLoop);
  loopRef.current = singleSentenceLoop;

  const captionsRef = useRef(captions);
  captionsRef.current = captions;

  const loopIndexRef = useRef<number | null>(null);
  const lastCtRef = useRef(0);

  return useCallback(
    (currentTime: number) => {
      if (!loopRef.current) return;

      const caps = captionsRef.current;
      if (caps.length === 0) return;

      const ct = currentTime;
      const delta = ct - lastCtRef.current;
      lastCtRef.current = ct;

      // Detect seek (not natural time progression)
      const isSeek = Math.abs(delta) > 0.1;
      if (isSeek) {
        loopIndexRef.current = null;
      }

      const idx = loopIndexRef.current;

      // If we have a loop target, check if we've reached its end
      if (idx !== null && idx < caps.length) {
        if (ct >= caps[idx].end) {
          const v = videoRef.current;
          if (v) {
            v.currentTime = caps[idx].start;
            lastCtRef.current = caps[idx].start;
          }
        }
        return;
      }

      // No target (just enabled or just navigated) — find caption at current time
      for (let i = caps.length - 1; i >= 0; i--) {
        if (ct >= caps[i].start && ct < caps[i].end + 0.001) {
          loopIndexRef.current = i;
          break;
        }
      }
    },
    [videoRef],
  );
}
