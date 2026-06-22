import { useEffect, useState } from "react";

interface UseVideoEventsReturn {
  currentVideoTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentVideoTime: (time: number) => void;
}

export function useVideoEvents(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  videoSrc: string | null,
): UseVideoEventsReturn {
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onDurationChange = () => {
      if (isFinite(video.duration)) setDuration(video.duration);
    };
    const onRateChange = () => setPlaybackRate(video.playbackRate);
    const onError = () => {
      const err = video.error;
      console.error("[useVideoEvents] video error:", {
        code: err?.code,
        message: err?.message,
        src: video.src,
        networkState: video.networkState,
        readyState: video.readyState,
      });
    };
    const onStalled = () => {
      console.warn("[useVideoEvents] stalled:", {
        src: video.src,
        networkState: video.networkState,
        readyState: video.readyState,
      });
    };
    const onWaiting = () => {
      console.debug("[useVideoEvents] waiting:", {
        src: video.src,
        networkState: video.networkState,
        readyState: video.readyState,
      });
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("error", onError);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("waiting", onWaiting);

    if (isFinite(video.duration)) setDuration(video.duration);
    setIsPlaying(!video.paused);
    setPlaybackRate(video.playbackRate);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("error", onError);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("waiting", onWaiting);
    };
  }, [videoSrc, videoRef]);

  return {
    currentVideoTime,
    duration,
    isPlaying,
    playbackRate,
    setIsPlaying,
    setDuration,
    setPlaybackRate,
    setCurrentVideoTime,
  };
}
