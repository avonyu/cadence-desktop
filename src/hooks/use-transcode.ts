import { useState, useCallback, useRef } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type VideoCodecResult } from "@/lib/player-constants";
import { useActivationStore } from "@/stores/activation-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseTranscodeReturn {
  transcodeState: "idle" | "converting" | "done" | "error";
  transcodeProgress: number;
  handleTranscodeAudio: (inputPath: string | null) => Promise<void>;
  handleCancelTranscode: () => Promise<void>;
  resetTranscode: () => void;
}

export function useTranscode(
  setVideoSrc: (src: string) => void,
  setCodecInfo: (info: VideoCodecResult | null) => void,
  videoFilePathRef: React.RefObject<string | null>,
): UseTranscodeReturn {
  const [transcodeState, setTranscodeState] = useState<
    "idle" | "converting" | "done" | "error"
  >("idle");
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const cancelledRef = useRef(false);
  const { t } = useTranslation();

  const resetTranscode = useCallback(() => {
    setTranscodeState("idle");
    setTranscodeProgress(0);
    cancelledRef.current = false;
  }, []);

  const handleCancelTranscode = useCallback(async () => {
    cancelledRef.current = true;
    try {
      await invoke("cancel_transcode");
    } catch {
      // process already ended or no active transcode
    }
  }, []);

  const handleTranscodeAudio = useCallback(
    async (inputPath: string | null) => {
      if (!inputPath) return;

      if (import.meta.env.VITE_BUILD_MODE === "commercial") {
        const { activated, checkAndRecord } = useActivationStore.getState();
        if (!activated) {
          const allowed = await checkAndRecord("transcoding");
          if (!allowed) {
            toast.error(t("activation.transcodeWeeklyLimitReached"));
            return;
          }
        }
      }

      setTranscodeState("converting");
      setTranscodeProgress(0);
      cancelledRef.current = false;
      toast.warning(t("video.transcodeDoNotClose"));

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
        toast.success(t("video.transcodeSuccess"));
      } catch (error) {
        if (cancelledRef.current) {
          setTranscodeState("idle");
          setTranscodeProgress(0);
          toast(t("video.transcodeCancelled"));
        } else {
          console.error("Transcode failed:", error);
          toast.error(
            error instanceof Error ? error.message : t("video.transcodeFailed"),
          );
          setTranscodeState("error");
        }
      } finally {
        unlisten();
      }
    },
    [t, setVideoSrc, setCodecInfo, videoFilePathRef],
  );

  return {
    transcodeState,
    transcodeProgress,
    handleTranscodeAudio,
    handleCancelTranscode,
    resetTranscode,
  };
}
