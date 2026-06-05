import { create } from "zustand";
import { flattenActions, type StoreSetter, type StoreGetter } from "./helpers";

export type BlurMode = "off" | "primary" | "secondary" | "all";

interface PlayerState {
  sidebarOpen: boolean;
  blurMode: BlurMode;
  swapSubtitles: boolean;
  activeCaption: number | null;
}

type PlayerAction = Pick<PlayerActionImpl, keyof PlayerActionImpl>;

const initialState: PlayerState = {
  sidebarOpen: true,
  blurMode: "off",
  swapSubtitles: false,
  activeCaption: null,
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
}

type PlayerStore = PlayerState & PlayerAction;

const createPlayerSlice = (
  set: StoreSetter<PlayerStore>,
  get: StoreGetter<PlayerStore>,
) => new PlayerActionImpl(set as StoreSetter<PlayerState>, get as StoreGetter<PlayerState>);

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...initialState,
  ...flattenActions<PlayerAction>([createPlayerSlice(set, get)]),
}));