/**
 * 採点確認用 CLI（仕様 5.5）
 *
 *   npx tsx scripts/score-sample.ts 13101 13102 13103
 *   npx tsx scripts/score-sample.ts 13101,13102,13103 --rotation 30 --parts wing,orb
 *   npx tsx scripts/score-sample.ts --pref 13          # 都道府県内の全市区町村
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Adjacency, MunicipalityFeature } from '../src/geo/types';
import { unionOuterRing } from '../src/geo/union';
import { TEMPLATES, TYPE_LABELS } from '../src/scoring/constants';
import { scoreShape } from '../src/scoring/score';
import { FEATURE_KEYS } from '../src/scoring/templates';

const geoDir = path.resolve(__dirname, '../assets/geo');
const load = (name: string) => JSON.parse(fs.readFileSync(path.join(geoDir, name), 'utf8'));
const features: MunicipalityFeature[] = load('municipalities.json').features;
const adjacency: Adjacency = load('adjacency.json');
const byCode = new Map(features.map((f) => [f.properties.code, f]));

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv.splice(i, 2)[1] : undefined;
};
const rotation = Number(opt('rotation') ?? 0);
const parts = (opt('parts') ?? '').split(',').filter(Boolean);
const pref = opt('pref');
const codes = pref
  ? features.filter((f) => f.properties.pref === pref.padStart(2, '0')).map((f) => f.properties.code)
  : argv.flatMap((a) => a.split(',')).filter(Boolean);

if (codes.length === 0) {
  console.error('usage: score-sample.ts <code...> [--rotation deg] [--parts wing,orb] [--pref 13]');
  process.exit(1);
}
const unknown = codes.filter((c) => !byCode.has(c));
if (unknown.length) {
  console.error(`unknown codes: ${unknown.join(', ')}`);
  process.exit(1);
}

// 連結性チェック（ゲーム内では隣接制約で保証される）
const set = new Set(codes);
const seen = new Set([codes[0]]);
const queue = [codes[0]];
while (queue.length) for (const n of adjacency[queue.pop()!]) if (set.has(n) && !seen.has(n)) (seen.add(n), queue.push(n));
if (seen.size !== set.size) console.warn(`⚠ 選択が連結していません（${seen.size}/${set.size}）。最大のポリゴンだけを採点します。`);

const selected = codes.map((c) => byCode.get(c)!);
const started = performance.now();
const result = scoreShape(unionOuterRing(selected), rotation, parts);
const ms = performance.now() - started;

console.log(`自治体 (${codes.length}): ${selected.map((f) => f.properties.name).slice(0, 12).join('・')}${codes.length > 12 ? ' …' : ''}`);
console.log(`\nスコア: ${result.score}  タイプ: ${TYPE_LABELS[result.type]}  「${result.comment}」  (${ms.toFixed(0)}ms)\n`);
console.table(
  Object.fromEntries(
    FEATURE_KEYS.map((k) => [
      k,
      {
        値: Number(result.features[k].toFixed(3)),
        西洋_理想: TEMPLATES.western[k].ideal,
        西洋_点: Number(result.templates.western.featureScores[k].toFixed(2)),
        東洋_理想: TEMPLATES.eastern[k].ideal,
        東洋_点: Number(result.templates.eastern.featureScores[k].toFixed(2)),
      },
    ]),
  ),
);
for (const t of ['western', 'eastern'] as const) {
  const r = result.templates[t];
  console.log(`${TYPE_LABELS[t]}: ${r.score.toFixed(1)} + ボーナス ${r.bonus} = ${r.total.toFixed(1)}`);
}
