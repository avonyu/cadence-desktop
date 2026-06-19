import { useState, useRef, useCallback, useEffect } from "react";
import { lookupWord, type WordDefinition } from "@/lib/dictionary";
import { useActivationStore } from "@/stores/activation-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface WordTranslateState {
  word: string | null;
  definition: WordDefinition | null;
  loading: boolean;
  anchorEl: HTMLElement | null;
}

export function useWordTranslate(
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const { t } = useTranslation();
  const [state, setState] = useState<WordTranslateState>({
    word: null,
    definition: null,
    loading: false,
    anchorEl: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const wasPlayingBeforeEnterRef = useRef(false);
  const wasPlayingBeforeClickRef = useRef(false);
  const popupOpenRef = useRef(false);
  const currentWordRef = useRef<string | null>(null);

  const open = state.word !== null && state.anchorEl !== null;

  const handleClose = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState({
      word: null,
      definition: null,
      loading: false,
      anchorEl: null,
    });
    popupOpenRef.current = false;
    currentWordRef.current = null;
    const video = videoRef.current;
    if (video && wasPlayingBeforeClickRef.current) {
      wasPlayingBeforeClickRef.current = false;
      video.play().catch(() => {});
    }
  }, [videoRef]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose();
      }
    },
    [handleClose],
  );

  const handleWordClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const wordSpan = target.closest(".sub-word") as HTMLElement | null;
      if (!wordSpan) return;

      const word = wordSpan.textContent?.trim() ?? "";
      if (!word || word.length < 2 || !/^[a-z'\-]+$/i.test(word)) return;

      // Gate: word lookup is a restricted feature during trial
      if (import.meta.env.VITE_BUILD_MODE === "commercial") {
        const { activated, canUseFeature } = useActivationStore.getState();
        if (!activated) {
          const allowed = canUseFeature("wordTranslate");
          if (!allowed) {
            toast.error(t("activation.trialExpired"));
            return;
          }
        }
      }

      // Toggle: clicking the same word closes the popover
      if (
        popupOpenRef.current &&
        currentWordRef.current?.toLowerCase() === word.toLowerCase()
      ) {
        handleClose();
        return;
      }

      // Abort any pending lookup
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const video = videoRef.current;

      setState({
        word,
        definition: null,
        loading: true,
        anchorEl: wordSpan,
      });
      popupOpenRef.current = true;
      currentWordRef.current = word;

      // Pause video on click
      if (video && !video.paused) {
        wasPlayingBeforeClickRef.current = true;
        video.pause();
      }

      lookupWord(word).then((def) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          word,
          definition: def,
          loading: false,
          anchorEl: prev.anchorEl,
        }));
      });
    },
    [videoRef, handleClose, t],
  );

  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) {
      wasPlayingBeforeEnterRef.current = true;
      video.pause();
    }
  }, [videoRef]);

  const handleMouseLeave = useCallback(() => {
    // Don't resume if a word popup is currently open
    if (popupOpenRef.current) return;
    const video = videoRef.current;
    if (video && wasPlayingBeforeEnterRef.current) {
      wasPlayingBeforeEnterRef.current = false;
      video.play().catch(() => {});
    }
  }, [videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    ...state,
    open,
    handleWordClick,
    handleClose,
    handleOpenChange,
    handleMouseEnter,
    handleMouseLeave,
  };
}
