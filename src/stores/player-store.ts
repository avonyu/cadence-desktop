import { create } from "zustand";

export type BlurMode = "off" | "primary" | "secondary" | "all";
export type Locale = "zh" | "en";
export type Theme = "dark" | "light";

interface PlayerState {
  sidebarOpen: boolean;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  locale: Locale;
  theme: Theme;
  activeCaption: number | null;
}

interface PlayerActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  cycleBlurMode: () => void;
  setBlurMode: (mode: BlurMode) => void;
  toggleSwap: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setActiveCaption: (index: number | null) => void;
}

const blurModes: BlurMode[] = ["off", "primary", "secondary", "all"];

export const usePlayerStore = create<PlayerState & PlayerActions>()((set) => ({
  sidebarOpen: true,
  blurMode: "off" as BlurMode,
  swapSubtitles: false,
  locale: "zh" as Locale,
  theme: "dark" as Theme,
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
  setLocale: (locale: Locale) => set({ locale }),
  setTheme: (theme: Theme) => set({ theme }),
  setActiveCaption: (index: number | null) => set({ activeCaption: index }),
}));