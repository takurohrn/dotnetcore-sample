import {
  area,
  centroid,
  convexHullIndices,
  crossSection,
  lineDist,
  mercator,
  minBoundingRect,
  rotate,
  signedArea,
  simplifyRing,
  transform,
} from '../geo/planar';
import type { Ring } from '../geo/types';
import {
  MEANDER_SLICES,
  MEANDER_SMOOTHING_WINDOW,
  MEANDER_TRIM,
  PROTRUSION_MIN_AREA_RATIO,
  PROTRUSION_SMOOTHING_TOLERANCE,
  SYMMETRY_SLICES,
} from './constants';
import type { Features } from './templates';

/**
 * 前処理（仕様 5.1-2〜4）: メルカトル投影 → 重心を原点に・面積 1 に正規化 → 回転。
 * 戻り値は反時計回りのリング。
 */
export function normalizeRing(lonLatRing: Ring, rotationDeg = 0): Ring {
  let ring = lonLatRing.map(mercator);
  const a = area(ring);
  if (ring.length < 3 || a === 0) return [];
  const [cx, cy] = centroid(ring);
  ring = transform(ring, -cx, -cy, 1 / Math.sqrt(a));
  ring = rotate(ring, (rotationDeg * Math.PI) / 180);
  return signedArea(ring) < 0 ? ring.reverse() : ring;
}

interface Pocket {
  area: number;
  depth: number;
}

/**
 * convexHull(P) − P の各領域。単純多角形では、凸包上で隣り合う 2 頂点の間に
 * 挟まれた輪郭の区間がそれぞれ 1 つの領域になるので、クリッピングなしで求まる。
 * 深さ = 凸包の辺から領域の最も奥までの距離。
 */
function hullPockets(ring: Ring, hull: number[]): Pocket[] {
  const sorted = [...hull].sort((a, b) => a - b);
  const pockets: Pocket[] = [];
  const n = ring.length;
  for (let h = 0; h < sorted.length; h++) {
    const i = sorted[h];
    const j = sorted[(h + 1) % sorted.length];
    const steps = (j - i + n) % n;
    if (steps <= 1) continue;
    const chain: Ring = [];
    for (let s = 0; s <= steps; s++) chain.push(ring[(i + s) % n]);
    let depth = 0;
    for (const p of chain) depth = Math.max(depth, lineDist(p, ring[i], ring[j]));
    pockets.push({ area: area(chain), depth });
  }
  return pockets;
}

/** 特徴量 E, S, N, L, W, Y を計算する（仕様 5.2）。ring は normalizeRing の出力 */
export function computeFeatures(ring: Ring): Features {
  if (ring.length < 3) return { E: 1, S: 1, N: 0, L: 0, W: 0, Y: 1 };

  const hullIdx = convexHullIndices(ring);
  const hull = hullIdx.map((i) => ring[i]);
  const rect = minBoundingRect(hull);
  const E = rect.short > 0 ? rect.long / rect.short : 1;
  const S = area(ring) / area(hull);

  // 突起（N, L）: 輪郭を軽く簡略化してから検出する（未決事項 D）
  const smooth = simplifyRing(ring, PROTRUSION_SMOOTHING_TOLERANCE);
  const smoothArea = area(smooth);
  const pockets = hullPockets(smooth, convexHullIndices(smooth)).filter(
    (p) => p.area >= smoothArea * PROTRUSION_MIN_AREA_RATIO,
  );
  const N = pockets.length;
  const L = N > 0 && rect.short > 0 ? pockets.reduce((s, p) => s + p.depth, 0) / N / rect.short : 0;

  // 長軸を x 軸、外接矩形の中心を原点にそろえる
  const aligned = rotate(transform(ring, -rect.center[0], -rect.center[1], 1), -rect.angle);
  const x0 = -rect.long / 2;

  // 蛇行度 W: 等間隔の断面の中点を結んだ骨格線の総角度変化（rad）
  let mids: number[] = [];
  for (let k = 0; k < MEANDER_SLICES; k++) {
    const sections = crossSection(aligned, x0 + ((k + 0.5) / MEANDER_SLICES) * rect.long);
    let len = 0;
    let moment = 0;
    for (const [a, b] of sections) {
      len += b - a;
      moment += ((a + b) / 2) * (b - a);
    }
    mids.push(len > 0 ? moment / len : (mids[mids.length - 1] ?? 0));
  }
  mids = mids.slice(MEANDER_TRIM, mids.length - MEANDER_TRIM);
  const half = Math.floor(MEANDER_SMOOTHING_WINDOW / 2);
  if (half > 0) {
    mids = mids.map((_, i) => {
      const from = Math.max(0, i - half);
      const to = Math.min(mids.length - 1, i + half);
      let s = 0;
      for (let k = from; k <= to; k++) s += mids[k];
      return s / (to - from + 1);
    });
  }
  const dx = rect.long / MEANDER_SLICES;
  let W = 0;
  for (let k = 1; k + 1 < mids.length; k++) {
    const a1 = Math.atan2(mids[k] - mids[k - 1], dx);
    const a2 = Math.atan2(mids[k + 1] - mids[k], dx);
    W += Math.abs(a2 - a1);
  }

  // 対称性 Y: 長軸で反転した図形との IoU（断面ごとに区間の重なりを積分）
  let inter = 0;
  let total = 0;
  for (let k = 0; k < SYMMETRY_SLICES; k++) {
    const sections = crossSection(aligned, x0 + ((k + 0.5) / SYMMETRY_SLICES) * rect.long);
    for (const [a, b] of sections) {
      total += b - a;
      for (const [c, d] of sections) inter += Math.max(0, Math.min(b, -c) - Math.max(a, -d));
    }
  }
  const unionLen = 2 * total - inter;
  const Y = unionLen > 0 ? inter / unionLen : 1;

  return { E, S, N, L, W, Y };
}
