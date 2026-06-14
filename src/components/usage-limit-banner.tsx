import { useTranslation } from "react-i18next";
import { useActivationStore } from "@/stores/activation-store";
import { getWeekStart } from "@/lib/week-utils";
import { AlertTriangle } from "lucide-react";

export function UsageLimitBanner() {
  const { t } = useTranslation();
  const activated = useActivationStore((s) => s.activated);
  const usage = useActivationStore((s) => s.usage);
  const getLimit = useActivationStore((s) => s.getLimit);

  if (import.meta.env.VITE_BUILD_MODE !== "commercial" || activated) return null;

  const currentWeek = getWeekStart();
  const aiLimit = getLimit("aiProcessing");
  const aiRemaining = aiLimit - (usage["aiProcessing"]?.weekStart === currentWeek ? usage["aiProcessing"].count : 0);
  const transcodeLimit = getLimit("transcoding");
  const transcodeRemaining = transcodeLimit - (usage["transcoding"]?.weekStart === currentWeek ? usage["transcoding"].count : 0);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex-shrink-0">
      <AlertTriangle size={12} className="shrink-0" />
      <span>
        {t("activation.aiWeeklyLimit")}: {Math.max(0, aiRemaining)}/{aiLimit}{" "}
        {t("activation.transcodeWeeklyLimit")}: {Math.max(0, transcodeRemaining)}/{transcodeLimit}
      </span>
    </div>
  );
}
