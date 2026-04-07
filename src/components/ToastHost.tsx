import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../styles/theme';

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone: 'info' | 'success' | 'error';
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

const toneStyles = {
  info: { backgroundColor: colors.surface, borderColor: colors.border },
  success: { backgroundColor: colors.primaryLight, borderColor: colors.success },
  error: { backgroundColor: '#f6e7e7', borderColor: colors.danger },
} as const;

export const ToastHost = ({ toasts, onDismiss }: Props) => {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm, pointerEvents: 'box-none' }]}>
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          onPress={() => onDismiss(toast.id)}
          style={[styles.toast, toneStyles[toast.tone]]}
        >
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.12)',
        }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }),
  },
  title: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
