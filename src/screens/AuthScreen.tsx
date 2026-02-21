import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmailVerificationModal } from '../components/EmailVerificationModal';
import { colors, spacing, typography } from '../styles/theme';
import { useToast } from '../core/ToastContext';

export const AuthScreen = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showToast({ title: 'Sign in failed', message: error.message, tone: 'error' });
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      showToast({ title: 'Sign up failed', message: error.message, tone: 'error' });
    } else {
      setShowVerificationModal(true);
    }
  };

  const handleBackToLogin = () => {
    setShowVerificationModal(false);
    setEmail('');
    setPassword('');
  };

  const handleMagicLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) showToast({ title: 'Magic link failed', message: error.message, tone: 'error' });
    else showToast({ title: 'Check your email', message: 'Magic link sent.', tone: 'success' });
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Freno</Text>
          <Text style={styles.subtitle}>Manage your renovation in one place.</Text>
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" returnKeyType="next" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleSignIn} />
          <Button label={loading ? 'Working...' : 'Sign In'} onPress={handleSignIn} disabled={loading} />
          <View style={styles.spacer} />
          <Button label="Create Account" onPress={handleSignUp} variant="secondary" disabled={loading} />
          <View style={styles.spacer} />
          <Button label="Send Magic Link" onPress={handleMagicLink} variant="ghost" disabled={loading} />
        </View>
      </View>
      <EmailVerificationModal visible={showVerificationModal} email={email} onBackToLogin={handleBackToLogin} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  spacer: {
    height: spacing.sm,
  },
});
