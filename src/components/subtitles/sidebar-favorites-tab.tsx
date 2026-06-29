import { useState, useMemo, useEffect, useCallback, memo } from "react";
import {
  Volume2,
  Loader2,
  Trash2,
  ChevronRight,
  Search,
  BookMarked,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useWordPronounce } from "@/hooks/use-word-pronounce";
import type { FavoriteWord } from "@/lib/favorites-db";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "oldest" | "alpha";

export const SidebarFavoritesTab = memo(function SidebarFavoritesTab() {
  const { t } = useTranslation();
  const favorites = useFavoritesStore((s) => s.favorites);
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const { pronounce, pronouncingWord } = useWordPronounce();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const totalCount = Object.keys(favorites).length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = Object.values(favorites);
    if (q) {
      arr = arr.filter(
        (f) =>
          f.display.toLowerCase().includes(q) ||
          f.word.includes(q) ||
          f.definition.meanings.some((m) =>
            m.definitions.some((d) => d.definition.toLowerCase().includes(q)),
          ),
      );
    }
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sort === "recent") return b.addedAt - a.addedAt;
      if (sort === "oldest") return a.addedAt - b.addedAt;
      return a.display.localeCompare(b.display);
    });
    return sorted;
  }, [favorites, query, sort]);

  const handleRemove = useCallback(
    (item: FavoriteWord) => {
      removeFavorite(item.word);
      toast.success(t("favorites.removed", { word: item.display }));
    },
    [removeFavorite, t],
  );

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

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
            placeholder={t("favorites.searchPlaceholder")}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger size="sm" className="w-auto shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="recent">{t("favorites.sortRecent")}</SelectItem>
            <SelectItem value="oldest">{t("favorites.sortOldest")}</SelectItem>
            <SelectItem value="alpha">{t("favorites.sortAlpha")}</SelectItem>
          </SelectContent>
        </Select>
        {totalCount > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {totalCount}
          </Badge>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <BookMarked className="size-8 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("favorites.empty")}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {t("favorites.emptyHint")}
            </p>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">
            {t("favorites.emptySearch")}
          </p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 px-3 py-3">
            {list.map((item) => {
              const isExpanded = expanded === item.word;
              const isPronouncing = pronouncingWord === item.display;
              return (
                <div
                  key={item.word}
                  className="rounded-md transition-colors hover:bg-accent"
                >
                  <div className="group/fav flex items-center gap-2 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.word)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.display}
                      </span>
                      {item.phonetic && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.phonetic}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => pronounce(item.display)}
                      disabled={isPronouncing}
                      title={t("favorites.pronounce")}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      {isPronouncing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      title={t("favorites.remove")}
                      className="shrink-0 text-muted-foreground opacity-0 transition-[color,opacity] hover:text-destructive group-hover/fav:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pl-7">
                      {item.definition.meanings.map((meaning, i) => (
                        <div key={i} className={i > 0 ? "mt-2" : ""}>
                          <span className="text-sm font-medium text-(--player-accent) italic">
                            {meaning.partOfSpeech}
                          </span>
                          <ol className="mt-1 list-decimal list-inside space-y-0.5">
                            {meaning.definitions.map((d, j) => (
                              <li key={j} className="text-sm leading-relaxed">
                                <span>{d.definition}</span>
                                {d.example && (
                                  <p className="mt-0.5 ml-4 text-xs text-muted-foreground italic">
                                    "{d.example}"
                                  </p>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});
