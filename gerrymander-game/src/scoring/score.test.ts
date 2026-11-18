import assert from 'node:assert/strict';
import test from 'node:test';
import { area, centroid, transform } from '../geo/planar';
import type { Ring } from '../geo/types';
import { TEMPLATES } from './constants';
import { computeFeatures } from './features';
import { scoreShape } from './score';
import { featureScore, scoreTemplate } from './templates';

const normalize = (ring: Ring) => {
  const [cx, cy] = centroid(ring);
  return transform(ring, -cx, -cy, 1 / Math.sqrt(area(ring)));
};
const near = (actual: number, expected: number, eps = 0.02) =>
  assert.ok(Math.abs(actual - expected) <= eps, `${actual} ≉ ${expected}`);

test('長方形 4:1 — 細長さ 4、凹みなし、完全に対称', () => {
  const f = computeFeatures(normalize([[0, 0], [4, 0], [4, 1], [0, 1]]));
  near(f.E, 4);
  near(f.S, 1);
  assert.equal(f.N, 0);
  assert.equal(f.L, 0);
  near(f.W, 0);
  near(f.Y, 1);
});

test('コの字 — 凹み 1 つ、深さは短辺の 2/3', () => {
  // 3×3 の正方形の上辺中央に 幅 1・深さ 2 の切り欠き
  const f = computeFeatures(normalize([[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3]]));
  near(f.E, 1);
  near(f.S, 7 / 9);
  assert.equal(f.N, 1);
  near(f.L, 2 / 3);
});

test('S 字の帯は長方形より蛇行度が高く、対称性が低い', () => {
  const top: Ring = [];
  const bottom: Ring = [];
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * 8;
    const y = Math.sin((x / 8) * 2 * Math.PI * 1.5);
    top.push([x, y + 0.4]);
    bottom.push([x, y - 0.4]);
  }
  const f = computeFeatures(normalize([...bottom, ...top.reverse()]));
  assert.ok(f.W > 1, `W=${f.W}`);
  assert.ok(f.Y < 0.3, `Y=${f.Y}`);
  assert.ok(f.S < 0.5, `S=${f.S}`);
});

test('特徴量スコアはガウス型（理想値で 1、1σ で e^-0.5）', () => {
  near(featureScore(4, 4, 1.5), 1, 1e-9);
  near(featureScore(5.5, 4, 1.5), Math.exp(-0.5), 1e-9);
});

test('理想値どおりの特徴量は 100 点', () => {
  const ideal = Object.fromEntries(Object.entries(TEMPLATES.eastern).map(([k, v]) => [k, v.ideal]));
  near(scoreTemplate(ideal as never, 'eastern').score, 100, 1e-9);
});

test('パーツボーナスは該当タイプにだけ加算される', () => {
  // 経度緯度の小さな長方形
  const ring: Ring = [[139, 35], [139.4, 35], [139.4, 35.1], [139, 35.1]];
  const base = scoreShape(ring);
  const withWing = scoreShape(ring, 0, ['wing']);
  const withOrb = scoreShape(ring, 0, ['orb', 'whisker']);
  near(withWing.templates.western.total - base.templates.western.total, 3, 1e-9);
  near(withWing.templates.eastern.total - base.templates.eastern.total, 0, 1e-9);
  near(withOrb.templates.eastern.total - base.templates.eastern.total, 3, 1e-9);
  assert.ok(base.score >= 0 && base.score <= 100);
  assert.equal(base.radar.length, 5);
});

test('回転しても特徴量は変わらない', () => {
  const ring: Ring = [[139, 35], [139.5, 35], [139.5, 35.1], [139.2, 35.1], [139.2, 35.3], [139, 35.3]];
  const a = scoreShape(ring, 0).features;
  const b = scoreShape(ring, 73).features;
  for (const k of Object.keys(a) as (keyof typeof a)[]) near(b[k], a[k], 0.03);
});
