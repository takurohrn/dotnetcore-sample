import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { saveDragon } from '../src/db/dragons';
import { TYPE_LABELS } from '../src/scoring/constants';
import { useDraft } from '../src/store/draft';
import { colors } from '../src/theme';

const DEFAULT_NAME = '名もなきドラゴン';
const MAX_NAME_LENGTH = 20;

export default function Save() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useDraft();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft.shape || !draft.result) return <Redirect href="/" />;
  const { result } = draft;

  const save = async () => {
    if (!draft.thumbnail) {
      setError('画像を作れませんでした。前の画面にもどって、もう一度「保存する」を押してください。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDragon(
        {
          name: name.trim().slice(0, MAX_NAME_LENGTH) || DEFAULT_NAME,
          codes: draft.selected,
          rotation: draft.rotation,
          colors: draft.colors,
          parts: draft.parts,
          score: result.score,
          type: result.type,
        },
        draft.thumbnail,
      );
      router.dismissAll();
      router.push('/gallery');
      draft.reset();
    } catch (e) {
      setError(`保存できませんでした：${e instanceof Error ? e.message : String(e)}`);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        {draft.thumbnail && (
          <Image
            source={{ uri: `data:image/png;base64,${draft.thumbnail}` }}
            style={styles.thumb}
            accessibilityLabel="作品の画像"
          />
        )}
        <Text style={styles.summary}>
          {result.score} 点・{TYPE_LABELS[result.type]}
        </Text>
        <Text style={styles.label}>なまえ（{MAX_NAME_LENGTH} 文字まで）</Text>
        <TextInput
          testID="save-name"
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          placeholder={DEFAULT_NAME}
          placeholderTextColor={colors.sub}
          returnKeyType="done"
          accessibilityLabel="ドラゴンのなまえ"
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button testID="save-submit" label={busy ? '保存中…' : '保存する'} disabled={busy} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 16, gap: 10, alignItems: 'center' },
  thumb: { width: 200, height: 200, borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  summary: { fontSize: 16, fontWeight: '700', color: colors.ink },
  label: { alignSelf: 'stretch', fontSize: 13, color: colors.sub, marginTop: 8 },
  input: {
    alignSelf: 'stretch',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    fontSize: 17,
    color: colors.ink,
  },
  error: { alignSelf: 'stretch', fontSize: 14, lineHeight: 20, color: colors.danger },
  bar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
});
