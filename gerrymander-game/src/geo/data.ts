/** 同梱した地図データの読み込みと、画面描画用の座標（マップ座標）への投影 */
import { mercator, pointInRing } from './planar';
import type { Adjacency, MunicipalityFeature, PrefectureFeature, Pt, Ring } from './types';

/** マップ座標の縮尺（メルカトルのラジアン → マップ座標）。日本全体でおよそ幅 1000 */
const K = 1800;
const ORIGIN = mercator([122.9, 45.6]);

/** 経度緯度 → マップ座標（y は下が正＝画面と同じ向き） */
export function project(lonLat: number[]): Pt {
  const [x, y] = mercator(lonLat);
  return [(x - ORIGIN[0]) * K, (ORIGIN[1] - y) * K];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Shape {
  /** ポリゴンごとのリング（先頭が外周、以降が穴）。マップ座標 */
  polygons: Ring[][];
  bounds: Bounds;
}

export interface Municipality extends Shape {
  code: string;
  name: string;
  pref: string;
  prefName: string;
  feature: MunicipalityFeature;
}

function toShape(geometry: MunicipalityFeature['geometry']): Shape {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const polygons = polys.map((poly) =>
    poly.map((ring) =>
      ring.map((p) => {
        const q = project(p);
        if (q[0] < bounds.minX) bounds.minX = q[0];
        if (q[0] > bounds.maxX) bounds.maxX = q[0];
        if (q[1] < bounds.minY) bounds.minY = q[1];
        if (q[1] > bounds.maxY) bounds.maxY = q[1];
        return q;
      }),
    ),
  );
  return { polygons, bounds };
}

export interface GeoData {
  municipalities: Municipality[];
  byCode: Map<string, Municipality>;
  prefectures: Shape[];
  adjacency: Adjacency;
  bounds: Bounds;
}

let cache: GeoData | null = null;

export function getGeo(): GeoData {
  if (cache) return cache;
  const muni = require('../../assets/geo/municipalities.json') as { features: MunicipalityFeature[] };
  const pref = require('../../assets/geo/prefectures.json') as { features: PrefectureFeature[] };
  const adjacency = require('../../assets/geo/adjacency.json') as Adjacency;

  const municipalities = muni.features.map((feature) => ({
    ...feature.properties,
    ...toShape(feature.geometry),
    feature,
  }));
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const m of municipalities) {
    bounds.minX = Math.min(bounds.minX, m.bounds.minX);
    bounds.minY = Math.min(bounds.minY, m.bounds.minY);
    bounds.maxX = Math.max(bounds.maxX, m.bounds.maxX);
    bounds.maxY = Math.max(bounds.maxY, m.bounds.maxY);
  }
  cache = {
    municipalities,
    byCode: new Map(municipalities.map((m) => [m.code, m])),
    prefectures: pref.features.map((f) => toShape(f.geometry)),
    adjacency,
    bounds,
  };
  return cache;
}

export function shapeContains(shape: Shape, x: number, y: number): boolean {
  const b = shape.bounds;
  if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return false;
  for (const rings of shape.polygons) {
    if (pointInRing(x, y, rings[0]) && !rings.slice(1).some((hole) => pointInRing(x, y, hole))) return true;
  }
  return false;
}

/** マップ座標の点を含む自治体。codes を渡すとその中だけを探す */
export function findMunicipalityAt(x: number, y: number, codes?: string[]): Municipality | null {
  const geo = getGeo();
  const list = codes ? codes.map((c) => geo.byCode.get(c)!).filter(Boolean) : geo.municipalities;
  for (const m of list) if (shapeContains(m, x, y)) return m;
  return null;
}

/** 作品の表示枠: union 外周（経度緯度）の重心と、そこから最も遠い頂点までの距離（マップ座標） */
export interface Frame {
  cx: number;
  cy: number;
  radius: number;
  /** union 外周（マップ座標） */
  outline: Ring;
}

export function frameOf(lonLatRing: Ring): Frame {
  const outline = lonLatRing.map(project);
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0, n = outline.length; i < n; i++) {
    const [x1, y1] = outline[i];
    const [x2, y2] = outline[(i + 1) % n];
    const c = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * c;
    cy += (y1 + y2) * c;
    a += c;
  }
  if (a !== 0) {
    cx /= 3 * a;
    cy /= 3 * a;
  }
  let radius = 0;
  for (const [x, y] of outline) radius = Math.max(radius, Math.hypot(x - cx, y - cy));
  return { cx, cy, radius: radius || 1, outline };
}
