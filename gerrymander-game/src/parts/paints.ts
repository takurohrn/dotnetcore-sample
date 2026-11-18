/** 塗り（仕様 4.3）: パレット 8 色 ＋ 鱗パターン 2 種 */
export interface Paint {
  id: string;
  label: string;
  color: string;
  /** 鱗パターンの線の色と形 */
  pattern?: { kind: 'round' | 'diamond'; color: string };
}

export const PAINTS: Paint[] = [
  { id: 'green', label: 'みどり', color: '#4f9d5d' },
  { id: 'red', label: 'あか', color: '#c8473c' },
  { id: 'blue', label: 'あお', color: '#3f78b5' },
  { id: 'gold', label: 'きん', color: '#dfae3b' },
  { id: 'purple', label: 'むらさき', color: '#7d58a6' },
  { id: 'black', label: 'くろ', color: '#3a3d45' },
  { id: 'white', label: 'しろ', color: '#f3efe4' },
  { id: 'teal', label: 'あおみどり', color: '#3b9c98' },
  { id: 'scale-round', label: 'まるい鱗', color: '#4f9d5d', pattern: { kind: 'round', color: '#2c6b3a' } },
  { id: 'scale-diamond', label: 'ひし形の鱗', color: '#c8473c', pattern: { kind: 'diamond', color: '#7d231c' } },
];
export const PAINT_BY_ID: Record<string, Paint> = Object.fromEntries(PAINTS.map((p) => [p.id, p]));
export const DEFAULT_PAINT_ID = 'green';
