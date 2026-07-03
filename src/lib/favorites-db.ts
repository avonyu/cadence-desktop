import Database from "@tauri-apps/plugin-sql";
import { load as loadStore } from "@tauri-apps/plugin-store";
import type { WordDefinition } from "./dictionary";

const DB_PATH = "sqlite:data.db";
const LEGACY_STORE_PATH = "favorites.json";

export interface FavoriteWord {
  word: string;
  display: string;
  phonetic?: string;
  definition: WordDefinition;
  addedAt: number;
}

export type FavoritesMap = Record<string, FavoriteWord>;

interface FavoriteRow {
  word: string;
  display: string;
  phonetic: string | null;
  definition: string;
  added_at: number;
}

let dbPromise: Promise<Database> | null = null;

async function init(): Promise<Database> {
  const db = await Database.load(DB_PATH);
  await db.execute(
    `CREATE TABLE IF NOT EXISTS words (
      word TEXT PRIMARY KEY,
      display TEXT NOT NULL,
      phonetic TEXT,
      definition TEXT NOT NULL,
      added_at INTEGER NOT NULL
    )`,
  );
  await migrateLegacy(db);
  return db;
}

function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

/** One-time import of favorites previously stored in the plugin-store JSON file. */
async function migrateLegacy(db: Database): Promise<void> {
  try {
    const store = await loadStore(LEGACY_STORE_PATH, { defaults: {} });
    if (await store.get<boolean>("migratedToSqlite")) return;

    const words = await store.get<Record<string, FavoriteWord>>("words");
    if (words) {
      for (const entry of Object.values(words)) {
        await db.execute(
          `INSERT OR IGNORE INTO words (word, display, phonetic, definition, added_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            entry.word,
            entry.display ?? entry.word,
            entry.phonetic ?? null,
            JSON.stringify(entry.definition),
            entry.addedAt ?? Date.now(),
          ],
        );
      }
    }

    await store.set("migratedToSqlite", true);
    await store.save();
  } catch (e) {
    console.warn("[favorites-db] migration failed:", e instanceof Error ? e.message : e);
  }
}

export async function loadFavorites(): Promise<FavoritesMap> {
  try {
    const db = await getDb();
    const rows = await db.select<FavoriteRow[]>(
      `SELECT word, display, phonetic, definition, added_at
       FROM words ORDER BY added_at DESC`,
    );
    const map: FavoritesMap = {};
    for (const row of rows) {
      try {
        map[row.word] = {
          word: row.word,
          display: row.display,
          phonetic: row.phonetic ?? undefined,
          definition: JSON.parse(row.definition) as WordDefinition,
          addedAt: row.added_at,
        };
      } catch {
        // Skip corrupt row.
        console.debug("[favorites-db] skipping corrupt row for word:", row.word);
      }
    }
    return map;
  } catch (e) {
    console.warn("[favorites-db] loadFavorites failed:", e instanceof Error ? e.message : e);
    return {};
  }
}

export async function addFavorite(entry: FavoriteWord): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO words (word, display, phonetic, definition, added_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.word,
        entry.display,
        entry.phonetic ?? null,
        JSON.stringify(entry.definition),
        entry.addedAt,
      ],
    );
  } catch (e) {
    console.warn("[favorites-db] addFavorite failed for", entry.word, ":", e instanceof Error ? e.message : e);
  }
}

export async function removeFavorite(word: string): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(`DELETE FROM words WHERE word = $1`, [word]);
  } catch (e) {
    console.warn("[favorites-db] removeFavorite failed for", word, ":", e instanceof Error ? e.message : e);
  }
}
