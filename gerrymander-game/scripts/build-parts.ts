/**
 * assets/parts/*.svg → src/parts/generated.ts
 *
 * パーツは Skia の Path として描くので、SVG から図形データを取り出して TS に変換する。
 * 対応要素: <path> <circle> <ellipse>（属性: d, fill, stroke, stroke-width）。viewBox は 0 0 100 100 固定。
 * SVG を編集・追加したら `npm run build:parts` を実行する。
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../assets/parts');
const OUT = path.resolve(__dirname, '../src/parts/generated.ts');

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

const parts: Record<string, unknown[]> = {};
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const svg = fs.readFileSync(path.join(SRC, file), 'utf8');
  if (!/viewBox="0 0 100 100"/.test(svg)) throw new Error(`${file}: viewBox must be "0 0 100 100"`);
  const shapes = [];
  for (const [tag, name] of svg.matchAll(/<(path|circle|ellipse)\b[^>]*>/g)) {
    const num = (n: string) => Number(attr(tag, n) ?? 0);
    const d =
      name === 'path'
        ? attr(tag, 'd')
        : name === 'circle'
          ? ellipse(num('cx'), num('cy'), num('r'), num('r'))
          : ellipse(num('cx'), num('cy'), num('rx'), num('ry'));
    if (!d) throw new Error(`${file}: <${name}> has no geometry`);
    const fill = attr(tag, 'fill');
    const stroke = attr(tag, 'stroke');
    shapes.push({
      d,
      ...(fill && fill !== 'none' ? { fill } : {}),
      ...(stroke && stroke !== 'none' ? { stroke, strokeWidth: Number(attr(tag, 'stroke-width') ?? 1) } : {}),
    });
  }
  parts[path.basename(file, '.svg')] = shapes;
}

fs.writeFileSync(
  OUT,
  `// このファイルは scripts/build-parts.ts が assets/parts/*.svg から生成します。直接編集しないでください。
export interface PartShape {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const PART_SHAPES: Record<string, PartShape[]> = ${JSON.stringify(parts, null, 2)};
`,
);
console.log(`generated ${Object.keys(parts).length} parts → ${path.relative(process.cwd(), OUT)}`);
