/**
 * 地図データ生成スクリプト（仕様 6.1）
 *
 *   npx tsx scripts/build-geo.ts                      # 既定のミラーから取得（簡略化済み）
 *   npx tsx scripts/build-geo.ts --input N03.geojson  # 国土数値情報 N03 の GeoJSON を直接指定
 *   npx tsx scripts/build-geo.ts --input x.json --simplify 5% --min-island 0.5km2
 *
 * 出力: assets/geo/{municipalities,prefectures,adjacency}.json
 *
 * 隣接は「境界線（TopoJSON の arc）を共有する」ことで判定するため、
 * 海を挟む自治体どうしは自動的に非隣接になる（仕様 9）。
 */
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { feature, merge, neighbors } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';

// 国土数値情報 N03（2021-01-01 時点）を 1% に簡略化した公開ミラー。
// 出典: 国土交通省 国土数値情報（行政区域データ）／加工: スマートニュース メディア研究所
const DEFAULT_SOURCE =
  'https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/topojson/s0010/N03-21_210101.json';
const PRECISION = 4; // 小数点以下の桁数（約 10m）
const OUT_DIR = path.resolve(__dirname, '../assets/geo');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const round = (n: number) => Number(n.toFixed(PRECISION));

/** 座標を丸め、丸めで生じた連続重複点と潰れたリングを取り除く */
function roundGeometry(geom: Polygon | MultiPolygon): MultiPolygon | Polygon {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const out: Position[][][] = [];
  for (const poly of polys) {
    const rings: Position[][] = [];
    poly.forEach((ring, ringIndex) => {
      const r: Position[] = [];
      for (const [x, y] of ring) {
        const p = [round(x), round(y)];
        const last = r[r.length - 1];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) r.push(p);
      }
      if (r.length >= 4) rings.push(r);
      else if (ringIndex === 0) rings.length = 0;
    });
    if (rings.length > 0) out.push(rings);
  }
  return out.length === 1
    ? { type: 'Polygon', coordinates: out[0] }
    : { type: 'MultiPolygon', coordinates: out };
}

function displayName(p: Record<string, string | null>): string {
  const gun = p.N03_003 ?? '';
  const city = p.N03_004 ?? '';
  // 政令指定都市の区は「札幌市中央区」、郡部は町村名のみ
  return gun.endsWith('市') ? gun + city : city || gun;
}

async function main() {
  const inputPath = arg('input');
  // ミラーは 1% 簡略化済みなので追加の簡略化は控えめにする（目標: 全国で 2〜4MB）
  const simplify = arg('simplify') ?? (inputPath ? '5%' : '55%');
  const minIsland = arg('min-island') ?? '0.5km2'; // これより小さい離島・岩礁は描画から除く

  let inputText: string;
  if (inputPath) {
    inputText = fs.readFileSync(inputPath, 'utf8');
  } else {
    console.log(`fetching ${DEFAULT_SOURCE}`);
    const res = await fetch(DEFAULT_SOURCE);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    inputText = await res.text();
  }

  // 1. 市区町村コードごとに union（飛び地も同一コードにまとめる） 2. 簡略化
  const commands = [
    '-i input.json',
    "-filter 'N03_007 != null'",
    '-dissolve N03_007 copy-fields=N03_001,N03_003,N03_004',
    `-filter-islands min-area=${minIsland}`,
    `-simplify ${simplify} keep-shapes`,
    '-o output.json format=topojson',
  ]
    .filter(Boolean)
    .join(' ');
  const result = await mapshaper.applyCommands(commands, { 'input.json': inputText });
  const topology = JSON.parse(result['output.json'].toString());
  const object = topology.objects[Object.keys(topology.objects)[0]];
  const geometries: any[] = object.geometries.filter((g: any) => {
    if (g.type) return true;
    console.warn(`skip (no geometry left): ${g.properties.N03_007}`);
    return false;
  });

  const municipalities = geometries.map((g) => {
    const f = feature(topology, g) as unknown as Feature<Polygon | MultiPolygon>;
    const code: string = g.properties.N03_007;
    return {
      type: 'Feature' as const,
      properties: {
        code,
        name: displayName(g.properties),
        pref: code.slice(0, 2),
        prefName: g.properties.N03_001 as string,
      },
      geometry: roundGeometry(f.geometry),
    };
  });

  // 3. 隣接リスト（arc を共有するペア）
  const nb = neighbors(geometries);
  const adjacency: Record<string, string[]> = {};
  geometries.forEach((g, i) => {
    adjacency[g.properties.N03_007] = nb[i].map((j) => geometries[j].properties.N03_007).sort();
  });

  // 4. 都道府県ポリゴン
  const prefCodes = [...new Set(municipalities.map((m) => m.properties.pref))].sort();
  const prefectures = prefCodes.map((pref) => {
    const members = geometries.filter((g) => g.properties.N03_007.startsWith(pref));
    return {
      type: 'Feature' as const,
      properties: { pref, name: members[0].properties.N03_001 as string },
      geometry: roundGeometry(merge(topology, members)),
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, data: unknown) => {
    const file = path.join(OUT_DIR, name);
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`${name}: ${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`);
  };
  write('municipalities.json', { type: 'FeatureCollection', features: municipalities });
  write('prefectures.json', { type: 'FeatureCollection', features: prefectures });
  write('adjacency.json', adjacency);

  const pairs = Object.values(adjacency).reduce((s, a) => s + a.length, 0) / 2;
  const isolated = Object.values(adjacency).filter((a) => a.length === 0).length;
  console.log(
    `municipalities=${municipalities.length} prefectures=${prefectures.length} adjacentPairs=${pairs} isolated=${isolated}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
