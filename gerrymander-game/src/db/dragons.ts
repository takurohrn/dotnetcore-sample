import * as SQLite from 'expo-sqlite';
import { deleteThumbnail, writeThumbnail } from './thumbnail';
import { newId, type DragonRecord, type NewDragon } from './types';

interface Row {
  id: string;
  name: string;
  municipality_codes: string;
  rotation: number;
  colors: string;
  parts: string;
  score: number;
  dragon_type: string;
  thumbnail_path: string;
  created_at: string;
}

let db: SQLite.SQLiteDatabase | null = null;
function open() {
  if (!db) {
    db = SQLite.openDatabaseSync('dragons.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS dragons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        municipality_codes TEXT NOT NULL, -- JSON array
        rotation REAL NOT NULL,
        colors TEXT NOT NULL,             -- JSON {code: colorId}
        parts TEXT NOT NULL,              -- JSON [{partId,x,y,scale,rotation}]
        score INTEGER NOT NULL,
        dragon_type TEXT NOT NULL,        -- 'western' | 'eastern'
        thumbnail_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

const fromRow = (r: Row): DragonRecord => ({
  id: r.id,
  name: r.name,
  codes: JSON.parse(r.municipality_codes),
  rotation: r.rotation,
  colors: JSON.parse(r.colors),
  parts: JSON.parse(r.parts),
  score: r.score,
  type: r.dragon_type as DragonRecord['type'],
  thumbnailPath: r.thumbnail_path,
  createdAt: r.created_at,
});

export async function listDragons(): Promise<DragonRecord[]> {
  return open().getAllSync<Row>('SELECT * FROM dragons ORDER BY created_at DESC').map(fromRow);
}

export async function getDragon(id: string): Promise<DragonRecord | null> {
  const row = open().getFirstSync<Row>('SELECT * FROM dragons WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function saveDragon(input: NewDragon, thumbnailBase64: string): Promise<DragonRecord> {
  const id = newId();
  const record: DragonRecord = {
    ...input,
    id,
    thumbnailPath: writeThumbnail(id, thumbnailBase64),
    createdAt: new Date().toISOString(),
  };
  open().runSync(
    `INSERT INTO dragons (id, name, municipality_codes, rotation, colors, parts, score, dragon_type, thumbnail_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.id,
    record.name,
    JSON.stringify(record.codes),
    record.rotation,
    JSON.stringify(record.colors),
    JSON.stringify(record.parts),
    record.score,
    record.type,
    record.thumbnailPath,
    record.createdAt,
  );
  return record;
}

export async function deleteDragon(id: string): Promise<void> {
  const record = await getDragon(id);
  if (!record) return;
  open().runSync('DELETE FROM dragons WHERE id = ?', id);
  deleteThumbnail(record.thumbnailPath);
}
