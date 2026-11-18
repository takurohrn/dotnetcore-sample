import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '../../src/components/Button';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { RadarChart } from '../../src/components/RadarChart';
import { deleteDragon, getDragon } from '../../src/db/dragons';
import type { DragonRecord } from '../../src/db/types';
import { getGeo } from '../../src/geo/data';
import { TYPE_LABELS } from '../../src/scoring/constants';
import { buildShape, evaluate } from '../../src/store/draft';
import { colors } from '../../src/theme';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [record, setRecord] = useState<DragonRecord | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    getDragon(id)
      .then(setRecord)
      .catch(() => setRecord(null));
  }, [id]);

  // 内訳は保存していないので、保存内容から採点しなおす
  const result = useMemo(() => {
    if (!record) return null;
    const known = record.codes.filter((c) => getGeo().byCode.has(c));
    if (known.length === 0) return null;
    return evaluate(buildShape(known), record.rotation, record.parts);
  }, [record]);

  if (record === undefined) return <View style={styles.root} />;
  if (record === null) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.sub}>この作品は見つかりませんでした。</Text>
      </View>
    );
  }

  const { byCode } = getGeo();
  const names = record.codes.map((c) => {
    const m = byCode.get(c);
    return m ? `${m.prefName} ${m.name}` : c;
  });
  const size = Math.min(width - 32, 420);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: record.name }} />
      <Image source={{ uri: record.thumbnailPath }} style={[styles.image, { width: size, height: size }]} accessibilityLabel={record.name} />
      <Text testID="detail-name" style={styles.name}>
        {record.name}
      </Text>
      <Text style={styles.meta}>
        {record.score} 点・{TYPE_LABELS[record.type]}・{new Date(record.createdAt).toLocaleDateString('ja-JP')}
      </Text>
      {result && <RadarChart size={Math.min(width - 32, 300)} data={result.radar} />}
      <View style={styles.section}>
        <Text style={styles.heading}>つかった市区町村（{names.length}）</Text>
        <Text style={styles.names}>{names.join('、')}</Text>
      </View>
      <Button testID="detail-delete" variant="danger" label="この作品を削除" onPress={() => setConfirming(true)} style={styles.delete} />
      <ConfirmModal
        visible={confirming}
        danger
        title="削除しますか？"
        confirmLabel="削除する"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await deleteDragon(record.id);
          // 直接この画面を開いた場合は戻り先がないのでギャラリーへ
          if (router.canGoBack()) router.back();
          else router.replace('/gallery');
        }}>
        {`「${record.name}」を削除します。元にもどせません。`}
      </ConfirmModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', padding: 16, gap: 10 },
  image: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fffdf7' },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  meta: { fontSize: 14, color: colors.sub },
  sub: { fontSize: 15, color: colors.sub },
  section: { alignSelf: 'stretch', gap: 6, marginTop: 8 },
  heading: { fontSize: 14, fontWeight: '700', color: colors.ink },
  names: { fontSize: 14, lineHeight: 22, color: colors.ink },
  delete: { alignSelf: 'stretch', marginTop: 12 },
});
