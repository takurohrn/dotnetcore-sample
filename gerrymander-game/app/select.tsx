import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { MapView } from '../src/components/MapView';
import { getGeo } from '../src/geo/data';
import { MAX_SELECTION, MIN_SELECTION } from '../src/scoring/constants';
import { useDraft } from '../src/store/draft';
import { colors } from '../src/theme';

const WARNINGS = {
  'not-adjacent': 'えらんだ場所のとなりだけ選べます（海をはさむ場所は選べません）',
  'would-split': 'ここを外すと形が 2 つに分かれてしまいます',
  max: `えらべるのは ${MAX_SELECTION} か所までです`,
};

export default function Select() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selected = useDraft((s) => s.selected);
  const [message, setMessage] = useState<{ text: string; warn: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const show = (text: string, warn: boolean) => {
    setMessage({ text, warn });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  };

  const onTap = (code: string) => {
    const m = getGeo().byCode.get(code)!;
    const label = `${m.prefName} ${m.name}`;
    const wasSelected = selected.includes(code);
    const r = useDraft.getState().toggle(code);
    if (r.ok) show(wasSelected ? `${label} を外しました` : label, false);
    else show(`${label}：${WARNINGS[r.reason]}`, true);
  };

  const enough = selected.length >= MIN_SELECTION;
  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <MapView selected={selected} onTapMunicipality={onTap} />
        {message && (
          <View style={[styles.toast, message.warn && styles.toastWarn]} accessibilityLiveRegion="polite">
            <Text testID="select-message" style={styles.toastText}>
              {message.text}
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.count}>
          <Text testID="select-count" style={styles.countNumber}>
            {selected.length}
          </Text>
          <Text style={styles.countLabel}>
            {enough ? 'か所えらび中' : `か所（あと ${MIN_SELECTION - selected.length} か所以上）`}
          </Text>
        </View>
        <Button
          small
          variant="secondary"
          label="やりなおし"
          disabled={selected.length === 0}
          onPress={() => useDraft.getState().reset()}
        />
        <Button
          small
          testID="select-confirm"
          label="決定"
          disabled={!enough}
          onPress={() => {
            useDraft.getState().confirmSelection();
            router.push('/paint');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 12,
    right: 72,
    top: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(43,42,39,0.88)',
  },
  toastWarn: { backgroundColor: 'rgba(179,64,47,0.95)' },
  toastText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  count: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countNumber: { fontSize: 24, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  countLabel: { flexShrink: 1, fontSize: 12, color: colors.sub },
});
