/** 平面ジオメトリのユーティリティ（依存なし。アプリ・CLI 共用） */
import type { Pt, Ring } from './types';

const DEG = Math.PI / 180;

/** メルカトル投影（単位: ラジアン。y は北が正） */
export function mercator([lon, lat]: number[]): Pt {
  return [lon * DEG, Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2))];
}

/** 閉じたリング（先頭=末尾）の重複終点を取り除く */
export function openRing(ring: number[][]): Ring {
  const n = ring.length;
  const closed = n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1];
  return (closed ? ring.slice(0, -1) : ring).map((p) => [p[0], p[1]]);
}

/** 符号付き面積（反時計回りが正） */
export function signedArea(ring: Ring): number {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
export const area = (ring: Ring) => Math.abs(signedArea(ring));

export function centroid(ring: Ring): Pt {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    const c = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * c;
    cy += (y1 + y2) * c;
    a += c;
  }
  if (a === 0) return ring[0] ?? [0, 0];
  return [cx / (3 * a), cy / (3 * a)];
}

/** 原点まわりに反時計回りに rad 回転 */
export function rotate(ring: Ring, rad: number): Ring {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return ring.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

export function transform(ring: Ring, dx: number, dy: number, k: number): Ring {
  return ring.map(([x, y]) => [(x + dx) * k, (y + dy) * k]);
}

function segDist2(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const ex = p[0] - (a[0] + t * dx);
  const ey = p[1] - (a[1] + t * dy);
  return ex * ex + ey * ey;
}

/** 点と直線 ab の距離 */
export function lineDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  if (l === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
}

/** Douglas–Peucker による開いた折れ線の簡略化 */
function dpLine(pts: Pt[], tol2: number): Pt[] {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let max = 0;
    let idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = segDist2(pts[k], pts[i], pts[j]);
      if (d > max) {
        max = d;
        idx = k;
      }
    }
    if (idx >= 0 && max > tol2) {
      keep[idx] = 1;
      stack.push([i, idx], [idx, j]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** リングの簡略化（小さな凹凸を潰す）。最遠の 2 点で分割して DP をかける */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (tolerance <= 0 || ring.length <= 4) return ring;
  let far = 0;
  let best = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const tol2 = tolerance * tolerance;
  const a = dpLine(ring.slice(0, far + 1), tol2);
  const b = dpLine([...ring.slice(far), ring[0]], tol2);
  const out = [...a.slice(0, -1), ...b.slice(0, -1)];
  return out.length >= 3 ? out : ring;
}

/** 凸包（Andrew の monotone chain）。戻り値は ring の添字（反時計回り） */
export function convexHullIndices(ring: Ring): number[] {
  const idx = ring.map((_, i) => i).sort((a, b) => ring[a][0] - ring[b][0] || ring[a][1] - ring[b][1]);
  if (idx.length < 3) return idx;
  const cross = (o: number, a: number, b: number) =>
    (ring[a][0] - ring[o][0]) * (ring[b][1] - ring[o][1]) -
    (ring[a][1] - ring[o][1]) * (ring[b][0] - ring[o][0]);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop();
    upper.push(i);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export interface BoundingRect {
  /** 長軸の向き（rad） */
  angle: number;
  long: number;
  short: number;
  center: Pt;
}

/** 最小面積の外接矩形（凸包の各辺方向を試す） */
export function minBoundingRect(hull: Ring): BoundingRect {
  let bestArea = Infinity;
  let best: BoundingRect = { angle: 0, long: 0, short: 0, center: [0, 0] };
  for (let i = 0, n = hull.length; i < n; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len === 0) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * ux + y * uy;
      const v = -x * uy + y * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const w = maxU - minU;
    const h = maxV - minV;
    if (w * h < bestArea) {
      bestArea = w * h;
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      const center: Pt = [cu * ux - cv * uy, cu * uy + cv * ux];
      const edgeAngle = Math.atan2(uy, ux);
      best =
        w >= h
          ? { angle: edgeAngle, long: w, short: h, center }
          : { angle: edgeAngle + Math.PI / 2, long: h, short: w, center };
    }
  }
  return best;
}

/** 直線 x = x0 でリングを切った断面の区間 [y0, y1] のリスト */
export function crossSection(ring: Ring, x0: number): [number, number][] {
  const ys: number[] = [];
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    if (x1 <= x0 !== x2 <= x0) ys.push(y1 + ((x0 - x1) / (x2 - x1)) * (y2 - y1));
  }
  ys.sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ys.length; i += 2) out.push([ys[i], ys[i + 1]]);
  return out;
}

/** 点がリングの内側にあるか（偶奇規則） */
export function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
