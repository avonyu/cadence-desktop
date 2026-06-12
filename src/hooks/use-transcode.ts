import { useState, useCallback } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { type VideoCodecResult } from "@/lib/player-constants";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseTranscodeReturn {
  transcodeState: "idle" | "converting" | "done" | "error";
  transcodeProgress: number;
  transcodeDismissed: boolean;
  setTranscodeDismissed: (dismissed: boolean) => void;
  handleTranscodeAudio: (inputPath: string | null) => Promise<void>;
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
  const [transcodeDismissed, setTranscodeDismissed] = useState(false);
  const { t } = useTranslation();

  const handleTranscodeAudio = useCallback(
    async (inputPath: string | null) => {
      if (!inputPath) return;

      setTranscodeState("converting");
      setTranscodeProgress(0);
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
        console.error("Transcode failed:", error);
        toast.error(
          error instanceof Error ? error.message : t("video.transcodeFailed"),
        );
        setTranscodeState("error");
      } finally {
        unlisten();
      }
    },
    [t, setVideoSrc, setCodecInfo, videoFilePathRef],
  );

  return {
    transcodeState,
    transcodeProgress,
    transcodeDismissed,
    setTranscodeDismissed,
    handleTranscodeAudio,
  };
}
