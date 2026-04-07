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
import { useProjectMembers } from '../hooks/useProjectMembers';
import { ProjectInvite, ProjectMemberWithProfile, Role } from '../types';
import { useToast } from '../core/ToastContext';
import { useWorkspaceScroll } from '../core/WorkspaceScrollContext';

type Props = {
  onBack?: () => void;
};

export const InvitesScreen = ({ onBack }: Props) => {
  const { showToast } = useToast();
  const { handleScroll } = useWorkspaceScroll();
  const { selectedProject } = useProjectContext();
  const { canViewInvites, canEditInvites } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('collaborator');
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const projectId = selectedProject?.id;
  const { data: members, isLoading: isLoadingMembers } = useProjectMembers(projectId ?? null);

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
      setCurrentUserId(user?.id ?? null);
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

  const revokeMember = async (member: ProjectMemberWithProfile) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !projectId) return;
    const { error } = await supabase
      .from('project_members')
      .update({ active: false })
      .eq('id', member.id);
    if (error) {
      showToast({ title: 'Failed to revoke access', message: error.message, tone: 'error' });
      return;
    }
    showToast({ title: 'Access revoked', tone: 'success' });
    queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
    queryClient.invalidateQueries({ queryKey: ['invites', projectId] });
  };

  const updateMemberRole = async (member: ProjectMemberWithProfile, newRole: Role) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !projectId) return;
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', member.id);
    if (error) {
      showToast({ title: 'Failed to update role', message: error.message, tone: 'error' });
      return;
    }
    showToast({ title: 'Role updated', tone: 'success' });
    queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
  };

  const hasInvites = (invites?.length ?? 0) > 0;
  const isOwner = selectedProject && currentUserId && selectedProject.owner_id === currentUserId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
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

      {canViewInvites && projectId ? (
        <Card style={styles.membersCard}>
          <Text style={styles.cardTitle}>Project members</Text>
          <Text style={styles.membersSubtitle}>Who has access to this project</Text>
          {isLoadingMembers ? (
            <Text style={styles.memberMuted}>Loading...</Text>
          ) : !members || members.length === 0 ? (
            <EmptyState title="No members" description="Invite collaborators to add members." />
          ) : (
            members.map((member) => {
              const memberName = member.profile?.full_name?.trim() || 'Collaborator';
              const memberIsOwner = member.user_id === selectedProject?.owner_id;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.inviteTitle}>{memberName}</Text>
                    <Text style={styles.inviteRole}>Role: {member.role}</Text>
                  </View>
                  {canEditInvites && !memberIsOwner ? (
                    <View style={styles.memberActions}>
                      <View style={styles.roleRow}>
                        {(['collaborator', 'viewer'] as Role[]).map((r) => (
                          <Button
                            key={r}
                            label={r}
                            onPress={() => updateMemberRole(member, r)}
                            variant={member.role === r ? 'primary' : 'secondary'}
                            style={styles.roleChip}
                          />
                        ))}
                      </View>
                      <Button label="Revoke" onPress={() => revokeMember(member)} variant="secondary" style={styles.revokeButton} />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
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
  membersCard: {
    marginTop: spacing.lg,
  },
  membersSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  memberMuted: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  memberRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberInfo: {
    marginBottom: spacing.xs,
  },
  memberActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  roleChip: {
    minWidth: 90,
  },
  revokeButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});
