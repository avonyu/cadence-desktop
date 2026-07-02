import { useState, useMemo, useEffect, useCallback, memo } from "react";
import {
  Trash2,
  Search,
  Sparkles,
  BookmarkCheck,
  ListFilter,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSentenceFavoritesStore } from "@/stores/sentence-favorites-store";
import { usePlayerStore } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { FavoriteSentence } from "@/lib/sentence-favorites-db";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "oldest";

interface SidebarBookmarkedSentencesTabProps {
  currentVideoName: string | null;
  onExplainBookmark: (bookmarkId: number, sentence: string, translation: string, videoName: string) => void;
  activeExplainingBookmarkId: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getDisplayText(item: FavoriteSentence, swap: boolean) {
  if (swap) {
    return { primary: item.translation || "", secondary: item.text };
  }
  return { primary: item.text, secondary: item.translation || "" };
}

export const SidebarBookmarkedSentencesTab = memo(
  function SidebarBookmarkedSentencesTab({
    currentVideoName,
    onExplainBookmark,
    activeExplainingBookmarkId,
  }: SidebarBookmarkedSentencesTabProps) {
    const { t } = useTranslation();
    const sentences = useSentenceFavoritesStore((s) => s.sentences);
    const hydrate = useSentenceFavoritesStore((s) => s.hydrate);
    const removeFavorite = useSentenceFavoritesStore((s) => s.removeFavorite);

    const setPendingNavigation = usePlayerStore((s) => s.setPendingNavigation);
    const setScrollTracking = usePlayerStore((s) => s.setScrollTracking);
    const setActiveCaption = usePlayerStore((s) => s.setActiveCaption);
    const setLastActiveCaption = usePlayerStore((s) => s.setLastActiveCaption);
    const swapSubtitles = usePlayerStore((s) => s.swapSubtitles);
    const videoFilter = usePlayerStore((s) => s.sentencesVideoFilter);
    const toggleVideoFilter = usePlayerStore((s) => s.toggleSentencesVideoFilter);

    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortKey>("recent");

    useEffect(() => {
      hydrate();
    }, [hydrate]);

    const totalCount = sentences.length;

    const list = useMemo(() => {
      const q = query.trim().toLowerCase();
      let arr = sentences;

      if (videoFilter && currentVideoName) {
        arr = arr.filter((s) => s.videoName === currentVideoName);
      }

      if (q) {
        arr = arr.filter(
          (s) =>
            s.text.toLowerCase().includes(q) ||
            s.translation.toLowerCase().includes(q) ||
            s.videoName.toLowerCase().includes(q),
        );
      }
      const sorted = [...arr];
      sorted.sort((a, b) => {
        if (sort === "recent") return b.addedAt - a.addedAt;
        return a.addedAt - b.addedAt;
      });
      return sorted;
    }, [sentences, query, sort, videoFilter, currentVideoName]);

    const handleRemove = useCallback(
      (item: FavoriteSentence) => {
        removeFavorite(item.id);
        toast.success(t("sentenceFavorites.removed"));
      },
      [removeFavorite, t],
    );

    const handleSeek = useCallback(
      (item: FavoriteSentence) => {
        const video = document.querySelector(
          "video",
        ) as HTMLVideoElement | null;
        if (video && video.src) {
          setPendingNavigation(true);
          setScrollTracking(true);
          setActiveCaption(item.subtitleIndex);
          setLastActiveCaption(item.subtitleIndex);
          video.currentTime = item.startTime;
        }
      },
      [setPendingNavigation, setScrollTracking, setActiveCaption, setLastActiveCaption],
    );

    const filterActive = videoFilter && !!currentVideoName;

    return (
      <div className="flex min-h-0 h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sentenceFavorites.searchPlaceholder")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger size="sm" className="w-auto shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="recent">
                {t("sentenceFavorites.sortRecent")}
              </SelectItem>
              <SelectItem value="oldest">
                {t("sentenceFavorites.sortOldest")}
              </SelectItem>
            </SelectContent>
          </Select>
          {currentVideoName && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className={cn(
                      "shrink-0",
                      filterActive
                        ? "text-(--player-accent)"
                        : "text-muted-foreground",
                    )}
                    onClick={() => toggleVideoFilter()}
                  >
                    <ListFilter size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {filterActive
                      ? t("sentenceFavorites.filterAll")
                      : t("sentenceFavorites.filterCurrentVideo")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {totalCount > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {totalCount}
            </Badge>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <BookmarkCheck className="size-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("sentenceFavorites.empty")}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {t("sentenceFavorites.emptyHint")}
              </p>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">
              {t("sentenceFavorites.emptySearch")}
            </p>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 px-3 py-3">
              {list.map((item) => {
                const isExplaining = activeExplainingBookmarkId === item.id;
                const { primary, secondary } = getDisplayText(item, swapSubtitles);
                return (
                <div
                  key={item.id}
                >
                <div className="rounded-md transition-colors hover:bg-accent">
                  <div className="group/sent flex items-start gap-2 px-2 py-2">
                    <span
                      onClick={() => handleSeek(item)}
                      className={cn(
                        "shrink-0 text-xs font-bold text-muted-foreground mt-0.5 cursor-pointer hover:text-(--player-accent) transition-colors",
                      )}
                    >
                      {formatTime(item.startTime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-foreground line-clamp-3">
                        {primary}
                      </p>
                      {secondary && (
                        <p className="mt-1 text-sm leading-snug text-muted-foreground line-clamp-2">
                          {secondary}
                        </p>
                      )}
                      {!filterActive && (
                        <p className="mt-1 text-xs text-muted-foreground/50">
                          {item.videoName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-start gap-0.5 opacity-0 group-hover/sent:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title={t("explain.explainSentence")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onExplainBookmark(item.id, item.text, item.translation, item.videoName);
                        }}
                        className={cn(
                          "p-1 rounded transition-colors",
                          isExplaining
                            ? "text-(--player-accent)"
                            : "text-muted-foreground hover:text-(--player-accent)",
                        )}
                      >
                        <Sparkles size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        title={t("sentenceFavorites.remove")}
                        className="shrink-0 text-muted-foreground p-1 rounded transition-colors hover:text-destructive mt-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  },
);
