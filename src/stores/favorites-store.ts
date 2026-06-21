import { create } from "zustand";
import { flattenActions, type StoreSetter, type StoreGetter } from "./helpers";
import {
  loadFavorites,
  addFavorite,
  removeFavorite as removeFavoriteFromDb,
  type FavoriteWord,
  type FavoritesMap,
} from "@/lib/favorites-db";
import type { WordDefinition } from "@/lib/dictionary";

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

interface FavoritesState {
  favorites: FavoritesMap;
  hydrated: boolean;
}

type FavoritesAction = Pick<FavoritesActionImpl, keyof FavoritesActionImpl>;

const initialState: FavoritesState = {
  favorites: {},
  hydrated: false,
};

export class FavoritesActionImpl {
  readonly #set: StoreSetter<FavoritesState>;
  readonly #get: () => FavoritesState;

  constructor(set: StoreSetter<FavoritesState>, get: () => FavoritesState) {
    this.#set = set;
    this.#get = get;
  }

  hydrate = async () => {
    if (this.#get().hydrated) return;
    const favorites = await loadFavorites();
    this.#set({ favorites, hydrated: true });
  };

  isFavorited = (word: string): boolean => {
    return normalize(word) in this.#get().favorites;
  };

  toggleFavorite = (word: string, definition: WordDefinition) => {
    const key = normalize(word);
    if (!key) return;
    const next: FavoritesMap = { ...this.#get().favorites };
    if (key in next) {
      delete next[key];
      this.#set({ favorites: next });
      removeFavoriteFromDb(key);
    } else {
      const entry: FavoriteWord = {
        word: key,
        display: word,
        phonetic: definition.phonetic,
        definition,
        addedAt: Date.now(),
      };
      next[key] = entry;
      this.#set({ favorites: next });
      addFavorite(entry);
    }
  };

  removeFavorite = (word: string) => {
    const key = normalize(word);
    const current = this.#get().favorites;
    if (!(key in current)) return;
    const next: FavoritesMap = { ...current };
    delete next[key];
    this.#set({ favorites: next });
    removeFavoriteFromDb(key);
  };
}

type FavoritesStore = FavoritesState & FavoritesAction;

const createFavoritesSlice = (
  set: StoreSetter<FavoritesStore>,
  get: StoreGetter<FavoritesStore>,
) =>
  new FavoritesActionImpl(
    set as StoreSetter<FavoritesState>,
    get as StoreGetter<FavoritesState>,
  );

export const useFavoritesStore = create<FavoritesStore>()((set, get) => ({
  ...initialState,
  ...flattenActions<FavoritesAction>([createFavoritesSlice(set, get)]),
}));
