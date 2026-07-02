import { create } from "zustand";
import { flattenActions, type StoreSetter, type StoreGetter } from "./helpers";
import {
  loadFavoriteSentences,
  addFavoriteSentence,
  removeFavoriteSentence,
  removeFavoriteSentenceById,
  type FavoriteSentence,
} from "@/lib/sentence-favorites-db";

interface SentenceFavoritesState {
  sentences: FavoriteSentence[];
  hydrated: boolean;
}

type SentenceFavoritesAction = Pick<
  SentenceFavoritesActionImpl,
  keyof SentenceFavoritesActionImpl
>;

const initialState: SentenceFavoritesState = {
  sentences: [],
  hydrated: false,
};

export class SentenceFavoritesActionImpl {
  readonly #set: StoreSetter<SentenceFavoritesState>;
  readonly #get: () => SentenceFavoritesState;

  constructor(
    set: StoreSetter<SentenceFavoritesState>,
    get: () => SentenceFavoritesState,
  ) {
    this.#set = set;
    this.#get = get;
  }

  hydrate = async () => {
    if (this.#get().hydrated) return;
    const sentences = await loadFavoriteSentences();
    this.#set({ sentences, hydrated: true });
  };

  isFavorited = (videoName: string, subtitleIndex: number): boolean => {
    return this.#get().sentences.some(
      (s) => s.videoName === videoName && s.subtitleIndex === subtitleIndex,
    );
  };

  toggleFavorite = async (
    videoName: string,
    subtitleIndex: number,
    text: string,
    translation: string,
    startTime: number,
    endTime: number,
  ) => {
    const current = this.#get().sentences;
    const existing = current.find(
      (s) => s.videoName === videoName && s.subtitleIndex === subtitleIndex,
    );
    if (existing) {
      const next = current.filter((s) => s.id !== existing.id);
      this.#set({ sentences: next });
      removeFavoriteSentence(videoName, subtitleIndex);
    } else {
      const tempId = -Date.now();
      const optimistic: FavoriteSentence = {
        id: tempId,
        videoName,
        subtitleIndex,
        text,
        translation,
        startTime,
        endTime,
        addedAt: Date.now(),
      };
      this.#set({ sentences: [optimistic, ...current] });

      const entry = await addFavoriteSentence({
        videoName,
        subtitleIndex,
        text,
        translation,
        startTime,
        endTime,
      });
      if (entry) {
        this.#set((s) => ({
          sentences: s.sentences.map((sent) =>
            sent.id === tempId ? entry : sent,
          ),
        }));
      } else {
        this.#set({ sentences: current });
      }
    }
  };

  removeFavorite = async (id: number) => {
    const current = this.#get().sentences;
    this.#set({ sentences: current.filter((s) => s.id !== id) });
    removeFavoriteSentenceById(id);
  };
}

type SentenceFavoritesStore = SentenceFavoritesState & SentenceFavoritesAction;

const createSentenceFavoritesSlice = (
  set: StoreSetter<SentenceFavoritesStore>,
  get: StoreGetter<SentenceFavoritesStore>,
) =>
  new SentenceFavoritesActionImpl(
    set as StoreSetter<SentenceFavoritesState>,
    get as StoreGetter<SentenceFavoritesState>,
  );

export const useSentenceFavoritesStore = create<SentenceFavoritesStore>()(
  (set, get) => ({
    ...initialState,
    ...flattenActions<SentenceFavoritesAction>([
      createSentenceFavoritesSlice(set, get),
    ]),
  }),
);
