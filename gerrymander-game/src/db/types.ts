import type { PlacedPart } from '../parts/catalog';
import type { DragonType } from '../scoring/constants';

export interface DragonRecord {
  id: string;
  name: string;
  codes: string[];
  rotation: number;
  /** 自治体コード → 塗り ID */
  colors: Record<string, string>;
  parts: PlacedPart[];
  score: number;
  type: DragonType;
  /** サムネイル PNG の URI */
  thumbnailPath: string;
  /** ISO 8601 */
  createdAt: string;
}
export type NewDragon = Omit<DragonRecord, 'id' | 'thumbnailPath' | 'createdAt'>;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
