import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

export interface TouchCallbacks {
  /** 動かさずに離した */
  onTap?(x: number, y: number): void;
  /** 1 本指ドラッグの開始（x, y は押した位置） */
  onDragStart?(x: number, y: number): void;
  /** 1 本指ドラッグ（dx, dy は前回からの差分） */
  onDrag?(dx: number, dy: number, x: number, y: number): void;
  /**
   * 2 本指（前回からの差分）。factor: 拡大率、angle: 回転（rad）、
   * cx, cy: 2 本指の中点、dx, dy: 中点の移動量。Web ではホイールでも factor が届く。
   */
  onPinch?(factor: number, angle: number, cx: number, cy: number, dx: number, dy: number): void;
  onEnd?(): void;
}

/** ジェスチャーを受ける透明なレイヤー。Web ではブラウザ自身のスクロール・ピンチズームを止める */
const touchLayer: ViewStyle = {
  ...StyleSheet.absoluteFill,
  ...(Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as ViewStyle) : null),
};

const TAP_SLOP = 8;
const TAP_MAX_MS = 600;

interface P {
  x: number;
  y: number;
}

/**
 * ビュー内のタップ・ドラッグ・ピンチ（拡縮＋回転）を React Native 標準の
 * レスポンダーシステムだけで扱う。座標はすべてビュー左上を原点とする。
 */
export function useTouchGestures(callbacks: TouchCallbacks) {
  const cb = useRef(callbacks);
  cb.current = callbacks;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const state = useRef({ ox: 0, oy: 0, start: { x: 0, y: 0 }, startedAt: 0, moved: false, last: [] as P[] });

  const handlers = useMemo(() => {
    const points = (e: GestureResponderEvent): P[] => {
      const s = state.current;
      const ne = e.nativeEvent;
      const touches = ne.touches && ne.touches.length > 0 ? ne.touches : [ne];
      return Array.from(touches, (t) => ({ x: t.pageX - s.ox, y: t.pageY - s.oy }));
    };
    return {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderTerminationRequest: () => false,
      onResponderGrant: (e: GestureResponderEvent) => {
        const s = state.current;
        const ne = e.nativeEvent;
        s.ox = ne.pageX - ne.locationX;
        s.oy = ne.pageY - ne.locationY;
        s.start = { x: ne.locationX, y: ne.locationY };
        s.startedAt = Date.now();
        s.moved = false;
        s.last = points(e);
      },
      onResponderMove: (e: GestureResponderEvent) => {
        const s = state.current;
        const cur = points(e);
        if (cur.length !== s.last.length) {
          // 指の本数が変わったら基準を取り直す
          if (cur.length > 1) s.moved = true;
          s.last = cur;
          return;
        }
        if (cur.length === 1) {
          const p = cur[0];
          if (!s.moved) {
            if (Math.hypot(p.x - s.start.x, p.y - s.start.y) < TAP_SLOP) return;
            s.moved = true;
            s.last = cur;
            cb.current.onDragStart?.(s.start.x, s.start.y);
            return;
          }
          cb.current.onDrag?.(p.x - s.last[0].x, p.y - s.last[0].y, p.x, p.y);
        } else {
          const [a0, b0] = s.last;
          const [a1, b1] = cur;
          const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
          const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
          let angle = Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x);
          if (angle > Math.PI) angle -= 2 * Math.PI;
          if (angle < -Math.PI) angle += 2 * Math.PI;
          const cx = (a1.x + b1.x) / 2;
          const cy = (a1.y + b1.y) / 2;
          s.moved = true;
          cb.current.onPinch?.(
            d0 > 0 ? d1 / d0 : 1,
            angle,
            cx,
            cy,
            cx - (a0.x + b0.x) / 2,
            cy - (a0.y + b0.y) / 2,
          );
        }
        s.last = cur;
      },
      onResponderRelease: () => {
        const s = state.current;
        if (!s.moved && Date.now() - s.startedAt < TAP_MAX_MS) cb.current.onTap?.(s.start.x, s.start.y);
        cb.current.onEnd?.();
      },
      onResponderTerminate: () => cb.current.onEnd?.(),
    };
  }, []);

  // Web: マウスホイールで拡縮
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      cb.current.onPinch?.(Math.exp(-e.deltaY * 0.0015), 0, e.clientX - rect.left, e.clientY - rect.top, 0, 0);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  return { ref, handlers, style: touchLayer };
}
