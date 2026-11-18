import { union } from '@turf/union';
import { featureCollection } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { area, mercator, openRing } from './planar';
import type { Ring } from './types';

/**
 * 選択した自治体を union し、単一ポリゴン P の外周（経度緯度）を返す（仕様 5.1-1）。
 * 穴は無視する。離島などで複数ポリゴンになる場合は最大のものを P とする。
 */
export function unionOuterRing(features: Feature<Polygon | MultiPolygon>[]): Ring {
  if (features.length === 0) return [];
  const merged =
    features.length === 1 ? features[0] : union(featureCollection(features as Feature<Polygon>[]));
  if (!merged) return [];
  const polys =
    merged.geometry.type === 'Polygon' ? [merged.geometry.coordinates] : merged.geometry.coordinates;
  let best: Ring = [];
  let bestArea = -1;
  for (const poly of polys) {
    const ring = openRing(poly[0]);
    const a = area(ring.map(mercator));
    if (a > bestArea) {
      bestArea = a;
      best = ring;
    }
  }
  return best;
}
