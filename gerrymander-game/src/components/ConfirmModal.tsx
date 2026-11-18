import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm(): void;
  /** 省略するとキャンセルボタンを出さない */
  onCancel?(): void;
}

export function ConfirmModal(p: Props) {
  return (
    <Modal visible={p.visible} transparent animationType="fade" onRequestClose={p.onCancel ?? p.onConfirm}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{p.title}</Text>
          {typeof p.children === 'string' ? <Text style={styles.body}>{p.children}</Text> : p.children}
          <View style={styles.row}>
            {p.onCancel && (
              <Button label={p.cancelLabel ?? 'やめる'} variant="secondary" onPress={p.onCancel} style={styles.flex} />
            )}
            <Button
              label={p.confirmLabel ?? 'OK'}
              variant={p.danger ? 'danger' : 'primary'}
              onPress={p.onConfirm}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flex: { flex: 1 },
});
