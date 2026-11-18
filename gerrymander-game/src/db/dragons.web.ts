// Web（開発プレビュー用）: SQLite の代わりに localStorage に保存する。実機は dragons.ts（expo-sqlite）
import { writeThumbnail } from './thumbnail';
import { newId, type DragonRecord, type NewDragon } from './types';

const KEY = 'gerrymander.dragons';

function readAll(): DragonRecord[] {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
const writeAll = (list: DragonRecord[]) => globalThis.localStorage?.setItem(KEY, JSON.stringify(list));

export async function listDragons(): Promise<DragonRecord[]> {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDragon(id: string): Promise<DragonRecord | null> {
  return readAll().find((d) => d.id === id) ?? null;
}

export async function saveDragon(input: NewDragon, thumbnailBase64: string): Promise<DragonRecord> {
  const id = newId();
  const record: DragonRecord = {
    ...input,
    id,
    thumbnailPath: writeThumbnail(id, thumbnailBase64),
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), record]);
  return record;
}

export async function deleteDragon(id: string): Promise<void> {
  writeAll(readAll().filter((d) => d.id !== id));
}
