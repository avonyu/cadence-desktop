import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor } from "lucide-react";
import type { TFunction } from "i18next";
import type { NativeLanguage, LearningLanguage } from "@/lib/subtitles";

interface SettingsTabBasicProps {
  theme: string;
  currentLng: string;
  autoTranscode: boolean;
  nativeLanguage: NativeLanguage;
  learningLanguage: LearningLanguage;
  setTheme: (v: "system" | "dark" | "light") => void;
  onChangeLanguage: (v: string) => void;
  setAutoTranscode: (v: boolean) => void;
  setNativeLanguage: (v: NativeLanguage) => void;
  setLearningLanguage: (v: LearningLanguage) => void;
  t: TFunction;
}

export function SettingsTabBasic({
  theme,
  currentLng,
  autoTranscode,
  nativeLanguage,
  learningLanguage,
  setTheme,
  onChangeLanguage,
  setAutoTranscode,
  setNativeLanguage,
  setLearningLanguage,
  t,
}: SettingsTabBasicProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-muted-foreground">
          {t("settings.language")}
        </span>
        <Select
          value={currentLng}
          onValueChange={(v) => {
            onChangeLanguage(v);
            localStorage.setItem("cadence:language", v);
          }}
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

      <Separator />

      <div className="flex items-center justify-between pt-2 pb-1">
        <span className="text-sm text-muted-foreground">
          {t("settings.nativeLanguage")}
        </span>
        <Select value={nativeLanguage} onValueChange={(v) => setNativeLanguage(v as NativeLanguage)}>
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

      <div className="flex items-center justify-between pt-1 pb-2">
        <span className="text-sm text-muted-foreground">
          {t("settings.learningLanguage")}
        </span>
        <Select value={learningLanguage} onValueChange={(v) => setLearningLanguage(v as LearningLanguage)}>
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
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">
            {t("settings.autoTranscode")}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {t("settings.autoTranscodeDesc")}
          </span>
        </div>
        <Switch
          checked={autoTranscode}
          onCheckedChange={setAutoTranscode}
        />
      </div>
    </div>
  );
}
