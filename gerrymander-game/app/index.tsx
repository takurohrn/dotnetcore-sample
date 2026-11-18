import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { ConfirmModal } from '../src/components/ConfirmModal';
import { MIN_SELECTION } from '../src/scoring/constants';
import { useDraft } from '../src/store/draft';
import { colors } from '../src/theme';

const RULES = [
  `日本地図から、となり合う市区町村を ${MIN_SELECTION} つ以上えらぶ。`,
  'えらんだ形に色をぬり、目や翼などのパーツをはる。',
  '形が「西洋ドラゴン」か「東洋ドラゴン」に近いほど高得点。',
  '名前をつけて保存すると、ギャラリーでいつでも見られる。',
];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rules, setRules] = useState(false);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🐉</Text>
        <Text style={styles.title}>ゲリマンダーをさがせ</Text>
        <Text style={styles.lead}>市区町村をつなげて、地図の中にドラゴンを見つけよう。</Text>
      </View>
      <View style={styles.actions}>
        <Button
          testID="home-new"
          label="あたらしくつくる"
          onPress={() => {
            useDraft.getState().reset();
            router.push('/select');
          }}
        />
        <Button testID="home-gallery" label="ギャラリー" variant="secondary" onPress={() => router.push('/gallery')} />
        <Button label="あそびかた" variant="secondary" onPress={() => setRules(true)} />
      </View>
      <Text style={styles.credit}>地図データ: 「国土数値情報（行政区域データ）」（国土交通省）を加工して作成</Text>

      <ConfirmModal visible={rules} title="あそびかた" confirmLabel="とじる" onConfirm={() => setRules(false)}>
        <View style={styles.rules}>
          {RULES.map((text, i) => (
            <View key={i} style={styles.rule}>
              <Text style={styles.ruleNo}>{i + 1}</Text>
              <Text style={styles.ruleText}>{text}</Text>
            </View>
          ))}
        </View>
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  lead: { fontSize: 15, lineHeight: 22, color: colors.sub, textAlign: 'center' },
  actions: { gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
  credit: { marginTop: 20, fontSize: 11, color: colors.sub, textAlign: 'center' },
  rules: { gap: 10 },
  rule: { flexDirection: 'row', gap: 10 },
  ruleNo: { width: 22, fontSize: 15, fontWeight: '800', color: colors.primary },
  ruleText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink },
});
