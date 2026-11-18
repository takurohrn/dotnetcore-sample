import { Directory, File, Paths } from 'expo-file-system';

const dir = () => new Directory(Paths.document, 'thumbnails');

/** サムネイル PNG を保存して URI を返す */
export function writeThumbnail(id: string, pngBase64: string): string {
  dir().create({ intermediates: true, idempotent: true });
  const file = new File(dir(), `${id}.png`);
  file.create({ overwrite: true });
  file.write(pngBase64, { encoding: 'base64' });
  return file.uri;
}

export function deleteThumbnail(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 画像が既に無くても作品の削除は続ける
  }
}
