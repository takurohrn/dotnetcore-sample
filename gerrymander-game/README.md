# ゲリマンダーをさがせ

日本地図でとなり合う市区町村をつなげてドラゴンの形を作り、「西洋ドラゴン／東洋ドラゴン」らしさを採点するゲーム。
Expo (React Native) + TypeScript、オフライン完結。

## うごかす

```bash
npm install
npx expo run:ios      # または npx expo run:android（開発ビルド）
npm run web           # ブラウザでの開発プレビュー
```

- `@shopify/react-native-skia` と `expo-sqlite` はネイティブコードを含むため、実機・シミュレータでは開発ビルドを使う。
- Web は動作確認用のプレビュー。作品は SQLite の代わりに localStorage に保存される（`src/db/*.web.ts`）。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run build:geo` | 地図データ（`assets/geo/*.json`）を生成 |
| `npm run build:parts` | `assets/parts/*.svg` → `src/parts/generated.ts` |
| `npm run score -- 13101 13102 13103` | 自治体コードを渡して採点を確認（`--rotation 30` `--parts wing,orb` `--pref 13`） |
| `npm test` | 隣接ルールと採点のユニットテスト |
| `npm run typecheck` | 型チェック |

## 構成

```
app/            画面（expo-router）: index, select, paint, result, save, gallery
src/components/ MapView, DragonCanvas, RadarChart, useTouchGestures ...
src/geo/        地図データ読み込み・隣接判定・union・平面ジオメトリ
src/scoring/    constants.ts（調整用の定数すべて）, features.ts, templates.ts, score.ts
src/parts/      パーツと塗りの定義
src/store/      Zustand（制作中の作品）
src/db/         SQLite（作品）とサムネイル保存
scripts/        build-geo.ts, build-parts.ts, score-sample.ts
```

## 採点の調整

理想値・許容幅・重み、突起検出の閾値と平滑化、蛇行度の断面数、ボーナス、最小／最大選択数、コメント文は
すべて `src/scoring/constants.ts` にある。値を変えたら `npm run score` で数値を確認する。

仕様からの補足：

- **突起（N, L）**：`凸包 − P` の各領域は「凸包上で隣り合う 2 頂点に挟まれた輪郭の区間」として直接求めている（ポリゴン演算なしで同じ結果）。
  検出前に輪郭を Douglas–Peucker で簡略化して小さなギザギザを無視する（`PROTRUSION_SMOOTHING_TOLERANCE`）。
- **蛇行度（W）**：断面の中点列を移動平均し、両端の断面を除いてから角度変化を合計する。
  ずんぐりした形ではノイズで 1 前後の値が出るので、理想値とあわせて調整が必要。
- **P の決め方**：union の結果が複数ポリゴン（離島など）のときは最大のものを採点する。
- 特徴量はどれも回転で変わらないため、回転角はスコアに影響しない（見た目とサムネイルにのみ反映）。

## 地図データ

`scripts/build-geo.ts` は国土数値情報 N03 の GeoJSON を `--input` で受け取る。省略時は、同データ（2021-01-01 時点）を
1% に簡略化した公開ミラー [smartnews-smri/japan-topography](https://github.com/smartnews-smri/japan-topography) から取得する。

```bash
npm run build:geo                                        # ミラーから
npm run build:geo -- --input N03.geojson --simplify 5%   # 公式データから
```

- 市区町村コード（N03_007）ごとに dissolve → 0.5km² 未満の離島を除去 → 簡略化。
- 隣接は「境界線を共有するか」で判定するので、海を挟む自治体は非隣接になる（49 の島しょ自治体は隣接なし）。
- 現在の同梱データ：1,902 市区町村、隣接 4,833 ペア、`municipalities.json` 2.5MB。

出典：「国土数値情報（行政区域データ）」（国土交通省）を加工して作成。
