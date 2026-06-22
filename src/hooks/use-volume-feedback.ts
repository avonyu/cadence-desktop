import { useEffect, useState, useCallback, useRef } from "react";

const OSD_TIMEOUT = 1200;

interface VolumeFeedback {
  volume: number;
  muted: boolean;
  visible: boolean;
}

export function useVolumeFeedback(
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [state, setState] = useState<VolumeFeedback>({
    volume: 1,
    muted: false,
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((s) => ({
      volume: videoRef.current?.volume ?? s.volume,
      muted: videoRef.current?.muted ?? s.muted,
      visible: true,
    }));
    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, visible: false }));
    }, OSD_TIMEOUT);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVolumeChange = () => show();
    video.addEventListener("volumechange", onVolumeChange);
    return () => video.removeEventListener("volumechange", onVolumeChange);
  }, [videoRef, show]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return state;
}
