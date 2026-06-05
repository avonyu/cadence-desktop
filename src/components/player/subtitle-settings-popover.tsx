import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, Eye } from "lucide-react";
import { usePlayerStore, type BlurMode } from "@/stores/player-store";
import { useT } from "@/lib/use-i18n";
import type { I18nKey } from "@/lib/i18n";

const blurModeLabels: Record<BlurMode, I18nKey> = {
  off: "blurOff",
  primary: "blurPrimaryLine",
  secondary: "blurSecondaryLine",
  all: "blurAllLines",
};

export function SubtitleSettingsPopover() {
  const { blurMode, swapSubtitles, cycleBlurMode, toggleSwap } =
    usePlayerStore();
  const t = useT();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/8 hover:text-zinc-100"
          title={t("subtitleSettings")}
        >
          <Eye size={18} strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-[220px] rounded-[10px] p-1.5"
      >
        <div className="flex items-center justify-between rounded-md px-2.5 py-2 hover:bg-accent">
          <span className="flex items-center gap-2 text-[13px] text-zinc-300">
            <ArrowUpDown size={14} className="text-zinc-500" />
            {t("swapPosition")}
          </span>
          <Switch
            size="sm"
            checked={swapSubtitles}
            onCheckedChange={toggleSwap}
          />
        </div>
        <button
          className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-zinc-300 transition hover:bg-accent"
          onClick={cycleBlurMode}
        >
          <span className="flex items-center gap-2">
            <Eye size={14} className="text-zinc-500" />
            {t("blur")}
          </span>
          <span className="text-xs text-zinc-500">
            {t(blurModeLabels[blurMode])}
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
}