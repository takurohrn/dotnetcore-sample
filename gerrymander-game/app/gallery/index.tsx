import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { listDragons } from '../../src/db/dragons';
import type { DragonRecord } from '../../src/db/types';
import { TYPE_LABELS } from '../../src/scoring/constants';
import { useDraft } from '../../src/store/draft';
import { colors } from '../../src/theme';

export default function Gallery() {
  const router = useRouter();
  const [items, setItems] = useState<DragonRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listDragons()
        .then(setItems)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }, []),
  );

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>作品を読みこめませんでした：{error}</Text>
      </View>
    );
  }
  if (items === null) return <View style={styles.empty} />;
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>まだ作品がありません</Text>
        <Text style={styles.emptyText}>地図からドラゴンを見つけて、最初の 1 匹を保存しよう。</Text>
        <Button
          label="あたらしくつくる"
          onPress={() => {
            useDraft.getState().reset();
            router.push('/select');
          }}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(d) => d.id}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.columns}
      renderItem={({ item }) => (
        <Pressable
          testID="gallery-item"
          accessibilityRole="button"
          accessibilityLabel={`${item.name}、${item.score}点`}
          onPress={() => router.push({ pathname: '/gallery/[id]', params: { id: item.id } })}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <Image source={{ uri: item.thumbnailPath }} style={styles.thumb} />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {item.score} 点・{TYPE_LABELS[item.type]}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 12 },
  columns: { gap: 12 },
  card: {
    flex: 1,
    maxWidth: '50%',
    padding: 8,
    gap: 4,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#fffdf7' },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12, color: colors.sub },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.bg },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  emptyText: { fontSize: 14, lineHeight: 21, color: colors.sub, textAlign: 'center' },
});
