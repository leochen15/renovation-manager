import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  email: string;
  onBackToLogin: () => void;
};

export const EmailVerificationModal = ({ visible, email, onBackToLogin }: Props) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBackToLogin}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onBackToLogin} />
        <View style={styles.card}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.message}>
            We've sent a verification email to {email}. Please check your inbox and click the verification link to activate your account.
          </Text>
          <Text style={styles.submessage}>
            After verifying your email, you can return here to sign in.
          </Text>
          <View style={styles.actions}>
            <Button label="Back to Login" onPress={onBackToLogin} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  submessage: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  actions: {
    marginTop: spacing.md,
  },
});

