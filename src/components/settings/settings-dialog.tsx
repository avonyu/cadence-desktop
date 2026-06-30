import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Settings, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import { aiSettingsSchema } from "@/lib/ai-settings";
import { usePlayerStore } from "@/stores/player-store";
import { useActivationStore } from "@/stores/activation-store";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import type { Update } from "@tauri-apps/plugin-updater";
import { GamepadListener } from "gamepad.js";
import { SettingsTabBasic } from "./settings-tab-basic";
import { SettingsTabAi } from "./settings-tab-ai";
import { SettingsTabAbout } from "./settings-tab-about";

const APP_VERSION = import.meta.env.VITE_APP_VERSION;
const STORAGE_KEY_MODELS = "cadence:deepseek-models";
const BUILD_MODE = import.meta.env.VITE_BUILD_MODE as string;

type SettingsTab = "basic" | "ai" | "about";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { setTheme, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { deepseekApiKey, deepseekModel, setDeepseekApiKey, setDeepseekModel, autoTranscode, setAutoTranscode } =
    usePlayerStore();
  const activated = useActivationStore((s) => s.activated);
  const trialActive = useActivationStore((s) => s.trialActive);
  const trialDaysRemaining = useActivationStore((s) => s.trialDaysRemaining);
  const activate = useActivationStore((s) => s.activate);

  const [activeTab, setActiveTab] = useState<SettingsTab>("basic");
  const [localApiKey, setLocalApiKey] = useState(deepseekApiKey);
  const [localModel, setLocalModel] = useState(deepseekModel);
  const [availableModels, setAvailableModels] = useState<{ id: string }[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_MODELS);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [modelsLoading, setModelsLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState(false);

  const currentLng = i18n.language;
  const updateRef = useRef<Update | null>(null);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus(t("settings.checking"));
    setDownloading(false);
    setDownloadProgress(0);
    setInstalled(false);
    updateRef.current = null;
    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setUpdateStatus(t("settings.newVersionFound", { version: update.version }));
      } else {
        setUpdateStatus(t("settings.upToDate"));
        setTimeout(() => setUpdateStatus(""), 3000);
      }
    } catch (e) {
      console.error("Update check failed:", e);
      setUpdateStatus(t("settings.checkFailed"));
      setTimeout(() => setUpdateStatus(""), 3000);
    }
  }, [t]);

  const handleDownloadAndInstall = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      let totalLength: number | undefined;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            totalLength = event.data.contentLength;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setDownloadProgress(totalLength ? Math.round((downloaded / totalLength) * 100) : -1);
            break;
          case "Finished":
            setDownloadProgress(100);
            setUpdateStatus(t("settings.installing"));
            break;
        }
      });
      setUpdateStatus(t("settings.restartPrompt"));
      setDownloading(false);
      setInstalled(true);
    } catch {
      setUpdateStatus(t("settings.downloadFailed"));
      setDownloading(false);
      setDownloadProgress(0);
      toast.error(t("settings.downloadFailed"));
    }
  }, [t]);

  const handleSaveConfig = useCallback(() => {
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
  }, [localApiKey, localModel, setDeepseekApiKey, setDeepseekModel, t]);

  const handleActivate = useCallback(async () => {
    const code = activationCode.trim();
    if (!code) return;
    setActivating(true);
    setActivateError(false);
    try {
      const result = await activate(code);
      if (!result.success) {
        setActivateError(true);
        if (result.error) console.warn("[activation] activate error:", result.error);
        toast.error(t("activation.invalidCode"));
      } else {
        toast.success(t("activation.activateSuccess"));
        setActivationCode("");
      }
    } catch {
      setActivateError(true);
      toast.error(t("activation.invalidCode"));
    } finally {
      setActivating(false);
    }
  }, [activationCode, activate, t]);

  const fetchModels = useCallback(
    async (apiKey: string) => {
      if (!apiKey) return;
      setModelsLoading(true);
      try {
        const models = await invoke<{ id: string }[]>("fetch_deepseek_models", {
          apiKey,
        });
        setAvailableModels(models);
        localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
      } catch (err) {
        toast.error(t("settings.fetchModelsFailed"), {
          description: String(err),
        });
      } finally {
        setModelsLoading(false);
      }
    },
    [t],
  );

  const tabs = useMemo<{ id: SettingsTab; icon: React.ReactNode; label: string }[]>(
    () => [
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
    ],
    [t],
  );

  const tabIds = tabs.map((tab) => tab.id);

  const handleSettingsGamepadButton = useCallback(
    (button: number) => {
      if (button === 4) {
        const currentIdx = tabIds.indexOf(activeTab);
        const prevIdx = (currentIdx - 1 + tabIds.length) % tabIds.length;
        setActiveTab(tabIds[prevIdx] as SettingsTab);
        return;
      }
      if (button === 5) {
        const currentIdx = tabIds.indexOf(activeTab);
        const nextIdx = (currentIdx + 1) % tabIds.length;
        setActiveTab(tabIds[nextIdx] as SettingsTab);
        return;
      }
      if (button === 9) {
        onOpenChange(false);
        return;
      }
    },
    [activeTab, tabIds, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;

    const listener = new GamepadListener({ analog: false, deadZone: 0.3 });
    listener.on("gamepad:button", (e: { detail: { button: number; pressed: boolean } }) => {
      if (!e.detail.pressed) return;
      setTimeout(() => handleSettingsGamepadButton(e.detail.button), 0);
    });
    listener.start();

    return () => {
      listener.stop();
    };
  }, [open, handleSettingsGamepadButton]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-160 p-0 gap-0 overflow-hidden">
        <TooltipProvider>
          <DialogHeader className="flex flex-row items-center border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <Settings className="text-muted-foreground" size={20} />
              <DialogTitle className="text-base">{t("settings.title")}</DialogTitle>
            </div>
            <DialogDescription className="sr-only">{t("settings.title")}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
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

            <TabsContent value="basic" className="px-6 py-4">
              <SettingsTabBasic
                theme={theme}
                currentLng={currentLng}
                autoTranscode={autoTranscode}
                setTheme={setTheme}
                onChangeLanguage={i18n.changeLanguage}
                setAutoTranscode={setAutoTranscode}
                t={t}
              />
            </TabsContent>

            <TabsContent value="ai" className="px-6 py-4">
              <SettingsTabAi
                localApiKey={localApiKey}
                localModel={localModel}
                availableModels={availableModels}
                modelsLoading={modelsLoading}
                setLocalApiKey={setLocalApiKey}
                setLocalModel={setLocalModel}
                onSave={handleSaveConfig}
                onFetchModels={fetchModels}
                t={t}
              />
            </TabsContent>

            <TabsContent value="about" className="px-6 py-4">
              <SettingsTabAbout
                updateStatus={updateStatus}
                downloading={downloading}
                downloadProgress={downloadProgress}
                installed={installed}
                hasUpdate={updateRef.current !== null}
                activationCode={activationCode}
                activating={activating}
                activateError={activateError}
                activated={activated}
                trialActive={trialActive}
                trialDaysRemaining={trialDaysRemaining}
                buildMode={BUILD_MODE}
                appVersion={APP_VERSION}
                setActivationCode={setActivationCode}
                setActivateError={setActivateError}
                onCheckUpdate={handleCheckUpdate}
                onDownloadAndInstall={handleDownloadAndInstall}
                onActivate={handleActivate}
                t={t}
              />
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
