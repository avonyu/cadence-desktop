import { create } from "zustand";
import { flattenActions, type StoreSetter, type StoreGetter } from "./helpers";

export type BlurMode = "off" | "primary" | "secondary" | "all";

export type AiProcessingState =
  | "idle"
  | "loading"
  | "processing"
  | "done"
  | "error";

interface PlayerState {
  sidebarOpen: boolean;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  activeCaption: number | null;
  lastActiveCaption: number | null;
  scrollTracking: boolean;
  aiProcessing: AiProcessingState;
  aiError: string | null;
  deepseekApiKey: string;
  deepseekModel: string;
}

type PlayerAction = Pick<PlayerActionImpl, keyof PlayerActionImpl>;

const initialState: PlayerState = {
  sidebarOpen: true,
  blurMode: "off",
  swapSubtitles: false,
  activeCaption: null,
  lastActiveCaption: null,
  scrollTracking: true,
  aiProcessing: "idle",
  aiError: null,
  deepseekApiKey: localStorage.getItem("cadence:deepseek-api-key") || "",
  deepseekModel:
    localStorage.getItem("cadence:deepseek-model") || "deepseek-v4-flash",
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
    this.#set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  };

  setSidebarOpen = (open: boolean) => {
    this.#set({ sidebarOpen: open });
  };

  cycleBlurMode = () => {
    const { blurMode } = this.#get();
    const nextIndex = (blurModes.indexOf(blurMode) + 1) % blurModes.length;
    this.#set({ blurMode: blurModes[nextIndex] });
  };

  setBlurMode = (mode: BlurMode) => {
    this.#set({ blurMode: mode });
  };

  toggleSwap = () => {
    this.#set((s) => ({ swapSubtitles: !s.swapSubtitles }));
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
