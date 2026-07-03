import { create } from "zustand";
import { flattenActions, type StoreSetter, type StoreGetter } from "./helpers";
import type { NativeLanguage, LearningLanguage } from "@/lib/subtitles";
import languageConfig from "@/config/language-config.json";

export type BlurMode = "off" | "primary" | "secondary" | "all";

export type SidebarTab = "subtitles" | "bookmarked-sentences" | "favorites";

export type AiProcessingState =
  | "idle"
  | "loading"
  | "processing"
  | "done"
  | "error";

export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerState {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  nativeLanguage: NativeLanguage;
  learningLanguage: LearningLanguage;
  activeCaption: number | null;
  lastActiveCaption: number | null;
  pendingNavigation: boolean;
  scrollTracking: boolean;
  aiProcessing: AiProcessingState;
  aiError: string | null;
  deepseekApiKey: string;
  deepseekModel: string;
  subtitleMaskVisible: boolean;
  subtitleMaskRect: MaskRect;
  autoTranscode: boolean;
  singleSentenceLoop: boolean;
  sentencesVideoFilter: boolean;
}

type PlayerAction = Pick<PlayerActionImpl, keyof PlayerActionImpl>;

const defaultMaskRect: MaskRect = {
  x: 10,
  y: 80,
  width: 80,
  height: 12,
};

const STORAGE_KEY_MASK = "cadence:subtitle-mask-rect";
const STORAGE_KEY_AUTO_TRANSCODE = "cadence:auto-transcode";
const STORAGE_KEY_PLAYER_STATE = "cadence:player-state";

function loadMaskRect(): MaskRect {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASK);
    if (raw) return JSON.parse(raw) as MaskRect;
  } catch {
    /* ignore */
  }
  return defaultMaskRect;
}

interface PlayerUIPersist {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  singleSentenceLoop: boolean;
  sentencesVideoFilter: boolean;
}

const defaultPlayerUI: PlayerUIPersist = {
  sidebarOpen: true,
  sidebarTab: "subtitles",
  blurMode: "off",
  swapSubtitles: false,
  singleSentenceLoop: false,
  sentencesVideoFilter: false,
};

function loadPlayerUI(): PlayerUIPersist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYER_STATE);
    if (raw) return { ...defaultPlayerUI, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...defaultPlayerUI };
}

