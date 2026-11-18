import { create } from 'zustand';
import { toggleSelection, type ToggleResult } from '../geo/adjacency';
import { frameOf, getGeo, type Frame } from '../geo/data';
import type { Ring } from '../geo/types';
import { unionOuterRing } from '../geo/union';
import { PART_BY_ID, PART_MAX_SCALE, PART_MIN_SCALE, type PlacedPart } from '../parts/catalog';
import { MAX_SELECTION } from '../scoring/constants';
import { scoreShape, type ScoreResult } from '../scoring/score';

/** union 済みの形（色塗り・評価・詳細表示で共用） */
export interface DragonShape {
  /** union 外周（経度緯度） */
  ring: Ring;
  frame: Frame;
}

export function buildShape(codes: string[]): DragonShape {
  const { byCode } = getGeo();
  const ring = unionOuterRing(codes.map((c) => byCode.get(c)!.feature));
  return { ring, frame: frameOf(ring) };
}

export function evaluate(shape: DragonShape, rotation: number, parts: PlacedPart[]): ScoreResult {
  // 画面の回転は時計回り（y 下向き）、採点座標は y 上向きなので符号を反転する
  return scoreShape(shape.ring, -rotation, parts.map((p) => PART_BY_ID[p.partId]?.kind).filter(Boolean));
}

interface DraftState {
  selected: string[];
  shape: DragonShape | null;
  rotation: number;
  colors: Record<string, string>;
  parts: PlacedPart[];
  result: ScoreResult | null;
  /** サムネイル PNG（base64） */
  thumbnail: string | null;

  reset(): void;
  toggle(code: string): ToggleResult;
  /** 選択を確定して union を計算する */
  confirmSelection(): void;
  setRotation(deg: number): void;
  paint(code: string, paintId: string): void;
  addPart(partId: string): number;
  updatePart(index: number, patch: Partial<PlacedPart>): void;
  removePart(index: number): void;
  runEvaluation(): void;
  setThumbnail(base64: string | null): void;
}

const empty = {
  selected: [] as string[],
  shape: null,
  rotation: 0,
  colors: {} as Record<string, string>,
  parts: [] as PlacedPart[],
  result: null,
  thumbnail: null,
};

export const useDraft = create<DraftState>((set, get) => ({
  ...empty,
  reset: () => set({ ...empty }),
  toggle: (code) => {
    const r = toggleSelection(get().selected, code, getGeo().adjacency, MAX_SELECTION);
    if (r.ok) set({ selected: r.selected });
    return r;
  },
  confirmSelection: () => {
    const { selected, colors } = get();
    const kept = Object.fromEntries(Object.entries(colors).filter(([c]) => selected.includes(c)));
    set({ shape: buildShape(selected), colors: kept, result: null, thumbnail: null });
  },
  setRotation: (deg) => set({ rotation: ((deg % 360) + 360) % 360 }),
  paint: (code, paintId) => set((s) => ({ colors: { ...s.colors, [code]: paintId } })),
  addPart: (partId) => {
    const parts = [...get().parts, { partId, x: 0, y: 0, scale: 1, rotation: 0 }];
    set({ parts });
    return parts.length - 1;
  },
  updatePart: (index, patch) =>
    set((s) => ({
      parts: s.parts.map((p, i) => {
        if (i !== index) return p;
        const next = { ...p, ...patch };
        next.scale = Math.min(PART_MAX_SCALE, Math.max(PART_MIN_SCALE, next.scale));
        return next;
      }),
    })),
  removePart: (index) => set((s) => ({ parts: s.parts.filter((_, i) => i !== index) })),
  runEvaluation: () => {
    const { shape, rotation, parts } = get();
    if (shape) set({ result: evaluate(shape, rotation, parts) });
  },
  setThumbnail: (thumbnail) => set({ thumbnail }),
}));
