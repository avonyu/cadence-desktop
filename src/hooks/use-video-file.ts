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

const STORAGE_KEY_LAST_VIDEO = "cadence:last-video";

interface UseVideoFileReturn {
  videoSrc: string | null;
  videoFileName: string | null;
  codecInfo: VideoCodecResult | null;
  needsTranscode: boolean;
  setVideoSrc: (src: string) => void;
  setCodecInfo: (info: VideoCodecResult | null) => void;
  captions: Caption[];
  setCaptions: (captions: Caption[]) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoFilePathRef: React.RefObject<string | null>;
  handleOpenFile: () => Promise<void>;
  loadLastVideo: () => Promise<void>;
}

export function useVideoFile(): UseVideoFileReturn {
  const { t } = useTranslation();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [codecInfo, setCodecInfo] = useState<VideoCodecResult | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [needsTranscode, setNeedsTranscode] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFilePathRef = useRef<string | null>(null);

  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);

  // Shared logic for loading a video by file path
  const loadVideoByPath = useCallback(
    async (filePath: string) => {
      const converted = convertFileSrc(filePath);
      setVideoSrc(converted);
      videoFilePathRef.current = filePath;
      const fileName = filePath.split(/[\\/]/).pop() || filePath;
      setVideoFileName(fileName);

      setCaptions([]);
      setActiveCaption(null);
      setLastActiveCaption(null);
      setNeedsTranscode(false);

      // Persist as last-opened video
      try {
        localStorage.setItem(STORAGE_KEY_LAST_VIDEO, filePath);
      } catch {
        /* localStorage may be unavailable */
      }

      try {
        const result = await invoke<VideoCodecResult>("detect_video_codecs", {
          filePath,
        });
        setCodecInfo(result);
        if (result.audio && isAudioCodecUnsupported(result.audio.codec_name)) {
          setNeedsTranscode(true);
        }
      } catch (err) {
        console.error("[useVideoFile] codec detection failed:", err);
        setCodecInfo(null);
      }

      const cached = await getSubtitlesForVideo(fileName);
      if (cached && cached.length > 0) {
        setCaptions(cached);
      }
    },
    [setActiveCaption, setLastActiveCaption],
  );

  const handleOpenFile = useCallback(async () => {
    try {
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
        await loadVideoByPath(selected);
      }
    } catch (err) {
      console.error("[useVideoFile] Failed to open file:", err);
      toast.error(
        err instanceof Error ? err.message : t("video.fileDialogError"),
      );
    }
  }, [loadVideoByPath, t]);

  // Auto-load the last-opened video on mount
  const loadLastVideo = useCallback(async () => {
    try {
      const lastPath = localStorage.getItem(STORAGE_KEY_LAST_VIDEO);
      if (!lastPath) return;

      const exists = await invoke<boolean>("check_file_exists", {
        filePath: lastPath,
      });
      if (!exists) {
        console.debug("[useVideoFile] last video no longer exists:", lastPath);
        localStorage.removeItem(STORAGE_KEY_LAST_VIDEO);
        return;
      }

      console.debug("[useVideoFile] auto-loading last video:", lastPath);
      await loadVideoByPath(lastPath);
    } catch (err) {
      console.error("[useVideoFile] Failed to load last video:", err);
    }
  }, [loadVideoByPath]);

  return {
    videoSrc,
    videoFileName,
    codecInfo,
    needsTranscode,
    setVideoSrc,
    setCodecInfo,
    captions,
    setCaptions,
    videoRef,
    videoFilePathRef,
    handleOpenFile,
    loadLastVideo,
  };
}
