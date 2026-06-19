import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { type Caption } from "@/lib/subtitles";
import { processSubtitle } from "@/lib/ai-subtitle";
import { usePlayerStore } from "@/stores/player-store";
import { useActivationStore } from "@/stores/activation-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface UseSubtitleLoaderReturn {
  handleLoadSubtitle: (videoFileName: string | null) => Promise<void>;
}

export function useSubtitleLoader(
  setCaptions: (captions: Caption[]) => void,
): UseSubtitleLoaderReturn {
  const deepseekApiKey = usePlayerStore((s) => s.deepseekApiKey);
  const deepseekModel = usePlayerStore((s) => s.deepseekModel);
  const setAiProcessing = usePlayerStore((s) => s.setAiProcessing);
  const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
  const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
  const { t } = useTranslation();

  const handleLoadSubtitle = useCallback(
    async (videoFileName: string | null) => {
      if (!deepseekApiKey) {
        toast.error(t("ai.noApiKey"));
        return;
      }

      if (import.meta.env.VITE_BUILD_MODE === "commercial") {
        const { activated, canUseFeature } = useActivationStore.getState();
        if (!activated) {
          const allowed = canUseFeature("aiProcessing");
          if (!allowed) {
            toast.error(t("activation.trialExpired"));
            return;
          }
        }
      }

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Subtitle",
            extensions: ["srt", "ass"],
          },
        ],
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

      setAiProcessing("processing");

      try {
        const result = await processSubtitle(
          content,
          videoFileName,
          deepseekApiKey,
          deepseekModel,
        );
        if (result.length > 0) {
          setCaptions(result);
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
      setAiProcessing,
      setActiveCaption,
      setLastActiveCaption,
      setCaptions,
      t,
    ],
  );

  return { handleLoadSubtitle };
}
