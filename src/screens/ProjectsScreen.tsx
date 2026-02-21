import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useProjectContext } from '../core/ProjectContext';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { colors, spacing, typography } from '../styles/theme';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { defaultRolePermissions, resolvePermissions } from '../lib/permissions';
import { Role, ProjectInvite } from '../types';
import { ProjectsStackParamList } from '../core/ProjectsNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { useToast } from '../core/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePendingInvites } from '../hooks/usePendingInvites';

export const ProjectsScreen = () => {
  const { showToast } = useToast();
  const { projects, selectedProject, selectedRole, setSelectedProjectId, refetchProjects } = useProjectContext();
  const queryClient = useQueryClient();
  const navigation = useNavigation<StackNavigationProp<ProjectsStackParamList>>();
  const { data: rolePermissions } = useRolePermissions(selectedProject?.id ?? null);
  const { data: pendingInvites } = usePendingInvites();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentEmail(user?.email ?? null);
    };
    loadUser();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast({ title: 'Project name required', tone: 'error' });
      return;
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast({ title: 'Not signed in', tone: 'error' });
      setLoading(false);
      return;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({ name, address, owner_id: user.id })
      .select()
      .single();

    if (error || !project) {
      showToast({ title: 'Failed to create project', message: error?.message ?? 'Unknown error', tone: 'error' });
      setLoading(false);
      return;
    }

    await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
    });

    await supabase.from('project_role_permissions').insert(
      (['owner', 'collaborator', 'viewer'] as Role[]).map((role) => ({
        project_id: project.id,
        role,
        ...defaultRolePermissions[role],
      }))
    );

    setName('');
    setAddress('');
    queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
    setLoading(false);
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
    queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
    refetchProjects();
    showToast({ title: 'Invite accepted', message: 'You have been added to the project.', tone: 'success' });
  };

  const permissionsByRole = useMemo(() => {
    const roles: Role[] = ['owner', 'collaborator', 'viewer'];
    return roles.reduce((acc, role) => {
      const match = rolePermissions?.find((item) => item.role === role);
      const overrides = match
        ? {
            can_view_schedule: match.can_view_schedule,
            can_edit_schedule: match.can_edit_schedule,
            can_view_noticeboard: match.can_view_noticeboard,
            can_edit_noticeboard: match.can_edit_noticeboard,
            can_view_trades: match.can_view_trades,
            can_edit_trades: match.can_edit_trades,
            can_view_budget: match.can_view_budget,
            can_edit_budget: match.can_edit_budget,
            can_view_invites: match.can_view_invites,
            can_edit_invites: match.can_edit_invites,
          }
        : null;
      acc[role] = resolvePermissions(role, overrides);
      return acc;
    }, {} as Record<Role, ReturnType<typeof resolvePermissions>>);
  }, [rolePermissions]);

  const updatePermission = async (role: Role, field: keyof ReturnType<typeof resolvePermissions>, value: boolean) => {
    if (!selectedProject) return;
    const current = permissionsByRole[role];
    if (!current) return;

    const next = { ...current, [field]: value };
    if (field.startsWith('can_view_') && !value) {
      const editField = field.replace('can_view_', 'can_edit_') as keyof typeof next;
      if (editField in next) next[editField] = false;
    }
    if (field.startsWith('can_edit_') && value) {
      const viewField = field.replace('can_edit_', 'can_view_') as keyof typeof next;
      if (viewField in next) next[viewField] = true;
    }

    const { error } = await supabase.from('project_role_permissions').upsert({
      project_id: selectedProject.id,
      role,
      ...next,
    });

    if (error) {
      showToast({ title: 'Failed to update permissions', message: error.message, tone: 'error' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedProject.id] });
  };

  const insets = useSafeAreaInsets();
  const permissionSections = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'noticeboard', label: 'Noticeboard' },
    { key: 'trades', label: 'Trades' },
    { key: 'budget', label: 'Budget' },
    { key: 'invites', label: 'Invites' },
  ] as const;

  const hasPendingInvites = pendingInvites && pendingInvites.length > 0;
  const userPendingInvites = pendingInvites?.filter((invite) => invite.email === currentEmail) ?? [];

  return (
    <ScrollView style={[styles.container, { paddingTop: spacing.xl + insets.top }]} contentContainerStyle={styles.content}>
      <SectionHeader title="Projects" subtitle="Create and manage your renovation projects." />
      
      {userPendingInvites.length > 0 ? (
        <Card style={styles.invitesCard}>
          <Text style={styles.cardTitle}>Pending Invites</Text>
          <Text style={styles.invitesSubtitle}>You have been invited to join these projects:</Text>
          {userPendingInvites.map((invite) => (
            <Card key={invite.id} style={styles.inviteCard}>
              {invite.project ? (
                <>
                  <Text style={styles.inviteTitle}>{invite.project.name}</Text>
                  {invite.project.address ? (
                    <Text style={styles.inviteSubtitle}>{invite.project.address}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.inviteTitle}>Project Invite</Text>
              )}
              <Text style={styles.inviteRole}>Role: {invite.role}</Text>
              <Button label="Accept invite" onPress={() => acceptInvite(invite)} />
            </Card>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Create new project</Text>
        <Input label="Project name" value={name} onChangeText={setName} placeholder="Beach house remodel" />
        <Input label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St" />
        <Button label={loading ? 'Creating...' : 'Create project'} onPress={handleCreate} disabled={loading} />
      </Card>

      <Text style={styles.listTitle}>Your projects</Text>
      {projects.map((project) => (
        <Pressable
          key={project.id}
          onPress={() => {
            setSelectedProjectId(project.id);
            navigation.navigate('ProjectWorkspace');
          }}
        >
          <Card style={project.id === selectedProject?.id ? styles.activeCard : undefined}>
            <Text style={styles.projectTitle}>{project.name}</Text>
            {project.address ? <Text style={styles.projectSubtitle}>{project.address}</Text> : null}
          </Card>
        </Pressable>
      ))}
      {selectedProject && selectedRole === 'owner' ? (
        <Card>
          <Text style={styles.cardTitle}>Role permissions</Text>
          {(['owner', 'collaborator', 'viewer'] as Role[]).map((role) => (
            <View key={role} style={styles.permissionGroup}>
              <Text style={styles.roleTitle}>{role}</Text>
              <View style={styles.permissionSectionsContainer}>
                {permissionSections.map((section) => {
                  const viewKey = `can_view_${section.key}` as keyof ReturnType<typeof resolvePermissions>;
                  const editKey = `can_edit_${section.key}` as keyof ReturnType<typeof resolvePermissions>;
                  const permissionSet = permissionsByRole[role];
                  return (
                    <View key={section.key} style={styles.permissionRow}>
                      <Text style={styles.permissionLabel}>{section.label}</Text>
                      <View style={styles.permissionSwitches}>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>View</Text>
                          <Switch
                            value={!!permissionSet?.[viewKey]}
                            onValueChange={(value) => updatePermission(role, viewKey, value)}
                          />
                        </View>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>Edit</Text>
                          <Switch
                            value={!!permissionSet?.[editKey]}
                            onValueChange={(value) => updatePermission(role, editKey, value)}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <Card>
        <Text style={styles.cardTitle}>Account</Text>
        <Button label="Sign out" onPress={() => supabase.auth.signOut()} variant="secondary" />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background
  },
  content: {
    paddingBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  listTitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  projectTitle: {
    fontSize: typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  projectSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activeCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  permissionGroup: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleTitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  permissionSectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  permissionRow: {
    flex: 1,
    minWidth: 120,
  },
  permissionLabel: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  permissionSwitches: {
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: typography.body,
    color: colors.text,
  },
  invitesCard: {
    marginBottom: spacing.md,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  inviteCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
  invitesSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});
