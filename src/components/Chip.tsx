import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

type Props = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

export const Chip = ({ label, tone = 'default' }: Props) => {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: {
    backgroundColor: colors.surfaceMuted,
  },
  success: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  warning: {
    backgroundColor: '#f2e5c6',
    borderColor: '#e2cd9f',
  },
  danger: {
    backgroundColor: '#f1dddd',
    borderColor: '#e5c3c3',
  },
  text: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
