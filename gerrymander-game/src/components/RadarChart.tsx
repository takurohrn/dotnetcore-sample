import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  size: number;
  /** value は 0〜1 */
  data: { label: string; value: number }[];
}

/** 採点内訳のレーダーチャート。ラベルと数値は通常のテキストで重ねる */
export function RadarChart({ size, data }: Props) {
  const c = size / 2;
  const r = size * 0.3;
  const n = data.length;
  const point = (i: number, t: number): [number, number] => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return [c + Math.cos(a) * r * t, c + Math.sin(a) * r * t];
  };

  const { grid, shape } = useMemo(() => {
    const g = Skia.PathBuilder.Make();
    for (const t of [0.25, 0.5, 0.75, 1]) {
      for (let i = 0; i < n; i++) {
        const [x, y] = point(i, t);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.close();
    }
    for (let i = 0; i < n; i++) {
      g.moveTo(c, c);
      g.lineTo(...point(i, 1));
    }
    const s = Skia.PathBuilder.Make();
    data.forEach((d, i) => {
      const [x, y] = point(i, Math.max(0.02, Math.min(1, d.value)));
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
    s.close();
    return { grid: g.build(), shape: s.build() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, data]);

  const labelW = 84;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={data.map((d) => `${d.label} ${Math.round(d.value * 100)}`).join('、')}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={grid} color={colors.line} style="stroke" strokeWidth={1} />
        <Path path={shape} color={colors.primary} opacity={0.35} />
        <Path path={shape} color={colors.primary} style="stroke" strokeWidth={2} strokeJoin="round" />
      </Canvas>
      {data.map((d, i) => {
        const [x, y] = point(i, 1.32);
        return (
          <View key={d.label} style={[styles.label, { left: x - labelW / 2, top: y - 18, width: labelW }]}>
            <Text style={styles.name}>{d.label}</Text>
            <Text style={styles.value}>{Math.round(d.value * 100)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', alignItems: 'center' },
  name: { fontSize: 12, color: colors.sub },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
});
