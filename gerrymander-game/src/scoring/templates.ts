import { TEMPLATES, WEIGHTS, type DragonType, type FeatureKey } from './constants';

export type Features = Record<FeatureKey, number>;
export const FEATURE_KEYS: FeatureKey[] = ['E', 'S', 'N', 'L', 'W', 'Y'];

/** ガウス型の特徴量スコア（0〜1） */
export function featureScore(x: number, ideal: number, tol: number): number {
  return Math.exp(-((x - ideal) ** 2) / (2 * tol * tol));
}

export interface TemplateResult {
  /** 0〜100（ボーナス抜き） */
  score: number;
  featureScores: Features;
}

export function scoreTemplate(features: Features, type: DragonType): TemplateResult {
  const featureScores = {} as Features;
  let sum = 0;
  let weight = 0;
  for (const k of FEATURE_KEYS) {
    const { ideal, tol } = TEMPLATES[type][k];
    featureScores[k] = featureScore(features[k], ideal, tol);
    sum += WEIGHTS[k] * featureScores[k];
    weight += WEIGHTS[k];
  }
  return { score: (sum / weight) * 100, featureScores };
}
