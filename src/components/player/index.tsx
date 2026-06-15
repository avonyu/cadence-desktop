import "@/styles/player.css";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Video as VideoIcon } from "lucide-react";
import { createPlayer, videoFeatures } from "@videojs/react";
import { VideoSkin, Video } from "@videojs/react/video";
import {
  getContainedVideoSize,
  getFittedAspectRatioSize,
  type VideoSize,
} from "@/lib/video-size";

export { SubtitleMask } from "./subtitle-mask";

export const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  src: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children?: ReactNode;
}

export const VideoPlayer = ({
  src,
  onTimeUpdate,
  videoRef,
  children,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<VideoSize | null>(null);
  const [videoSize, setVideoSize] = useState<VideoSize | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  const rafRef = useRef<number | null>(null);
  const lastCallRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;

    let running = true;

    const loop = () => {
      if (!running) return;
      const video = videoRef?.current;
      if (video && !video.paused) {
        const now = performance.now();
        if (now - lastCallRef.current >= 100) {
          lastCallRef.current = now;
          onTimeUpdateRef.current?.(video.currentTime);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, videoRef]);

  useEffect(() => {
    setVideoSize(null);
    setIsPlaying(false);
    lastCallRef.current = 0;
  }, [src]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateContainerSize = () => {
      const { width, height } = container.getBoundingClientRect();
      setContainerSize({ width, height });
    };

    updateContainerSize();
    const observer = new ResizeObserver(updateContainerSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const playerSize = containerSize
    ? videoSize
      ? getContainedVideoSize(
          videoSize.width,
          videoSize.height,
          containerSize.width,
          containerSize.height,
        )
      : getFittedAspectRatioSize(
          16,
          9,
          containerSize.width,
          containerSize.height,
        )
    : null;

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <VideoSkin
        className="video-player-surface overflow-hidden"
        style={
          playerSize
            ? {
                width: playerSize.width,
                height: playerSize.height,
              }
            : undefined
        }
      >
          <Video
            ref={videoRef}
            className="h-full w-full object-contain"
            src={src ?? undefined}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => {
              const target = e.target as HTMLVideoElement;
              setVideoSize({
                width: target.videoWidth,
                height: target.videoHeight,
              });
            }}
          />
        {!src && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <VideoIcon className="size-10 text-zinc-600" strokeWidth={1} />
            <p className="text-sm font-medium text-zinc-600">No video loaded</p>
          </div>
        )}
        {children}
      </VideoSkin>
    </div>
  );
};
