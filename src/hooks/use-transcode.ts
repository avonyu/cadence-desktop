import { useState, useCallback, useRef, useEffect } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type VideoCodecResult } from "@/lib/player-constants";
import { useActivationStore } from "@/stores/activation-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseTranscodeReturn {
  transcodeState: "idle" | "converting" | "done" | "error";
  transcodeProgress: number;
  handleTranscodeAudio: (inputPath: string | null, auto?: boolean) => Promise<void>;
  handleCancelTranscode: () => Promise<void>;
  resetTranscode: () => void;
}

export function useTranscode(
  setVideoSrc: (src: string) => void,
  setCodecInfo: (info: VideoCodecResult | null) => void,
  videoFilePathRef: React.RefObject<string | null>,
  videoRef?: React.RefObject<HTMLVideoElement | null>,
): UseTranscodeReturn {
  const [transcodeState, setTranscodeState] = useState<
    "idle" | "converting" | "done" | "error"
  >("idle");
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const cancelledRef = useRef(false);
  const seekToRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const isAutoRef = useRef(false);
  const { t } = useTranslation();

  const resetTranscode = useCallback(() => {
    setTranscodeState("idle");
    setTranscodeProgress(0);
    cancelledRef.current = false;
    seekToRef.current = null;
    wasPlayingRef.current = false;
  }, []);

  const handleCancelTranscode = useCallback(async () => {
    cancelledRef.current = true;
    try {
      await invoke("cancel_transcode");
    } catch {
      // process already ended or no active transcode
    }
  }, []);

  useEffect(() => {
    if (transcodeState !== "done" || seekToRef.current == null || !videoRef?.current) return;

    const video = videoRef.current;
    let cancelled = false;

    const applySeek = () => {
      if (cancelled) return;
      if (video.readyState >= 1) {
        video.currentTime = seekToRef.current!;
        seekToRef.current = null;
        if (wasPlayingRef.current) {
          video.play().catch(() => {});
        }
      } else {
        requestAnimationFrame(applySeek);
      }
    };

    applySeek();

    return () => {
      cancelled = true;
    };
  }, [transcodeState, videoRef]);

  const handleTranscodeAudio = useCallback(
    async (inputPath: string | null, auto = false) => {
      if (!inputPath) return;

      if (import.meta.env.VITE_BUILD_MODE === "commercial") {
        const { activated, canUseFeature } = useActivationStore.getState();
        if (!activated) {
          const allowed = canUseFeature("transcoding");
          if (!allowed) {
            if (!auto) toast.error(t("activation.trialExpired"));
            return;
          }
        }
      }

      setTranscodeState("converting");
      setTranscodeProgress(0);
      cancelledRef.current = false;
      isAutoRef.current = auto;

      if (videoRef?.current) {
        seekToRef.current = videoRef.current.currentTime;
        wasPlayingRef.current = !videoRef.current.paused;
      }

      if (!auto) {
        toast.warning(t("video.transcodeDoNotClose"));
      }

      const unlisten = await listen<number>("transcode-progress", (event) => {
        setTranscodeProgress(event.payload);
      });

      try {
        const outputPath = await invoke<string>("transcode_audio", {
          inputPath,
        });
        setVideoSrc(convertFileSrc(outputPath));
        videoFilePathRef.current = outputPath;
        setTranscodeState("done");
        setTranscodeProgress(100);
        const result = await invoke<VideoCodecResult>("detect_video_codecs", {
          filePath: outputPath,
        });
        setCodecInfo(result);
        if (!auto) {
          toast.success(t("video.transcodeSuccess"));
        }
      } catch (error) {
        seekToRef.current = null;
        if (cancelledRef.current) {
          setTranscodeState("idle");
          setTranscodeProgress(0);
          if (!auto) toast(t("video.transcodeCancelled"));
        } else {
          console.error("Transcode failed:", error);
          if (!auto) {
            toast.error(
              error instanceof Error ? error.message : t("video.transcodeFailed"),
            );
          }
          setTranscodeState("error");
        }
      } finally {
        unlisten();
      }
    },
    [t, setVideoSrc, setCodecInfo, videoFilePathRef, videoRef],
  );

  return {
    transcodeState,
    transcodeProgress,
    handleTranscodeAudio,
    handleCancelTranscode,
    resetTranscode,
  };
}
