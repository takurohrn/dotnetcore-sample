import type { Adjacency } from './types';

/** codes が隣接関係で 1 つにつながっているか */
export function isConnected(codes: string[], adjacency: Adjacency): boolean {
  if (codes.length <= 1) return true;
  const set = new Set(codes);
  const seen = new Set([codes[0]]);
  const stack = [codes[0]];
  while (stack.length) {
    for (const n of adjacency[stack.pop()!] ?? []) {
      if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === set.size;
}

/** 選択済み集合に隣接しているか（最初の 1 つは任意） */
export function isAdjacentToSelection(selected: string[], code: string, adjacency: Adjacency): boolean {
  if (selected.length === 0) return true;
  const set = new Set(selected);
  return (adjacency[code] ?? []).some((n) => set.has(n));
}

/** 選択済み集合に隣接していて、まだ選ばれていない自治体 */
export function candidates(selected: string[], adjacency: Adjacency): string[] {
  const set = new Set(selected);
  const out = new Set<string>();
  for (const c of selected) for (const n of adjacency[c] ?? []) if (!set.has(n)) out.add(n);
  return [...out];
}

export type ToggleResult =
  | { ok: true; selected: string[] }
  | { ok: false; reason: 'not-adjacent' | 'would-split' | 'max' };

/** タップによる選択／解除（仕様 4.2 の隣接制約・分断禁止） */
export function toggleSelection(
  selected: string[],
  code: string,
  adjacency: Adjacency,
  max: number | null = null,
): ToggleResult {
  if (selected.includes(code)) {
    const rest = selected.filter((c) => c !== code);
    if (!isConnected(rest, adjacency)) return { ok: false, reason: 'would-split' };
    return { ok: true, selected: rest };
  }
  if (max !== null && selected.length >= max) return { ok: false, reason: 'max' };
  if (!isAdjacentToSelection(selected, code, adjacency)) return { ok: false, reason: 'not-adjacent' };
  return { ok: true, selected: [...selected, code] };
}
