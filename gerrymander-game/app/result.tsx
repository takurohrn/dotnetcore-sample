import { ImageFormat, useCanvasRef } from '@shopify/react-native-skia';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { DragonCanvas } from '../src/components/DragonCanvas';
import { RadarChart } from '../src/components/RadarChart';
import { TYPE_LABELS } from '../src/scoring/constants';
import { useDraft } from '../src/store/draft';
import { colors } from '../src/theme';

export default function Result() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { selected, shape, rotation, colors: fills, parts, result } = useDraft();
  const canvasRef = useCanvasRef();
  const [busy, setBusy] = useState(false);

  if (!shape || !result) return <Redirect href="/select" />;
  const size = Math.round(Math.min(width - 32, 320));
  const bonus = result.templates[result.type].bonus;

  const save = async () => {
    setBusy(true);
    try {
      const image = await canvasRef.current?.makeImageSnapshotAsync();
      useDraft.getState().setThumbnail(image ? image.encodeToBase64(ImageFormat.PNG, 100) : null);
      router.push('/save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.canvas}>
          <DragonCanvas
            canvasRef={canvasRef}
            size={size}
            codes={selected}
            frame={shape.frame}
            rotation={rotation}
            colors={fills}
            parts={parts}
          />
        </View>
        <View style={styles.scoreRow}>
          <Text testID="result-score" style={styles.score}>
            {result.score}
          </Text>
          <Text style={styles.unit}>点</Text>
          <View style={styles.type}>
            <Text testID="result-type" style={styles.typeLabel}>
              {TYPE_LABELS[result.type]}
            </Text>
          </View>
        </View>
        <Text style={styles.comment}>{result.comment}</Text>
        {bonus > 0 && <Text style={styles.bonus}>パーツボーナス +{bonus}</Text>}
        <RadarChart size={Math.min(width - 32, 300)} data={result.radar} />
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          variant="secondary"
          label="つくりなおす"
          style={styles.flex}
          onPress={() => {
            useDraft.getState().reset();
            router.dismissTo('/select');
          }}
        />
        <Button testID="result-save" label="保存する" style={styles.flex} disabled={busy} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { alignItems: 'center', padding: 16, gap: 10 },
  canvas: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  score: { fontSize: 64, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 18, color: colors.sub, marginRight: 8 },
  type: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary },
  typeLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  comment: { fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  bonus: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  flex: { flex: 1 },
});
