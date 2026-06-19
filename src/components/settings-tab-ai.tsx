import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Loader2, RefreshCw } from "lucide-react";
import deepseekIcon from "@/assets/deepseek-color.svg";
import type { TFunction } from "i18next";

interface SettingsTabAiProps {
  localApiKey: string;
  localModel: string;
  availableModels: { id: string }[];
  modelsLoading: boolean;
  setLocalApiKey: (v: string) => void;
  setLocalModel: (v: string) => void;
  onSave: () => void;
  onFetchModels: (apiKey: string) => void;
  t: TFunction;
}

export function SettingsTabAi({
  localApiKey,
  localModel,
  availableModels,
  modelsLoading,
  setLocalApiKey,
  setLocalModel,
  onSave,
  onFetchModels,
  t,
}: SettingsTabAiProps) {
  return (
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
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
          {t("settings.model")}
          {modelsLoading ? (
            <Loader2 className="animate-spin" size={10} />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center p-0.5 rounded hover:bg-accent transition"
                    onClick={(e) => {
                      e.preventDefault();
                      onFetchModels(localApiKey);
                    }}
                  >
                    <RefreshCw size={10} />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={4}>
                  {t("settings.refreshModels")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
        <Select value={localModel} onValueChange={setLocalModel} disabled={availableModels.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("settings.noModels")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.id}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full mt-1" onClick={onSave}>
        {t("settings.save")}
      </Button>
    </div>
  );
}
