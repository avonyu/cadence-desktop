import { useTranslation } from "react-i18next";
import { useActivationStore } from "@/stores/activation-store";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function UsageLimitBanner() {
  const { t } = useTranslation();
  const activated = useActivationStore((s) => s.activated);
  const trialActive = useActivationStore((s) => s.trialActive);
  const trialDaysRemaining = useActivationStore((s) => s.trialDaysRemaining);

  if (import.meta.env.VITE_BUILD_MODE !== "commercial" || activated)
    return null;

  if (trialActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 flex-shrink-0">
        <CheckCircle size={12} className="shrink-0" />
        <span>{t("activation.trialBanner", { days: trialDaysRemaining })}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex-shrink-0">
      <AlertTriangle size={12} className="shrink-0" />
      <span>{t("activation.trialExpiredBanner")}</span>
    </div>
  );
}
