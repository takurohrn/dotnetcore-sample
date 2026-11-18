// Web（開発プレビュー）にはファイルシステムが無いので data URI をそのまま保存する
export function writeThumbnail(_id: string, pngBase64: string): string {
  return `data:image/png;base64,${pngBase64}`;
}

export function deleteThumbnail(_uri: string): void {}
