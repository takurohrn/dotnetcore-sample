import { Canvas, Fill, Group, Path, Skia } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { candidates } from '../geo/adjacency';
import { findMunicipalityAt, getGeo } from '../geo/data';
import { basePaths, municipalityPath } from '../geo/paths';
import { colors } from '../theme';
import { Button } from './Button';
import { useTouchGestures } from './useTouchGestures';

/** 初期表示（日本全体）に対して何倍まで拡大できるか */
const MAX_ZOOM = 300;
/** この倍率以上で市区町村境を表示する（それ未満は都道府県境のみ） */
const MUNICIPALITY_BORDER_ZOOM = 4;

interface Props {
  selected: string[];
  onTapMunicipality(code: string): void;
}

function combine(codes: string[]) {
  const b = Skia.PathBuilder.Make();
  for (const c of codes) b.addPath(municipalityPath(c));
  return b.build();
}

export function MapView({ selected, onTapMunicipality }: Props) {
  const geo = getGeo();
  const { land, borders } = useMemo(basePaths, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [detailed, setDetailed] = useState(false);

  // 画面座標 = マップ座標 × k + (tx, ty)
  const view = useRef({ k: 1, tx: 0, ty: 0, fit: 1 });
  const transform = useSharedValue([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  const prefStroke = useSharedValue(1);
  const selectedStroke = useSharedValue(2);

  const apply = useCallback(() => {
    const v = view.current;
    transform.value = [{ translateX: v.tx }, { translateY: v.ty }, { scale: v.k }];
    prefStroke.value = 1 / v.k;
    selectedStroke.value = 2 / v.k;
    setDetailed(v.k >= v.fit * MUNICIPALITY_BORDER_ZOOM);
  }, [transform, prefStroke, selectedStroke]);

  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      const v = view.current;
      const k = Math.min(v.fit * MAX_ZOOM, Math.max(v.fit * 0.8, v.k * factor));
      v.tx = cx - ((cx - v.tx) * k) / v.k;
      v.ty = cy - ((cy - v.ty) * k) / v.k;
      v.k = k;
      apply();
    },
    [apply],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w === size.w && h === size.h) return;
    setSize({ w, h });
    if (size.w === 0) {
      // 初期表示: 日本全体
      const b = geo.bounds;
      const fit = Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY)) * 0.95;
      view.current = {
        k: fit,
        fit,
        tx: w / 2 - ((b.minX + b.maxX) / 2) * fit,
        ty: h / 2 - ((b.minY + b.maxY) / 2) * fit,
      };
      apply();
    }
  };

  const gestures = useTouchGestures({
    onTap: (x, y) => {
      const v = view.current;
      const hit = findMunicipalityAt((x - v.tx) / v.k, (y - v.ty) / v.k);
      if (hit) onTapMunicipality(hit.code);
    },
    onDrag: (dx, dy) => {
      view.current.tx += dx;
      view.current.ty += dy;
      apply();
    },
    onPinch: (factor, _angle, cx, cy, dx, dy) => {
      view.current.tx += dx;
      view.current.ty += dy;
      zoomAt(factor, cx, cy);
    },
  });

  const selectedPath = useMemo(() => combine(selected), [selected]);
  const candidatePath = useMemo(() => combine(candidates(selected, geo.adjacency)), [selected, geo]);
  useEffect(() => apply(), [apply]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color={colors.sea} />
        <Group transform={transform}>
          <Path path={land} color={colors.land} />
          {detailed && <Path path={borders} color={colors.border} style="stroke" strokeWidth={0} />}
          <Path path={candidatePath} color={colors.candidate} opacity={0.45} />
          <Path path={land} color={colors.prefBorder} style="stroke" strokeWidth={prefStroke} />
          <Path path={selectedPath} color={colors.selected} opacity={0.8} />
          <Path path={selectedPath} color="#14432a" style="stroke" strokeWidth={selectedStroke} />
        </Group>
      </Canvas>
      <View
        ref={gestures.ref}
        testID="map-touch"
        accessibilityLabel="日本地図。タップで市区町村を選択"
        style={gestures.style}
        {...gestures.handlers}
      />
      <View style={styles.zoom}>
        <Button small variant="secondary" label="＋" onPress={() => zoomAt(1.6, size.w / 2, size.h / 2)} />
        <Button small variant="secondary" label="－" onPress={() => zoomAt(1 / 1.6, size.w / 2, size.h / 2)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: colors.sea },
  zoom: { position: 'absolute', right: 12, top: 12, gap: 8 },
});
