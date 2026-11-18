import type { Ring } from '../geo/types';
import {
  BONUS_PART_KINDS,
  PART_BONUS,
  RADAR_AXES,
  SCORE_COMMENTS,
  WEIGHTS,
  type DragonType,
} from './constants';
import { computeFeatures, normalizeRing } from './features';
import { scoreTemplate, type Features, type TemplateResult } from './templates';

export interface ScoreResult {
  /** 0〜100 の整数 */
  score: number;
  type: DragonType;
  features: Features;
  templates: Record<DragonType, TemplateResult & { bonus: number; total: number }>;
  /** レーダーチャート用の内訳（勝ったタイプの特徴量スコア 0〜1） */
  radar: { label: string; value: number }[];
  comment: string;
}

/**
 * 採点（仕様 5.4）。
 * @param lonLatRing union 済みポリゴン P の外周（経度緯度）
 * @param rotationDeg プレイヤーが設定した回転角
 * @param partKinds 貼ったパーツの種類（ボーナス判定用）
 */
export function scoreShape(lonLatRing: Ring, rotationDeg = 0, partKinds: string[] = []): ScoreResult {
  const features = computeFeatures(normalizeRing(lonLatRing, rotationDeg));

  const evaluate = (type: DragonType) => {
    const t = scoreTemplate(features, type);
    const bonus = BONUS_PART_KINDS[type].some((k) => partKinds.includes(k)) ? PART_BONUS : 0;
    return { ...t, bonus, total: Math.min(100, t.score + bonus) };
  };
  const templates = { western: evaluate('western'), eastern: evaluate('eastern') };
  const type: DragonType = templates.western.total >= templates.eastern.total ? 'western' : 'eastern';
  const score = Math.round(templates[type].total);

  const fs = templates[type].featureScores;
  const radar = RADAR_AXES.map(({ label, keys }) => ({
    label,
    value: keys.reduce((s, k) => s + WEIGHTS[k] * fs[k], 0) / keys.reduce((s, k) => s + WEIGHTS[k], 0),
  }));
  const comment = SCORE_COMMENTS.find((c) => score >= c.min)?.text ?? '';

  return { score, type, features, templates, radar, comment };
}
