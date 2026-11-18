import { Canvas, Group } from '@shopify/react-native-skia';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/Button';
import { DRAGON_FIT, DragonCanvas, PartGlyph, canvasToDragon } from '../src/components/DragonCanvas';
import { useTouchGestures } from '../src/components/useTouchGestures';
import { findMunicipalityAt } from '../src/geo/data';
import { PARTS, PART_BASE_SIZE } from '../src/parts/catalog';
import { PAINTS } from '../src/parts/paints';
import { useDraft } from '../src/store/draft';
import { colors } from '../src/theme';

type Mode = 'paint' | 'parts' | 'rotate';
const MODES: { id: Mode; label: string }[] = [
  { id: 'paint', label: 'いろ' },
  { id: 'parts', label: 'パーツ' },
  { id: 'rotate', label: 'むき' },
];
const PALETTE_COLUMNS = 5;

export default function Paint() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { selected, shape, rotation, colors: fills, parts } = useDraft();
  const [mode, setMode] = useState<Mode>('paint');
  const [paintId, setPaintId] = useState(PAINTS[0].id);
  const [activePart, setActivePart] = useState<number | null>(null);
  const dragging = useRef<number | null>(null);

  const size = Math.round(Math.min(window.width, window.height * 0.48, 560));
  const store = useDraft.getState;

  const partAt = (x: number, y: number): number | null => {
    const [dx, dy] = canvasToDragon(x, y, size, rotation);
    const list = store().parts;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (Math.hypot(dx - p.x, dy - p.y) <= PART_BASE_SIZE * p.scale * 0.6) return i;
    }
    return null;
  };

  const gestures = useTouchGestures({
    onTap: (x, y) => {
      if (mode === 'paint' && shape) {
        const [dx, dy] = canvasToDragon(x, y, size, rotation);
        const { cx, cy, radius } = shape.frame;
        const hit = findMunicipalityAt(dx * radius + cx, dy * radius + cy, selected);
        if (hit) store().paint(hit.code, paintId);
      } else if (mode === 'parts') {
        setActivePart(partAt(x, y));
      }
    },
    onDragStart: (x, y) => {
      if (mode !== 'parts') return;
      const hit = partAt(x, y);
      if (hit !== null) setActivePart(hit);
      dragging.current = hit ?? activePart;
    },
    onDrag: (dx, dy) => {
      if (mode === 'rotate') {
        store().setRotation(store().rotation + dx * 0.5);
        return;
      }
      const i = dragging.current;
      const part = i === null ? undefined : store().parts[i];
      if (mode !== 'parts' || i === null || !part) return;
      // 画面上の移動量をドラゴン座標（回転を戻し、外接円半径 = 1）に直す
      const r = (-rotation * Math.PI) / 180;
      const s = size * DRAGON_FIT;
      store().updatePart(i, {
        x: part.x + (dx * Math.cos(r) - dy * Math.sin(r)) / s,
        y: part.y + (dx * Math.sin(r) + dy * Math.cos(r)) / s,
      });
    },
    onPinch: (factor, angle) => {
      const deg = (angle * 180) / Math.PI;
      if (mode === 'rotate') {
        store().setRotation(store().rotation + deg);
      } else if (mode === 'parts' && activePart !== null) {
        const part = store().parts[activePart];
        if (part) store().updatePart(activePart, { scale: part.scale * factor, rotation: part.rotation + deg });
      }
    },
    onEnd: () => {
      dragging.current = null;
    },
  });

  if (!shape) return <Redirect href="/select" />;

  const active = activePart !== null ? parts[activePart] : undefined;
  const adjust = (patch: { scale?: number; rotation?: number }) => {
    if (activePart === null || !active) return;
    store().updatePart(activePart, {
      scale: active.scale * (patch.scale ?? 1),
      rotation: active.rotation + (patch.rotation ?? 0),
    });
  };
  const cell = Math.floor(Math.min(window.width - 32, 400) / PALETTE_COLUMNS);
  const rows = Math.ceil(PARTS.length / PALETTE_COLUMNS);

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <View style={{ width: size, height: size }}>
          <DragonCanvas
            size={size}
            codes={selected}
            frame={shape.frame}
            rotation={rotation}
            colors={fills}
            parts={parts}
            selectedPart={mode === 'parts' ? activePart : null}
          />
          <View ref={gestures.ref} testID="paint-touch" style={gestures.style} {...gestures.handlers} />
        </View>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            testID={`mode-${m.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m.id }}
            onPress={() => setMode(m.id)}
            style={[styles.tab, mode === m.id && styles.tabActive]}>
            <Text style={[styles.tabLabel, mode === m.id && styles.tabLabelActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        {mode === 'paint' && (
          <>
            <Text style={styles.hint}>色をえらんで、ぬりたい市区町村をタップ</Text>
            <View style={styles.swatches}>
              {PAINTS.map((p) => (
                <Pressable
                  key={p.id}
                  testID={`paint-${p.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                  accessibilityState={{ selected: paintId === p.id }}
                  onPress={() => setPaintId(p.id)}
                  style={[styles.swatch, { backgroundColor: p.color }, paintId === p.id && styles.swatchActive]}>
                  {p.pattern && <Text style={[styles.swatchMark, { color: p.pattern.color }]}>{p.pattern.kind === 'round' ? '︶︶' : '∨∨'}</Text>}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {mode === 'parts' && (
          <>
            <Text style={styles.hint}>タップで追加。ドラッグで移動、2 本指で大きさと向き</Text>
            <View style={{ width: cell * PALETTE_COLUMNS, height: cell * rows, alignSelf: 'center' }}>
              <Canvas style={StyleSheet.absoluteFill}>
                {PARTS.map((p, i) => (
                  <Group
                    key={p.id}
                    transform={[
                      { translateX: (i % PALETTE_COLUMNS) * cell + cell / 2 },
                      { translateY: Math.floor(i / PALETTE_COLUMNS) * cell + cell / 2 },
                    ]}>
                    <PartGlyph partId={p.id} size={cell * 0.7} />
                  </Group>
                ))}
              </Canvas>
              <View style={styles.cells}>
                {PARTS.map((p) => (
                  <Pressable
                    key={p.id}
                    testID={`part-${p.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label}を追加`}
                    onPress={() => setActivePart(store().addPart(p.id))}
                    style={({ pressed }) => [{ width: cell, height: cell }, styles.cell, pressed && styles.cellPressed]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <Button small variant="secondary" label="大" disabled={!active} onPress={() => adjust({ scale: 1.2 })} />
              <Button small variant="secondary" label="小" disabled={!active} onPress={() => adjust({ scale: 1 / 1.2 })} />
              <Button small variant="secondary" label="↺" disabled={!active} onPress={() => adjust({ rotation: -15 })} />
              <Button small variant="secondary" label="↻" disabled={!active} onPress={() => adjust({ rotation: 15 })} />
              <Button
                small
                variant="danger"
                label="けす"
                disabled={!active}
                onPress={() => {
                  if (activePart === null) return;
                  store().removePart(activePart);
                  setActivePart(null);
                }}
              />
            </View>
          </>
        )}

        {mode === 'rotate' && (
          <>
            <Text style={styles.hint}>ドラゴンの向きをきめよう（絵の上を左右にドラッグでも回せます）</Text>
            <View style={styles.row}>
              <Button small variant="secondary" label="↺ 15°" onPress={() => store().setRotation(rotation - 15)} />
              <Button small variant="secondary" label="↺ 1°" onPress={() => store().setRotation(rotation - 1)} />
              <Text testID="rotation-value" style={styles.angle}>
                {Math.round(rotation)}°
              </Text>
              <Button small variant="secondary" label="1° ↻" onPress={() => store().setRotation(rotation + 1)} />
              <Button small variant="secondary" label="15° ↻" onPress={() => store().setRotation(rotation + 15)} />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          testID="paint-evaluate"
          label="評価へ"
          onPress={() => {
            store().runEvaluation();
            router.push('/result');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  stage: { alignItems: 'center', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabs: { flexDirection: 'row', padding: 8, gap: 8 },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  tabLabelActive: { color: '#fff' },
  panel: { flex: 1 },
  panelContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  hint: { fontSize: 13, color: colors.sub, textAlign: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderColor: colors.ink, borderWidth: 4 },
  swatchMark: { fontSize: 13, fontWeight: '800' },
  cells: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 10 },
  cellPressed: { backgroundColor: 'rgba(0,0,0,0.08)' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  angle: { minWidth: 52, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  bar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
});
