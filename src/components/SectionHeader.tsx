import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';

export const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h1,
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textMuted,
  },
});
