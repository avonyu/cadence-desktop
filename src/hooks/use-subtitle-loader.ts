import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { type Caption, normalizeCaptionLanguages } from "@/lib/subtitles";
import {
  processSubtitle,
  clearCachedSubtitleForVideo,
  getCachedSubtitlePath,
} from "@/lib/ai-subtitle";
import { usePlayerStore } from "@/stores/player-store";
import { useActivationStore } from "@/stores/activation-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseSubtitleLoaderReturn {
  handleLoadSubtitle: (videoFileName: string | null) => Promise<void>;
  handleRegenerateSubtitle: (videoFileName: string | null) => Promise<void>;
  handleClearSubtitleCache: (videoFileName: string | null) => Promise<void>;
}

export function useSubtitleLoader(
  setCaptions: (captions: Caption[]) => void,
): UseSubtitleLoaderReturn {
  const deepseekApiKey = usePlayerStore((s) => s.deepseekApiKey);
  const deepseekModel = usePlayerStore((s) => s.deepseekModel);
  const nativeLanguage = usePlayerStore((s) => s.nativeLanguage);
  const learningLanguage = usePlayerStore((s) => s.learningLanguage);
  const setAiProcessing = usePlayerStore((s) => s.setAiProcessing);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const { t } = useTranslation();

  const canProcess = useCallback((): boolean => {
    if (!deepseekApiKey) {
      toast.error(t("ai.noApiKey"));
      return false;
    }
    if (import.meta.env.VITE_BUILD_MODE === "commercial") {
      const { activated, canUseFeature } = useActivationStore.getState();
      if (!activated && !canUseFeature("aiProcessing")) {
        toast.error(t("activation.trialExpired"));
        return false;
      }
    }
    return true;
  }, [deepseekApiKey, t]);

  const runProcess = useCallback(
    async (
      content: string,
      videoFileName: string | null,
      subtitlePath: string,
      force: boolean,
    ) => {
      setAiProcessing("processing");
      try {
        const result = await processSubtitle(
          content,
          videoFileName,
          deepseekApiKey,
          deepseekModel,
          force,
          subtitlePath,
        );
        if (result.length > 0) {
          const normalized = normalizeCaptionLanguages(result, nativeLanguage, learningLanguage);
          setCaptions(normalized);
          setActiveCaption(null);
          setLastActiveCaption(null);
          setAiProcessing("done");
          setTimeout(() => setAiProcessing("idle"), 2000);
        } else {
          toast.error(t("ai.processFailed"));
          setAiProcessing("idle");
        }
      } catch (error) {
        console.error("AI processing failed:", error);
        toast.error(t("ai.processFailed"));
        setAiProcessing("idle");
      }
    },
    [
      deepseekApiKey,
      deepseekModel,
      nativeLanguage,
      learningLanguage,
      setAiProcessing,
      setActiveCaption,
      setLastActiveCaption,
      setCaptions,
      t,
    ],
  );

  const handleLoadSubtitle = useCallback(
    async (videoFileName: string | null) => {
      if (!canProcess()) return;

      const selected = await open({
        multiple: false,
        filters: [{ name: "Subtitle", extensions: ["srt", "ass"] }],
      });

      if (!selected) return;

      let content: string;
      try {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        content = await readTextFile(selected);
      } catch (error) {
        console.error("Failed to load subtitle file:", error);
        toast.error(t("ai.loadFailed"));
        return;
      }

      await runProcess(content, videoFileName, selected, false);
    },
    [canProcess, runProcess, t],
  );

  const handleRegenerateSubtitle = useCallback(
    async (videoFileName: string | null) => {
      if (!videoFileName) return;
      if (!canProcess()) return;

      const subtitlePath = await getCachedSubtitlePath(videoFileName);
      if (!subtitlePath) {
        toast.error(t("subtitle.noCachedSubtitle"));
        return;
      }

      let content: string;
      try {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        content = await readTextFile(subtitlePath);
      } catch (error) {
        console.error("Failed to read matched subtitle file:", error);
        toast.error(t("subtitle.subtitleFileMissing"));
        return;
      }

      await runProcess(content, videoFileName, subtitlePath, true);
    },
    [canProcess, runProcess, t],
  );

  const handleClearSubtitleCache = useCallback(
    async (videoFileName: string | null) => {
      if (!videoFileName) return;
      try {
        await clearCachedSubtitleForVideo(videoFileName);
        setCaptions([]);
        setActiveCaption(null);
        setLastActiveCaption(null);
        toast.success(t("subtitle.cacheCleared"));
      } catch (error) {
        console.error("Failed to clear subtitle cache:", error);
        toast.error(t("subtitle.cacheClearFailed"));
      }
    },
    [setCaptions, setActiveCaption, setLastActiveCaption, t],
  );

  return {
    handleLoadSubtitle,
    handleRegenerateSubtitle,
    handleClearSubtitleCache,
  };
}
