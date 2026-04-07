import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export const Card = ({ children, style }: Props) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 10px 16px rgba(91, 107, 99, 0.08)',
        }
      : {
          shadowColor: '#5b6b63',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: {
            width: 0,
            height: 10,
          },
          elevation: 2,
        }),
  },
});
