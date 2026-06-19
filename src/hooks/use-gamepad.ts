import { useEffect, useRef, useState } from "react";
import { GamepadListener } from "gamepad.js";
import { SPEEDS } from "@/lib/player-constants";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SEEK_SECONDS = 5;
const VOLUME_STEP = 0.05;

interface UseGamepadOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onPrevCaption: () => void;
  onNextCaption: () => void;
  onToggleFullscreen: () => void;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  toggleSidebar: () => void;
  toggleSubtitleMask: () => void;
  toggleSingleSentenceLoop: () => void;
  disabled?: boolean;
}

export function useGamepad({
  videoRef,
  onTogglePlay,
  onPrevCaption,
  onNextCaption,
  onToggleFullscreen,
  onOpenFile,
  onOpenSettings,
  toggleSidebar,
  toggleSubtitleMask,
  toggleSingleSentenceLoop,
  disabled = false,
}: UseGamepadOptions) {
  const { t } = useTranslation();

  const [isConnected, setIsConnected] = useState(false);

  const playRef = useRef(onTogglePlay);
  const prevRef = useRef(onPrevCaption);
  const nextRef = useRef(onNextCaption);
  const fullscreenRef = useRef(onToggleFullscreen);
  const openFileRef = useRef(onOpenFile);
  const settingsRef = useRef(onOpenSettings);
  const sidebarRef = useRef(toggleSidebar);
  const maskRef = useRef(toggleSubtitleMask);
  const loopRef = useRef(toggleSingleSentenceLoop);
  const disabledRef = useRef(disabled);

  playRef.current = onTogglePlay;
  prevRef.current = onPrevCaption;
  nextRef.current = onNextCaption;
  fullscreenRef.current = onToggleFullscreen;
  openFileRef.current = onOpenFile;
  settingsRef.current = onOpenSettings;
  sidebarRef.current = toggleSidebar;
  maskRef.current = toggleSubtitleMask;
  loopRef.current = toggleSingleSentenceLoop;
  disabledRef.current = disabled;

  useEffect(() => {
    const listener = new GamepadListener({ analog: false, deadZone: 0.3 });

    // Initial connection state
    const gamepads = navigator.getGamepads();
    if (Array.from(gamepads).some((g) => g !== null)) {
      setIsConnected(true);
    }

    listener.on(
      "gamepad:button",
      (e: { detail: { button: number; pressed: boolean } }) => {
        if (!e.detail.pressed) return;
        if (disabledRef.current) return;

        switch (e.detail.button) {
          case 0: // A
            playRef.current();
            break;
          case 1: // B
            fullscreenRef.current();
            break;
          case 2: // X
            maskRef.current();
            break;
          case 3: // Y
            sidebarRef.current();
            break;
          case 4: // LB
            prevRef.current();
            break;
          case 5: // RB
            nextRef.current();
            break;
          case 8: // Select
            openFileRef.current();
            break;
          case 9: // Start
            settingsRef.current();
            break;
          case 10: {
            // L3
            const video = videoRef.current;
            if (!video) break;
            const current = video.playbackRate;
            const idx = SPEEDS.indexOf(current);
            const nextIdx = (idx + 1) % SPEEDS.length;
            video.playbackRate = SPEEDS[nextIdx];
            break;
          }
          case 12: {
            // D-pad Up - volume up
            const video = videoRef.current;
            if (!video) break;
            const newVol = Math.min(1, video.volume + VOLUME_STEP);
            video.volume = newVol;
            video.muted = false;
            break;
          }
          case 13: {
            // D-pad Down - volume down
            const video = videoRef.current;
            if (!video) break;
            const newVol = Math.max(0, video.volume - VOLUME_STEP);
            video.volume = newVol;
            video.muted = false;
            break;
          }
          case 11: // R3 - toggle loop
            loopRef.current();
            break;
          case 14: {
            // D-pad Left
            const video = videoRef.current;
            if (!video) break;
            video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS);
            break;
          }
          case 15: {
            // D-pad Right
            const video = videoRef.current;
            if (!video) break;
            video.currentTime = Math.min(
              video.duration || Infinity,
              video.currentTime + SEEK_SECONDS,
            );
            break;
          }
        }
      },
    );

    listener.on("gamepad:connected", () => {
      setIsConnected(true);
      toast.info(t("gamepad.connected"));
    });

    listener.on("gamepad:disconnected", () => {
      const gamepads = navigator.getGamepads();
      if (!Array.from(gamepads).some((g) => g !== null)) {
        setIsConnected(false);
        toast.info(t("gamepad.disconnected"));
      }
    });

    listener.start();

    return () => {
      listener.stop();
    };
  }, [videoRef, t]);

  return { isConnected };
}
