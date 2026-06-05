import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, Moon, Sun, Monitor, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";

const GITHUB_URL = "https://github.com/avonyu/cadence-desktop";
const APP_VERSION = "v0.1.1-alpha";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setTheme, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [updateStatus, setUpdateStatus] = useState("");

  const currentLng = i18n.language;

  const handleCheckUpdate = () => {
    setUpdateStatus(t("settings.checking"));
    setTimeout(() => {
      setUpdateStatus(t("settings.upToDate"));
      setTimeout(() => setUpdateStatus(""), 3000);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <Settings className="text-muted-foreground" size={20} />
            <DialogTitle className="text-base">{t("settings.title")}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t("settings.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("settings.language")}</span>
            <div className="flex gap-1">
              <button
                className={`rounded-l-md px-3 py-1 text-xs font-semibold transition ${
                  currentLng === "zh"
                    ? "border border-[#8b5cf6] bg-[#8b5cf6]/12 text-[#8b5cf6]"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => i18n.changeLanguage("zh")}
              >
                {t("settings.langZh")}
              </button>
              <button
                className={`rounded-r-md px-3 py-1 text-xs font-semibold transition ${
                  currentLng === "en"
                    ? "border border-[#8b5cf6] bg-[#8b5cf6]/12 text-[#8b5cf6]"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => i18n.changeLanguage("en")}
              >
                {t("settings.langEn")}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("settings.theme")}</span>
            <div className="flex gap-1">
              <button
                className={`flex items-center gap-0.5 rounded-l-md px-3 py-1 text-xs font-semibold transition ${
                  theme === "system"
                    ? "border border-[#8b5cf6] bg-[#8b5cf6]/12 text-[#8b5cf6]"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTheme("system")}
              >
                <Monitor size={14} />
                {t("settings.themeSystem")}
              </button>
              <button
                className={`flex items-center gap-0.5 px-3 py-1 text-xs font-semibold transition ${
                  theme === "dark"
                    ? "border border-[#8b5cf6] bg-[#8b5cf6]/12 text-[#8b5cf6]"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={14} />
                {t("settings.themeDark")}
              </button>
              <button
                className={`flex items-center gap-0.5 rounded-r-md px-3 py-1 text-xs font-semibold transition ${
                  theme === "light"
                    ? "border border-[#8b5cf6] bg-[#8b5cf6]/12 text-[#8b5cf6]"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTheme("light")}
              >
                <Sun size={14} />
                {t("settings.themeLight")}
              </button>
            </div>
          </div>

          <div className="mx-6 border-t border-border my-1" />

          <button
            className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted-foreground transition hover:bg-accent"
            onClick={handleCheckUpdate}
          >
            <span>{t("settings.checkUpdate")}</span>
            <span className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  updateStatus === t("settings.upToDate")
                    ? "text-green-500"
                    : updateStatus
                      ? "text-[#8b5cf6]"
                      : "text-muted-foreground"
                }`}
              >
                {updateStatus}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </span>
          </button>

          <div className="mx-6 border-t border-border my-1" />

          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-xs text-muted-foreground">
              {t("settings.version")} {APP_VERSION}
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}