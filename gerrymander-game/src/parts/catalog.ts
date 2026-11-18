import { PART_SHAPES, type PartShape } from './generated';

/** パーツの種類（仕様 4.3 / 9 の 7 種）。ボーナス判定はこの kind で行う */
export type PartKind = 'eye' | 'horn' | 'fang' | 'wing' | 'flame' | 'whisker' | 'orb';

export interface PartDef {
  id: string;
  kind: PartKind;
  label: string;
  shapes: PartShape[];
}

const def = (id: string, kind: PartKind, label: string): PartDef => ({ id, kind, label, shapes: PART_SHAPES[id] });

export const PARTS: PartDef[] = [
  def('eye1', 'eye', '目（まる）'),
  def('eye2', 'eye', '目（たて）'),
  def('eye3', 'eye', '目（つり）'),
  def('horn1', 'horn', '角'),
  def('horn2', 'horn', '鹿の角'),
  def('fang', 'fang', '牙'),
  def('wing', 'wing', '翼'),
  def('flame', 'flame', '炎'),
  def('whisker', 'whisker', 'ひげ'),
  def('orb', 'orb', '玉'),
];
export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

/** パーツ SVG の viewBox の一辺 */
export const PART_VIEWBOX = 100;
/** scale=1 のときのパーツの一辺（ドラゴンの外接円半径を 1 とした長さ） */
export const PART_BASE_SIZE = 0.3;
export const PART_MIN_SCALE = 0.3;
export const PART_MAX_SCALE = 5;

/** 作品に配置したパーツ。x, y はドラゴンの外接円半径を 1 とした、ドラゴンに固定の座標 */
export interface PlacedPart {
  partId: string;
  x: number;
  y: number;
  scale: number;
  /** 度 */
  rotation: number;
}
