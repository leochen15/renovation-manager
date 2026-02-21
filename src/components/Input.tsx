import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  inputMode?: TextInputProps['inputMode'];
  type?: string;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
};

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  keyboardType,
  inputMode,
  type,
  onSubmitEditing,
  returnKeyType,
  onFocus,
  onBlur,
}: Props) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline ? styles.multiline : null]}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        inputMode={inputMode}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        onFocus={onFocus}
        onBlur={onBlur}
        // @ts-expect-error web-only input type support
        type={type}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
