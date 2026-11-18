/** マップ座標のポリゴンから Skia の Path を作る（Skia 読み込み後に呼ぶこと） */
import { FillType, Skia, type SkPath } from '@shopify/react-native-skia';
import { getGeo, type Shape } from './data';
import type { Ring } from './types';

export function shapesToPath(shapes: Shape[]): SkPath {
  const b = Skia.PathBuilder.Make();
  b.setFillType(FillType.EvenOdd);
  for (const shape of shapes) {
    for (const rings of shape.polygons) {
      for (const ring of rings) {
        b.moveTo(ring[0][0], ring[0][1]);
        for (let i = 1; i < ring.length; i++) b.lineTo(ring[i][0], ring[i][1]);
        b.close();
      }
    }
  }
  return b.build();
}

export function ringToPath(ring: Ring): SkPath {
  const b = Skia.PathBuilder.Make();
  if (ring.length) {
    b.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i++) b.lineTo(ring[i][0], ring[i][1]);
    b.close();
  }
  return b.build();
}

const municipalityPaths = new Map<string, SkPath>();
export function municipalityPath(code: string): SkPath {
  let p = municipalityPaths.get(code);
  if (!p) {
    p = shapesToPath([getGeo().byCode.get(code)!]);
    municipalityPaths.set(code, p);
  }
  return p;
}

let base: { land: SkPath; borders: SkPath } | null = null;
/** 全国の陸地（都道府県ポリゴン）と市区町村境界 */
export function basePaths() {
  if (!base) {
    const geo = getGeo();
    base = { land: shapesToPath(geo.prefectures), borders: shapesToPath(geo.municipalities) };
  }
  return base;
}
