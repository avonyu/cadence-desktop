import Database from "@tauri-apps/plugin-sql";
import { load as loadStore } from "@tauri-apps/plugin-store";
import type { WordDefinition } from "./dictionary";

const DB_PATH = "sqlite:favorites.db";
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
    `CREATE TABLE IF NOT EXISTS favorites (
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
          `INSERT OR IGNORE INTO favorites (word, display, phonetic, definition, added_at)
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
  } catch {
    // Best-effort migration; ignore failures.
  }
}

export async function loadFavorites(): Promise<FavoritesMap> {
  try {
    const db = await getDb();
    const rows = await db.select<FavoriteRow[]>(
      `SELECT word, display, phonetic, definition, added_at
       FROM favorites ORDER BY added_at DESC`,
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
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function addFavorite(entry: FavoriteWord): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO favorites (word, display, phonetic, definition, added_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.word,
        entry.display,
        entry.phonetic ?? null,
        JSON.stringify(entry.definition),
        entry.addedAt,
      ],
    );
  } catch {
    // Best-effort persistence.
  }
}

export async function removeFavorite(word: string): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(`DELETE FROM favorites WHERE word = $1`, [word]);
  } catch {
    // Best-effort persistence.
  }
}
