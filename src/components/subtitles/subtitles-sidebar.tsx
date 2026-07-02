import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Subtitles, BookMarked, BookmarkCheck, X, Loader2, Sparkles } from "lucide-react";
import { type Caption } from "@/lib/subtitles";
import { usePlayerStore, type SidebarTab } from "@/stores/player-store";
import { useTranslation } from "react-i18next";
import { memo, useState, useCallback } from "react";
import ShinyText from "@/components/ShinyText";
import { SidebarSubtitlesTab } from "./sidebar-subtitles-tab";
import { SidebarBookmarkedSentencesTab } from "./sidebar-bookmarked-sentences-tab";
import { SidebarFavoritesTab } from "./sidebar-favorites-tab";
import { SentenceExplanationPanel } from "./sentence-explanation-panel";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface SubtitlesSidebarProps {
  captions: Caption[];
  onSeekToCaption: (caption: Caption) => void;
  onClose: () => void;
  videoFileName: string | null;
}

export const SubtitlesSidebar = memo(function SubtitlesSidebar({
  captions,
  onSeekToCaption,
  onClose,
  videoFileName,
}: SubtitlesSidebarProps) {
  const { t } = useTranslation();
  const sidebarTab = usePlayerStore((s) => s.sidebarTab);
  const setSidebarTab = usePlayerStore((s) => s.setSidebarTab);
  const aiProcessing = usePlayerStore((s) => s.aiProcessing);
  const isAiProcessing =
    aiProcessing === "processing" || aiProcessing === "loading";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProps, setDrawerProps] = useState<{
    sentence: string;
    translation: string;
    videoName: string;
  } | null>(null);
  const [activeExplainingIndex, setActiveExplainingIndex] = useState<number | null>(null);
  const [activeExplainingBookmarkId, setActiveExplainingBookmarkId] = useState<number | null>(null);

  const handleOpenDrawer = useCallback(
    (sentence: string, translation: string, videoName: string): void => {
      setDrawerProps({ sentence, translation, videoName });
      setDrawerOpen(true);
    },
    [],
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean): void => {
      setDrawerOpen(open);
      if (!open) {
        setActiveExplainingIndex(null);
        setActiveExplainingBookmarkId(null);
      }
    },
    [],
  );

  const handleExplainSentence = useCallback(
    (index: number, sentence: string, translation: string, videoName: string): void => {
      setActiveExplainingIndex(index);
      setActiveExplainingBookmarkId(null);
      handleOpenDrawer(sentence, translation, videoName);
    },
    [handleOpenDrawer],
  );

  const handleExplainBookmark = useCallback(
    (bookmarkId: number, sentence: string, translation: string, videoName: string): void => {
      setActiveExplainingBookmarkId(bookmarkId);
      setActiveExplainingIndex(null);
      handleOpenDrawer(sentence, translation, videoName);
    },
    [handleOpenDrawer],
  );

  return (
    <aside className="relative flex min-h-0 h-full flex-col bg-popover">
      <Drawer direction="left" open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent className="h-full">
          <DrawerHeader className="flex-row items-center justify-between shrink-0">
            <DrawerTitle className="flex items-center gap-2 text-sm">
              <Sparkles size={16} className="text-(--player-accent)" />
              {t("explain.title")}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-sm">
                <X size={16} />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            {drawerProps && (
              <SentenceExplanationPanel
                sentence={drawerProps.sentence}
                translation={drawerProps.translation}
                videoName={drawerProps.videoName}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Tabs
        value={sidebarTab}
        onValueChange={(v) => setSidebarTab(v as SidebarTab)}
        className="flex min-h-0 h-full flex-col gap-0"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <TabsList className="flex-1">
            <TabsTrigger value="subtitles">
              <Subtitles data-icon="inline-start" />
              {t("subtitle.subtitlesList")}
            </TabsTrigger>
            <TabsTrigger value="bookmarked-sentences">
              <BookmarkCheck data-icon="inline-start" />
              {t("sentenceFavorites.tabTitle")}
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <BookMarked data-icon="inline-start" />
              {t("favorites.title")}
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        <TabsContent
          value="subtitles"
          forceMount
          className="relative mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          {/* AI Processing overlay — scoped to the subtitles tab only */}
          {isAiProcessing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-(--player-accent)" />
                <ShinyText
                  text={t("ai.processing")}
                  speed={2}
                  shineColor="var(--player-accent)"
                  className="text-sm font-medium"
                />
              </div>
            </div>
          )}
          <SidebarSubtitlesTab
            captions={captions}
            onSeekToCaption={onSeekToCaption}
            videoFileName={videoFileName}
            onExplainSentence={handleExplainSentence}
            activeExplainingIndex={activeExplainingIndex}
          />
        </TabsContent>

        <TabsContent
          value="bookmarked-sentences"
          forceMount
          className="relative mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <SidebarBookmarkedSentencesTab
            currentVideoName={videoFileName}
            onExplainBookmark={handleExplainBookmark}
            activeExplainingBookmarkId={activeExplainingBookmarkId}
          />
        </TabsContent>

        <TabsContent
          value="favorites"
          forceMount
          className="relative mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <SidebarFavoritesTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
});
