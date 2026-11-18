import assert from 'node:assert/strict';
import test from 'node:test';
import { candidates, isConnected, toggleSelection } from './adjacency';

// A - B - C - D の一列と、どこにもつながらない島 X
const adj = { A: ['B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C'], X: [] };

test('最初の 1 つは任意、以降は隣接のみ選べる', () => {
  assert.deepEqual(toggleSelection([], 'X', adj), { ok: true, selected: ['X'] });
  assert.deepEqual(toggleSelection(['A'], 'B', adj), { ok: true, selected: ['A', 'B'] });
  assert.deepEqual(toggleSelection(['A'], 'C', adj), { ok: false, reason: 'not-adjacent' });
  assert.deepEqual(toggleSelection(['A'], 'X', adj), { ok: false, reason: 'not-adjacent' });
});

test('分断される解除はできない', () => {
  assert.deepEqual(toggleSelection(['A', 'B', 'C'], 'B', adj), { ok: false, reason: 'would-split' });
  assert.deepEqual(toggleSelection(['A', 'B', 'C'], 'C', adj), { ok: true, selected: ['A', 'B'] });
  assert.deepEqual(toggleSelection(['A'], 'A', adj), { ok: true, selected: [] });
});

test('最大選択数', () => {
  assert.deepEqual(toggleSelection(['A', 'B'], 'C', adj, 2), { ok: false, reason: 'max' });
});

test('連結判定と候補', () => {
  assert.equal(isConnected(['A', 'B', 'D'], adj), false);
  assert.equal(isConnected(['B', 'C', 'D'], adj), true);
  assert.deepEqual(candidates(['B'], adj).sort(), ['A', 'C']);
});
