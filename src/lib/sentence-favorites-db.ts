import Database from "@tauri-apps/plugin-sql";

const DB_PATH = "sqlite:favorites.db";

export interface FavoriteSentence {
  id: number;
  videoName: string;
  subtitleIndex: number;
  text: string;
  translation: string;
  startTime: number;
  endTime: number;
  addedAt: number;
}

interface FavoriteSentenceRow {
  id: number;
  video_name: string;
  subtitle_index: number;
  text: string;
  translation: string;
  start_time: number;
  end_time: number;
  added_at: number;
}

let dbPromise: Promise<Database> | null = null;

async function init(): Promise<Database> {
  const db = await Database.load(DB_PATH);
  await db.execute(
    `CREATE TABLE IF NOT EXISTS favorite_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_name TEXT NOT NULL,
      subtitle_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      translation TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      added_at INTEGER NOT NULL,
      UNIQUE(video_name, subtitle_index)
    )`,
  );
  return db;
}

async function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

export async function loadFavoriteSentences(): Promise<FavoriteSentence[]> {
  try {
    const db = await getDb();
    const rows = await db.select<FavoriteSentenceRow[]>(
      `SELECT id, video_name, subtitle_index, text, translation, start_time, end_time, added_at
       FROM favorite_sentences ORDER BY added_at DESC`,
    );
    return rows.map((row) => ({
      id: row.id,
      videoName: row.video_name,
      subtitleIndex: row.subtitle_index,
      text: row.text,
      translation: row.translation,
      startTime: row.start_time,
      endTime: row.end_time,
      addedAt: row.added_at,
    }));
  } catch (e) {
    console.warn(
      "[sentence-favorites-db] loadFavoriteSentences failed:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function addFavoriteSentence(
  entry: Omit<FavoriteSentence, "id" | "addedAt">,
): Promise<FavoriteSentence | null> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.execute(
      `INSERT OR REPLACE INTO favorite_sentences
       (video_name, subtitle_index, text, translation, start_time, end_time, added_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.videoName,
        entry.subtitleIndex,
        entry.text,
        entry.translation,
        entry.startTime,
        entry.endTime,
        now,
      ],
    );
    const rows = await db.select<FavoriteSentenceRow[]>(
      `SELECT id, video_name, subtitle_index, text, translation, start_time, end_time, added_at
       FROM favorite_sentences
       WHERE video_name = $1 AND subtitle_index = $2`,
      [entry.videoName, entry.subtitleIndex],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      videoName: row.video_name,
      subtitleIndex: row.subtitle_index,
      text: row.text,
      translation: row.translation,
      startTime: row.start_time,
      endTime: row.end_time,
      addedAt: row.added_at,
    };
  } catch (e) {
    console.warn(
      "[sentence-favorites-db] addFavoriteSentence failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function removeFavoriteSentence(
  videoName: string,
  subtitleIndex: number,
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `DELETE FROM favorite_sentences WHERE video_name = $1 AND subtitle_index = $2`,
      [videoName, subtitleIndex],
    );
  } catch (e) {
    console.warn(
      "[sentence-favorites-db] removeFavoriteSentence failed:",
      e instanceof Error ? e.message : e,
    );
  }
}

export async function removeFavoriteSentenceById(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(`DELETE FROM favorite_sentences WHERE id = $1`, [id]);
  } catch (e) {
    console.warn(
      "[sentence-favorites-db] removeFavoriteSentenceById failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
