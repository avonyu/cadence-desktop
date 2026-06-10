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
import { usePlayerStore } from "@/stores/player-store";
import { useState } from "react";
import { toast } from "sonner";

const GITHUB_URL = "https://github.com/avonyu/cadence-desktop";
const APP_VERSION = "v0.1.1-alpha";

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

  const handleCheckUpdate = () => {
    setUpdateStatus(t("settings.checking"));
    setTimeout(() => {
      setUpdateStatus(t("settings.upToDate"));
      setTimeout(() => setUpdateStatus(""), 3000);
    }, 1500);
  };

  const handleSaveConfig = () => {
    setDeepseekApiKey(localApiKey);
    setDeepseekModel(localModel);
    toast.success(t("settings.saved"), { position: "top-center" });
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
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"
                    fill="#4D6BFE"
                  />
                </svg>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
