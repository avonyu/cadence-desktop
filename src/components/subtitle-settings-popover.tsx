import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, Eye } from "lucide-react";
import { usePlayerStore, type BlurMode } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const blurModeKeys: Record<BlurMode, string> = {
  off: "subtitle.blurOff",
  primary: "subtitle.blurPrimaryLine",
  secondary: "subtitle.blurSecondaryLine",
  all: "subtitle.blurAllLines",
};

export function SubtitleSettingsPopover() {
  const blurMode = usePlayerStore((s) => s.blurMode);
  const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
  const cycleBlurMode = usePlayerStore((s) => s.cycleBlurMode);
  const toggleSwap = usePlayerStore((s) => s.toggleSwap);
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Eye size={18} strokeWidth={2} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("subtitle.subtitleSettings")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent
          side="top"
          align="center"
          className="w-[220px] rounded-[10px] p-1.5"
        >
          <div className="flex items-center justify-between rounded-md px-2.5 py-2 hover:bg-accent">
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <ArrowUpDown size={14} className="text-muted-foreground" />
              {t("subtitle.swapPosition")}
            </span>
            <Switch
              size="sm"
              checked={swapSubtitles}
              onCheckedChange={toggleSwap}
            />
          </div>
          <button
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition hover:bg-accent"
            onClick={cycleBlurMode}
          >
            <span className="flex items-center gap-2">
              <Eye size={14} className="text-muted-foreground" />
              {t("subtitle.blur")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(blurModeKeys[blurMode])}
            </span>
          </button>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}