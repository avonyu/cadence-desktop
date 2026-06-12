import { useRef, useState, useCallback } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { type Caption } from "@/lib/subtitles";
import { getSubtitlesForVideo } from "@/lib/ai-subtitle";
import {
  type VideoCodecResult,
  isAudioCodecUnsupported,
} from "@/lib/player-constants";
import { usePlayerStore } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseVideoFileReturn {
  videoSrc: string | null;
  videoFileName: string | null;
  codecInfo: VideoCodecResult | null;
  setVideoSrc: (src: string) => void;
  setCodecInfo: (info: VideoCodecResult | null) => void;
  captions: Caption[];
  setCaptions: (captions: Caption[]) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoFilePathRef: React.RefObject<string | null>;
  handleOpenFile: () => Promise<void>;
}

export function useVideoFile(): UseVideoFileReturn {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [codecInfo, setCodecInfo] = useState<VideoCodecResult | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFilePathRef = useRef<string | null>(null);

  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const { t } = useTranslation();

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Video",
          extensions: ["mp4", "webm", "mkv", "avi", "mov", "flv", "wmv"],
        },
      ],
    });
    if (selected) {
      setVideoSrc(convertFileSrc(selected));
      videoFilePathRef.current = selected;
      const fileName = selected.split(/[\\/]/).pop() || selected;
      setVideoFileName(fileName);

      setCaptions([]);
      setActiveCaption(null);
      setLastActiveCaption(null);

      try {
        const result = await invoke<VideoCodecResult>("detect_video_codecs", {
          filePath: selected,
        });
        setCodecInfo(result);
        if (result.audio && isAudioCodecUnsupported(result.audio.codec_name)) {
          const label = result.audio.codec_name.toUpperCase();
          toast.warning(t("video.codecWarning", { codec: label }), {
            duration: 8000,
          });
        }
      } catch {
        setCodecInfo(null);
      }

      const tools = await invoke<{
        ffmpeg: boolean;
        ffprobe: boolean;
        ffplay: boolean;
      }>("check_ffmpeg_tools");
      if (!tools.ffmpeg) {
        toast.warning(t("video.ffmpegMissing"), { duration: 6000 });
      }
      if (!tools.ffprobe) {
        toast.warning(t("video.ffprobeMissing"), { duration: 6000 });
      }

      const cached = await getSubtitlesForVideo(fileName);
      if (cached && cached.length > 0) {
        setCaptions(cached);
      }
    }
  }, [setActiveCaption, setLastActiveCaption, t]);

  return {
    videoSrc,
    videoFileName,
    codecInfo,
    setVideoSrc,
    setCodecInfo,
    captions,
    setCaptions,
    videoRef,
    videoFilePathRef,
    handleOpenFile,
  };
}
