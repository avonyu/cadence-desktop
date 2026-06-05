import { create } from "zustand";
import i18n from "@/i18n";

export type BlurMode = "off" | "primary" | "secondary" | "all";

interface PlayerState {
  sidebarOpen: boolean;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  activeCaption: number | null;
}

interface PlayerActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  cycleBlurMode: () => void;
  setBlurMode: (mode: BlurMode) => void;
  toggleSwap: () => void;
  setActiveCaption: (index: number | null) => void;
  changeLanguage: (lng: string) => void;
}

const blurModes: BlurMode[] = ["off", "primary", "secondary", "all"];

export const usePlayerStore = create<PlayerState & PlayerActions>()((set) => ({
  sidebarOpen: true,
  blurMode: "off" as BlurMode,
  swapSubtitles: false,
  activeCaption: null,

  toggleSidebar: () => set((s: PlayerState) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  cycleBlurMode: () =>
    set((s: PlayerState) => {
      const nextIndex = (blurModes.indexOf(s.blurMode) + 1) % blurModes.length;
      return { blurMode: blurModes[nextIndex] };
    }),
  setBlurMode: (mode: BlurMode) => set({ blurMode: mode }),
  toggleSwap: () => set((s: PlayerState) => ({ swapSubtitles: !s.swapSubtitles })),
  setActiveCaption: (index: number | null) => set({ activeCaption: index }),
  changeLanguage: (lng: string) => {
    i18n.changeLanguage(lng);
  },
}));