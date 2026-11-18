import { Canvas, Circle, Fill, Group, Path, Skia, type CanvasRef, type SkPath } from '@shopify/react-native-skia';
import { useMemo, type RefObject } from 'react';
import type { Frame } from '../geo/data';
import { municipalityPath, ringToPath } from '../geo/paths';
import { PART_BASE_SIZE, PART_BY_ID, PART_VIEWBOX, type PlacedPart } from '../parts/catalog';
import { DEFAULT_PAINT_ID, PAINT_BY_ID, type Paint } from '../parts/paints';

/** キャンバスの一辺に対する、ドラゴンの外接円半径の割合 */
export const DRAGON_FIT = 0.4;

/** キャンバス座標 → ドラゴン座標（外接円半径を 1 とし、回転を戻した座標） */
export function canvasToDragon(x: number, y: number, size: number, rotationDeg: number): [number, number] {
  const s = size * DRAGON_FIT;
  const px = (x - size / 2) / s;
  const py = (y - size / 2) / s;
  const r = (-rotationDeg * Math.PI) / 180;
  return [px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)];
}

/** 鱗パターン（ドラゴン座標で外接円を覆う範囲に敷き詰める） */
function scalePattern(kind: NonNullable<Paint['pattern']>['kind']): SkPath {
  const b = Skia.PathBuilder.Make();
  const step = 0.11;
  for (let row = 0, y = -1.1; y < 1.1; y += step * 0.6, row++) {
    const offset = row % 2 ? step / 2 : 0;
    for (let x = -1.1 + offset; x < 1.1; x += step) {
      if (kind === 'round') {
        b.moveTo(x, y);
        b.quadTo(x + step / 2, y + step * 0.9, x + step, y);
      } else {
        b.moveTo(x, y);
        b.lineTo(x + step / 2, y + step * 0.6);
        b.lineTo(x + step, y);
      }
    }
  }
  return b.build();
}
const patterns = new Map<string, SkPath>();
function patternPath(kind: NonNullable<Paint['pattern']>['kind']) {
  if (!patterns.has(kind)) patterns.set(kind, scalePattern(kind));
  return patterns.get(kind)!;
}

const partPaths = new Map<string, (SkPath | null)[]>();
function partShapePaths(partId: string) {
  if (!partPaths.has(partId)) {
    partPaths.set(
      partId,
      PART_BY_ID[partId].shapes.map((s) => Skia.Path.MakeFromSVGString(s.d)),
    );
  }
  return partPaths.get(partId)!;
}

/** パーツ 1 個（原点中心、一辺 size）。パレットのプレビューにも使う */
export function PartGlyph({ partId, size }: { partId: string; size: number }) {
  const def = PART_BY_ID[partId];
  if (!def) return null;
  const k = size / PART_VIEWBOX;
  const paths = partShapePaths(partId);
  return (
    <Group transform={[{ scale: k }, { translateX: -PART_VIEWBOX / 2 }, { translateY: -PART_VIEWBOX / 2 }]}>
      {def.shapes.map((shape, i) => {
        const path = paths[i];
        if (!path) return null;
        return (
          <Group key={i}>
            {shape.fill && <Path path={path} color={shape.fill} />}
            {shape.stroke && (
              <Path
                path={path}
                color={shape.stroke}
                style="stroke"
                strokeWidth={shape.strokeWidth ?? 1}
                strokeCap="round"
                strokeJoin="round"
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

interface Props {
  size: number;
  codes: string[];
  frame: Frame;
  rotation: number;
  colors: Record<string, string>;
  parts: PlacedPart[];
  /** 選択中のパーツに枠を出す */
  selectedPart?: number | null;
  background?: string;
  canvasRef?: RefObject<CanvasRef | null>;
}

/** 作品（union した形＋塗り＋パーツ）を、回転・拡大してキャンバス中央に描く */
export function DragonCanvas(p: Props) {
  const { size, frame } = p;
  const outline = useMemo(() => ringToPath(frame.outline), [frame]);
  const s = size * DRAGON_FIT;
  const mapScale = 1 / frame.radius; // マップ座標 → ドラゴン座標
  const px = 1 / s; // ドラゴン座標での 1 画面ピクセル

  return (
    <Canvas ref={p.canvasRef} style={{ width: size, height: size }}>
      <Fill color={p.background ?? '#fffdf7'} />
      <Group transform={[{ translateX: size / 2 }, { translateY: size / 2 }, { rotate: (p.rotation * Math.PI) / 180 }, { scale: s }]}>
        {/* ここから先はドラゴン座標（外接円半径 = 1） */}
        <Group transform={[{ scale: mapScale }, { translateX: -frame.cx }, { translateY: -frame.cy }]}>
          {p.codes.map((code) => {
            const paint = PAINT_BY_ID[p.colors[code] ?? DEFAULT_PAINT_ID] ?? PAINT_BY_ID[DEFAULT_PAINT_ID];
            return <Path key={code} path={municipalityPath(code)} color={paint.color} />;
          })}
        </Group>
        {p.codes.map((code) => {
          const pattern = PAINT_BY_ID[p.colors[code] ?? DEFAULT_PAINT_ID]?.pattern;
          if (!pattern) return null;
          // クリップはマップ座標の自治体ポリゴン、模様はドラゴン座標で描く
          const clip = Skia.Matrix().scale(mapScale, mapScale).translate(-frame.cx, -frame.cy);
          return (
            <Group key={code} clip={transformed(municipalityPath(code), clip)}>
              <Path path={patternPath(pattern.kind)} color={pattern.color} style="stroke" strokeWidth={1.5 * px} />
            </Group>
          );
        })}
        <Group transform={[{ scale: mapScale }, { translateX: -frame.cx }, { translateY: -frame.cy }]}>
          {p.codes.map((code) => (
            <Path
              key={code}
              path={municipalityPath(code)}
              color="rgba(0,0,0,0.28)"
              style="stroke"
              strokeWidth={(1 * px) / mapScale}
            />
          ))}
          <Path path={outline} color="#22252b" style="stroke" strokeWidth={(2.5 * px) / mapScale} strokeJoin="round" />
        </Group>
        {p.parts.map((part, i) => (
          <Group
            key={i}
            transform={[
              { translateX: part.x },
              { translateY: part.y },
              { rotate: (part.rotation * Math.PI) / 180 },
              { scale: part.scale },
            ]}>
            {p.selectedPart === i && (
              <Circle
                cx={0}
                cy={0}
                r={PART_BASE_SIZE * 0.72}
                color="#2f7d4f"
                style="stroke"
                strokeWidth={(2 * px) / part.scale}
              />
            )}
            <PartGlyph partId={part.partId} size={PART_BASE_SIZE} />
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}

const transformedCache = new WeakMap<SkPath, { key: string; path: SkPath }>();
function transformed(path: SkPath, m: ReturnType<typeof Skia.Matrix>): SkPath {
  const key = m.get().join(',');
  const hit = transformedCache.get(path);
  if (hit?.key === key) return hit.path;
  const out = Skia.PathBuilder.MakeFromPath(path).transform(m).build();
  transformedCache.set(path, { key, path: out });
  return out;
}
