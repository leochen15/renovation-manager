import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProjectContext } from '../core/ProjectContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { colors, spacing, typography } from '../styles/theme';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { ProjectInvite, Role } from '../types';
import { useToast } from '../core/ToastContext';

type Props = {
  onBack?: () => void;
};

export const InvitesScreen = ({ onBack }: Props) => {
  const { showToast } = useToast();
  const { selectedProject } = useProjectContext();
  const { canViewInvites, canEditInvites } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('collaborator');
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const projectId = selectedProject?.id;

  const { data: invites } = useQuery({
    queryKey: ['invites', projectId],
    enabled: true,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [] as ProjectInvite[];
      
      // If no project selected, show all pending invites for the user
      if (!projectId) {
        const { data, error } = await supabase
          .from('project_invites')
          .select('*, project:projects(*)')
          .eq('email', user.email)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as ProjectInvite[];
      }
      
      // If project selected, show invites for that project or for the user's email
      const { data, error } = await supabase
        .from('project_invites')
        .select('*, project:projects(*)')
        .or(`email.eq.${user.email},project_id.eq.${projectId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectInvite[];
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  const submit = async () => {
    if (!projectId) return;
    if (!email.trim()) {
      showToast({ title: 'Email required', tone: 'error' });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('project_invites').insert({
      project_id: projectId,
      email,
      invited_by: user.id,
      role,
    });

    if (error) {
      showToast({ title: 'Failed to send invite', message: error.message, tone: 'error' });
      return;
    }

    setEmail('');
    queryClient.invalidateQueries({ queryKey: ['invites', projectId] });
  };

  const acceptInvite = async (invite: ProjectInvite) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: invite.project_id,
      user_id: user.id,
      role: invite.role ?? 'collaborator',
    });

    if (memberError) {
      showToast({ title: 'Failed to accept invite', message: memberError.message, tone: 'error' });
      return;
    }

    await supabase.from('project_invites').delete().eq('id', invite.id);
    queryClient.invalidateQueries({ queryKey: ['invites', projectId] });
    queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
  };

  const hasInvites = (invites?.length ?? 0) > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Invites" subtitle="Invite collaborators to your project." />
      {!canViewInvites ? (
        <EmptyState title="View-only access" description="You do not have access to view invites." />
      ) : null}
      {onBack ? (
        <Button label="Back to dashboard" onPress={onBack} variant="secondary" style={styles.backButton} />
      ) : null}
      {canViewInvites && canEditInvites ? (
        <Card>
          <Text style={styles.cardTitle}>Send invite</Text>
          <Input label="Collaborator email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <View style={styles.roleRow}>
            {(['collaborator', 'viewer'] as Role[]).map((value) => (
              <Button
                key={value}
                label={value}
                onPress={() => setRole(value)}
                variant={role === value ? 'primary' : 'secondary'}
                style={styles.roleButton}
              />
            ))}
          </View>
          <Button label="Send invite" onPress={submit} />
        </Card>
      ) : null}

      {canViewInvites ? (
        !hasInvites ? (
          <EmptyState title="No pending invites" description={projectId ? "Send an invite to collaborate." : "You have no pending project invites."} />
        ) : (
          invites?.map((invite) => (
            <Card key={invite.id}>
              {invite.project ? (
                <Text style={styles.inviteTitle}>{invite.project.name}</Text>
              ) : (
                <Text style={styles.inviteTitle}>{invite.email}</Text>
              )}
              {invite.project?.address ? (
                <Text style={styles.inviteSubtitle}>{invite.project.address}</Text>
              ) : null}
              <Text style={styles.inviteRole}>Role: {invite.role}</Text>
              {currentEmail && invite.email === currentEmail ? (
                <Button label="Accept invite" onPress={() => acceptInvite(invite)} variant="secondary" />
              ) : null}
            </Card>
          ))
        )
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inviteTitle: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inviteSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  inviteRole: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  roleButton: {
    flexGrow: 1,
    minWidth: 140,
  },
});
