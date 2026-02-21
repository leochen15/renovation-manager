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
    backgroundColor: colors.surfaceAlt,
  },
  default: {
    backgroundColor: colors.surfaceAlt,
  },
  success: {
    backgroundColor: colors.primaryLight,
  },
  warning: {
    backgroundColor: '#f7edd6',
  },
  danger: {
    backgroundColor: '#f8e0e0',
  },
  text: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
  },
});
