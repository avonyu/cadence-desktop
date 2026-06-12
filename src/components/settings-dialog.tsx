import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import deepseekIcon from "@/assets/deepseek-color.svg";
// import githubIconBlack from "@/assets/GitHub_Invertocat_Black.svg";
// import githubIconWhite from "@/assets/GitHub_Invertocat_White.svg";
import { aiSettingsSchema } from "@/lib/ai-settings";
import { usePlayerStore } from "@/stores/player-store";
import { useState } from "react";
import { toast } from "sonner";
import { check } from "@tauri-apps/plugin-updater";

// const GITHUB_URL = import.meta.env.VITE_GITHUB_URL;
const APP_VERSION = import.meta.env.VITE_APP_VERSION;

type SettingsTab = "basic" | "ai" | "about";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setTheme, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { deepseekApiKey, deepseekModel, setDeepseekApiKey, setDeepseekModel } =
    usePlayerStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("basic");
  const [localApiKey, setLocalApiKey] = useState(deepseekApiKey);
  const [localModel, setLocalModel] = useState(deepseekModel);
  const [updateStatus, setUpdateStatus] = useState("");

  const currentLng = i18n.language;

  // const isDark =
  //   theme === "dark" ||
  //   (theme === "system" &&
  //     window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleCheckUpdate = async () => {
    setUpdateStatus(t("settings.checking"));
    try {
      const update = await check();
      if (update) {
        setUpdateStatus(
          t("settings.newVersionFound", { version: update.version }),
        );
      } else {
        setUpdateStatus(t("settings.upToDate"));
        setTimeout(() => setUpdateStatus(""), 3000);
      }
    } catch {
      setUpdateStatus(t("settings.checkFailed"));
      setTimeout(() => setUpdateStatus(""), 3000);
    }
  };

  const handleSaveConfig = () => {
    const result = aiSettingsSchema.safeParse({
      apiKey: localApiKey,
      model: localModel,
    });

    if (!result.success) {
      toast.error(t("settings.apiKeyRequired"));
      return;
    }

    setLocalApiKey(result.data.apiKey);
    setDeepseekApiKey(result.data.apiKey);
    setDeepseekModel(result.data.model);
    toast.success(t("settings.saved"));
  };

  const tabs: { id: SettingsTab; icon: React.ReactNode; label: string }[] = [
    {
      id: "basic",
      icon: <Settings data-icon="inline-start" />,
      label: t("settings.tabBasic"),
    },
    {
      id: "ai",
      icon: <Sparkles data-icon="inline-start" />,
      label: t("settings.tabAi"),
    },
    {
      id: "about",
      icon: <Info data-icon="inline-start" />,
      label: t("settings.tabAbout"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-160 p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="text-muted-foreground" size={20} />
            <DialogTitle className="text-base">
              {t("settings.title")}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {t("settings.title")}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SettingsTab)}
        >
          <div className="px-3">
            <TabsList className="w-full">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab: Basic */}
          <TabsContent value="basic" className="px-6 py-4">
            <div className="flex flex-col">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">
                  {t("settings.language")}
                </span>
                <Select
                  value={currentLng}
                  onValueChange={(v) => i18n.changeLanguage(v)}
                >
                  <SelectTrigger size="sm" className="w-30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="zh">{t("settings.langZh")}</SelectItem>
                      <SelectItem value="en">{t("settings.langEn")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">
                  {t("settings.theme")}
                </span>
                <Select
                  value={theme}
                  onValueChange={(v) =>
                    setTheme(v as "system" | "dark" | "light")
                  }
                >
                  <SelectTrigger size="sm" className="w-30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="system">
                        <span className="flex items-center gap-2">
                          <Monitor data-icon="inline-start" />
                          {t("settings.themeSystem")}
                        </span>
                      </SelectItem>
                      <SelectItem value="dark">
                        <span className="flex items-center gap-2">
                          <Moon data-icon="inline-start" />
                          {t("settings.themeDark")}
                        </span>
                      </SelectItem>
                      <SelectItem value="light">
                        <span className="flex items-center gap-2">
                          <Sun data-icon="inline-start" />
                          {t("settings.themeLight")}
                        </span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Tab: AI */}
          <TabsContent value="ai" className="px-6 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 py-1">
                <img src={deepseekIcon} alt="" className="size-4" />
                <span className="text-sm font-medium text-foreground">
                  {t("settings.deepseekConfig")}
                </span>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {t("settings.apiKey")}
                </label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {t("settings.model")}
                </label>
                <Select value={localModel} onValueChange={setLocalModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="deepseek-v4-flash">
                        deepseek-v4-flash
                      </SelectItem>
                      <SelectItem value="deepseek-v4-pro">
                        deepseek-v4-pro
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full mt-1" onClick={handleSaveConfig}>
                {t("settings.save")}
              </Button>
            </div>
          </TabsContent>

          {/* Tab: About */}
          <TabsContent value="about" className="px-6 py-4">
            <div className="flex flex-col">
              <button
                className="flex w-full items-center justify-between py-3 text-sm text-muted-foreground transition hover:bg-accent rounded-md"
                onClick={handleCheckUpdate}
              >
                <span>{t("settings.checkUpdate")}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      updateStatus === t("settings.upToDate")
                        ? "text-green-500"
                        : updateStatus
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {updateStatus}
                  </span>
                  <ChevronRight className="text-muted-foreground" size={16} />
                </span>
              </button>

              <Separator />

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-muted-foreground">
                  {t("settings.version")} {APP_VERSION}
                </span>
                {/* <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <img
                    src={isDark ? githubIconWhite : githubIconBlack}
                    alt="GitHub"
                    className="size-4.5"
                  />
                </a> */}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