function persistPlayerUI(state: PlayerUIState) {
  try {
    const data: PlayerUIPersist = {
      sidebarOpen: state.sidebarOpen,
      sidebarTab: state.sidebarTab,
      blurMode: state.blurMode,
      swapSubtitles: state.swapSubtitles,
      singleSentenceLoop: state.singleSentenceLoop,
      sentencesVideoFilter: state.sentencesVideoFilter,
    };
    localStorage.setItem(STORAGE_KEY_PLAYER_STATE, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Minimal subset of PlayerState that PlayerUIPersist covers */
interface PlayerUIState {
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  singleSentenceLoop: boolean;
  sentencesVideoFilter: boolean;
}

const persistedUI = loadPlayerUI();

const initialState: PlayerState = {
  sidebarOpen: persistedUI.sidebarOpen,
  sidebarTab: persistedUI.sidebarTab,
  blurMode: persistedUI.blurMode,
  swapSubtitles: persistedUI.swapSubtitles,
  nativeLanguage: languageConfig.nativeLanguage as NativeLanguage,
  learningLanguage: languageConfig.learningLanguage as LearningLanguage,
  activeCaption: null,
  lastActiveCaption: null,
  pendingNavigation: false,
  scrollTracking: true,
  aiProcessing: "idle",
  aiError: null,
  deepseekApiKey: import.meta.env.VITE_BUILD_MODE === "commercial"
    ? import.meta.env.VITE_DEEPSEEK_API_KEY || ""
    : localStorage.getItem("cadence:deepseek-api-key") || "",
  deepseekModel:
    localStorage.getItem("cadence:deepseek-model") || "deepseek-v4-flash",
  subtitleMaskVisible: false,
  subtitleMaskRect: loadMaskRect(),
  autoTranscode: localStorage.getItem(STORAGE_KEY_AUTO_TRANSCODE) !== "false",
  singleSentenceLoop: persistedUI.singleSentenceLoop,
  sentencesVideoFilter: persistedUI.sentencesVideoFilter,
};

const blurModes: BlurMode[] = ["off", "primary", "secondary", "all"];

export class PlayerActionImpl {
  readonly #set: StoreSetter<PlayerState>;
  readonly #get: () => PlayerState;

  constructor(set: StoreSetter<PlayerState>, get: () => PlayerState) {
    this.#set = set;
    this.#get = get;
  }

  toggleSidebar = () => {
    this.#set((s) => {
      const next = !s.sidebarOpen;
      persistPlayerUI({ ...s, sidebarOpen: next });
      return { sidebarOpen: next };
    });
  };

  setSidebarOpen = (open: boolean) => {
    this.#set((s) => {
      persistPlayerUI({ ...s, sidebarOpen: open });
      return { sidebarOpen: open };
    });
  };

  setSidebarTab = (tab: SidebarTab) => {
    this.#set((s) => {
      persistPlayerUI({ ...s, sidebarTab: tab });
      return { sidebarTab: tab };
    });
  };

  cycleBlurMode = () => {
    const s = this.#get();
    const nextIndex = (blurModes.indexOf(s.blurMode) + 1) % blurModes.length;
    const next = blurModes[nextIndex];
    persistPlayerUI({ ...s, blurMode: next });
    this.#set({ blurMode: next });
  };

  setBlurMode = (mode: BlurMode) => {
    this.#set((s) => {
      persistPlayerUI({ ...s, blurMode: mode });
      return { blurMode: mode };
    });
  };

  toggleSwap = () => {
    this.#set((s) => {
      const next = !s.swapSubtitles;
      persistPlayerUI({ ...s, swapSubtitles: next });
      return { swapSubtitles: next };
    });
  };

  setActiveCaption = (index: number | null) => {
    this.#set({ activeCaption: index });
  };

  setLastActiveCaption = (index: number | null) => {
    this.#set({ lastActiveCaption: index });
  };

  setScrollTracking = (tracking: boolean) => {
    this.#set({ scrollTracking: tracking });
  };

  setPendingNavigation = (pending: boolean) => {
    this.#set({ pendingNavigation: pending });
  };

  setAiProcessing = (state: AiProcessingState) => {
    this.#set({
      aiProcessing: state,
      aiError: state === "idle" ? null : this.#get().aiError,
    });
  };

  setAiError = (error: string | null) => {
    this.#set({ aiError: error });
  };

  setDeepseekApiKey = (key: string) => {
    localStorage.setItem("cadence:deepseek-api-key", key);
    this.#set({ deepseekApiKey: key });
  };

  setDeepseekModel = (model: string) => {
    localStorage.setItem("cadence:deepseek-model", model);
    this.#set({ deepseekModel: model });
  };

  toggleSubtitleMask = () => {
    this.#set((s) => ({ subtitleMaskVisible: !s.subtitleMaskVisible }));
  };

  setSubtitleMaskRect = (rect: MaskRect) => {
    localStorage.setItem(STORAGE_KEY_MASK, JSON.stringify(rect));
    this.#set({ subtitleMaskRect: rect });
  };

  setAutoTranscode = (enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY_AUTO_TRANSCODE, String(enabled));
    this.#set({ autoTranscode: enabled });
  };

  toggleSingleSentenceLoop = () => {
    this.#set((s) => {
      const next = !s.singleSentenceLoop;
      persistPlayerUI({ ...s, singleSentenceLoop: next });
      return { singleSentenceLoop: next };
    });
  };

  toggleSentencesVideoFilter = () => {
    this.#set((s) => {
      const next = !s.sentencesVideoFilter;
      persistPlayerUI({ ...s, sentencesVideoFilter: next });
      return { sentencesVideoFilter: next };
    });
  };
}

type PlayerStore = PlayerState & PlayerAction;

const createPlayerSlice = (
  set: StoreSetter<PlayerStore>,
  get: StoreGetter<PlayerStore>,
) =>
  new PlayerActionImpl(
    set as StoreSetter<PlayerState>,
    get as StoreGetter<PlayerState>,
  );

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...initialState,
  ...flattenActions<PlayerAction>([createPlayerSlice(set, get)]),
}));
