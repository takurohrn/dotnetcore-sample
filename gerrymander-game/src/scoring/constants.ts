/**
 * 採点まわりの調整用定数（仕様 5.5）。
 * 仕様 10 の未決事項 C・D・E はここの値を変えて調整する。
 */

export type FeatureKey = 'E' | 'S' | 'N' | 'L' | 'W' | 'Y';
export type DragonType = 'western' | 'eastern';
export interface Target {
  ideal: number;
  tol: number;
}

// ── 未決事項 C: 各特徴量の理想値と許容幅（ガウス型スコア）・重み ──
export const TEMPLATES: Record<DragonType, Record<FeatureKey, Target>> = {
  western: {
    E: { ideal: 1.6, tol: 0.5 }, // ややずんぐり
    S: { ideal: 0.55, tol: 0.15 }, // 翼・四肢で凹みが多い
    N: { ideal: 6, tol: 2 }, // 翼2・脚4 or 首・尻尾
    L: { ideal: 0.35, tol: 0.15 },
    W: { ideal: 0.5, tol: 0.5 }, // あまり曲がらない
    Y: { ideal: 0.7, tol: 0.2 }, // 左右対称気味
  },
  eastern: {
    E: { ideal: 4.0, tol: 1.5 }, // 細長い
    S: { ideal: 0.35, tol: 0.15 }, // 蛇行で凸包に対して小さい
    N: { ideal: 3, tol: 2 }, // 頭・短い手足
    L: { ideal: 0.2, tol: 0.1 },
    W: { ideal: 3.0, tol: 1.5 }, // よく曲がる
    Y: { ideal: 0.3, tol: 0.2 }, // 非対称
  },
};
export const WEIGHTS: Record<FeatureKey, number> = { E: 1.0, S: 1.0, N: 1.2, L: 0.8, W: 1.2, Y: 0.8 };

// ── 未決事項 D: 突起検出 ──
/** 突起として数える最小面積（area(P) に対する比） */
export const PROTRUSION_MIN_AREA_RATIO = 0.03;
/**
 * 突起検出の前に輪郭を簡略化する許容誤差（面積を 1 に正規化した座標系での長さ）。
 * 小さな自治体境界のギザギザを拾いすぎるのを防ぐ。0 で無効。
 */
export const PROTRUSION_SMOOTHING_TOLERANCE = 0.02;

// ── 蛇行度・対称性の数値計算の細かさ ──
/** 骨格線をとる断面の数 */
export const MEANDER_SLICES = 16;
/** 骨格線の移動平均の窓（奇数）。1 で平滑化なし */
export const MEANDER_SMOOTHING_WINDOW = 5;
/** 両端で無視する断面の数（先端の細い部分は中点がぶれやすい） */
export const MEANDER_TRIM = 2;
/** 対称性（IoU）を積分する断面の数 */
export const SYMMETRY_SLICES = 160;

// ── パーツボーナス（仕様 5.4） ──
export const PART_BONUS = 3;
export const BONUS_PART_KINDS: Record<DragonType, string[]> = {
  western: ['wing'],
  eastern: ['whisker', 'orb'],
};

// ── 未決事項 E: 選択数 ──
export const MIN_SELECTION = 3;
/** 最大選択数。null = 上限なし */
export const MAX_SELECTION: number | null = null;

// ── 評価画面の一言コメント（min 以上で採用。上から順に判定） ──
export const SCORE_COMMENTS: { min: number; text: string }[] = [
  { min: 80, text: 'これは伝説級のゲリマンダー…！' },
  { min: 60, text: 'なかなかの竜っぷり。区割り職人の素質あり。' },
  { min: 40, text: 'ドラゴン…に見えなくもない。あと一息！' },
  { min: 20, text: 'まだトカゲ。もっと大胆に区割りしよう。' },
  { min: 0, text: 'これはただの行政区域です。' },
];

export const TYPE_LABELS: Record<DragonType, string> = { western: '西洋ドラゴン', eastern: '東洋ドラゴン' };

/** レーダーチャートの軸（仕様 4.4）。突起は N と L をまとめる */
export const RADAR_AXES: { label: string; keys: FeatureKey[] }[] = [
  { label: '細長さ', keys: ['E'] },
  { label: '突起', keys: ['N', 'L'] },
  { label: '充填率', keys: ['S'] },
  { label: '蛇行度', keys: ['W'] },
  { label: '対称性', keys: ['Y'] },
];
