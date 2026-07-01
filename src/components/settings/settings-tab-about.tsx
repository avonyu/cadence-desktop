import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { ChevronRight, Download, Key, Loader2, X } from "lucide-react";
import type { TFunction } from "i18next";
import githubBlack from "@/assets/GitHub_Invertocat_Black.svg";
import githubWhite from "@/assets/GitHub_Invertocat_White.svg";

interface SettingsTabAboutProps {
  updateStatus: string;
  downloading: boolean;
  downloadProgress: number;
  installed: boolean;
  hasUpdate: boolean;
  activationCode: string;
  activating: boolean;
  activateError: boolean;
  activated: boolean;
  trialActive: boolean;
  trialDaysRemaining: number;
  buildMode: string;
  appVersion: string;
  setActivationCode: (v: string) => void;
  setActivateError: (v: boolean) => void;
  onCheckUpdate: () => void;
  onDownloadAndInstall: () => void;
  onActivate: () => void;
  t: TFunction;
}

export function SettingsTabAbout({
  updateStatus,
  downloading,
  downloadProgress,
  installed,
  hasUpdate,
  activationCode,
  activating,
  activateError,
  activated,
  trialActive,
  trialDaysRemaining,
  buildMode,
  appVersion,
  setActivationCode,
  setActivateError,
  onCheckUpdate,
  onDownloadAndInstall,
  onActivate,
  t,
}: SettingsTabAboutProps) {
  const { theme } = useTheme();

  const resolvedDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, [theme]);

  return (
    <div className="flex flex-col">
      <button
        className="flex w-full items-center justify-between py-3 text-sm text-muted-foreground transition hover:bg-accent rounded-md"
        onClick={onCheckUpdate}
        disabled={downloading}
      >
        <span>{t("settings.checkUpdate")}</span>
        <span className="flex items-center gap-2">
          <span
            className={`text-xs ${
              hasUpdate
                ? "text-blue-500"
                : updateStatus === t("settings.upToDate")
                  ? "text-green-500"
                  : updateStatus === t("settings.checking")
                    ? "text-muted-foreground"
                    : updateStatus
                      ? "text-destructive"
                      : "text-muted-foreground"
            }`}
          >
            {updateStatus}
          </span>
          <ChevronRight className="text-muted-foreground" size={16} />
        </span>
      </button>

      {hasUpdate && !downloading && !installed && (
        <Button className="w-full mt-2" onClick={onDownloadAndInstall}>
          <Download className="mr-2" size={16} />
          {t("settings.downloadInstall")}
        </Button>
      )}

      {downloading && (
        <div className="mt-3 flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            {downloadProgress >= 0
              ? t("settings.downloading", { progress: downloadProgress })
              : t("settings.downloading", { progress: "?" })}
          </span>
          <Progress
            value={downloadProgress >= 0 ? downloadProgress : 30}
            className={downloadProgress < 0 ? "animate-pulse" : undefined}
          />
        </div>
      )}

      <Separator className="mt-3" />

      {buildMode === "commercial" && !activated && (
        <div className="py-3 space-y-2">
          <label className="block text-xs text-muted-foreground">{t("activation.codePlaceholder")}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={activationCode}
              onChange={(e) => {
                setActivationCode(e.target.value.toUpperCase());
                setActivateError(false);
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              disabled={activating}
              className={`flex-1 rounded-md border bg-transparent px-3 py-2 text-sm font-mono outline-none transition
                ${
                  activateError
                    ? "border-red-500 focus-visible:ring-red-500/50"
                    : "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                }`}
            />
            <Button
              className="h-auto py-2"
              onClick={onActivate}
              disabled={activating || activationCode.trim().length < 19}
            >
              {activating ? <Loader2 className="animate-spin" size={14} /> : <Key size={14} />}
              <span className="ml-1.5">{activating ? t("activation.activating") : t("activation.activateButton")}</span>
            </Button>
          </div>
          {activateError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <X size={12} />
              {t("activation.invalidCode")}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between py-3">
        <span className="text-xs text-muted-foreground">
          {t("settings.version")} {appVersion}
          {buildMode === "commercial" &&
            (activated ? (
              <span className="ml-2 inline-flex items-center rounded-sm bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">
                {t("activation.activated")}
              </span>
            ) : trialActive ? (
              <span className="ml-2 inline-flex items-center rounded-sm bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                {t("activation.trialDaysRemaining", { days: trialDaysRemaining })}
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center rounded-sm bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                {t("activation.trialExpiredBadge")}
              </span>
            ))}
        </span>
        <a
          href="https://github.com/avonyu/cadence-desktop"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <img src={resolvedDark ? githubWhite : githubBlack} alt="GitHub" className="size-5" />
        </a>
      </div>
    </div>
  );
}
