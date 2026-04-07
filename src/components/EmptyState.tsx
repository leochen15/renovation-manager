import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';

export const EmptyState = ({ title, description }: { title: string; description: string }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
});
