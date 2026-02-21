import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';
import { useProjectContext } from '../core/ProjectContext';
import { useProjectPermissions } from '../hooks/useProjectPermissions';

type Props = {
  onOpenInvites?: () => void;
  onOpenMenu?: () => void;
};

export const TopBar = ({ onOpenInvites, onOpenMenu }: Props) => {
  const { projects, selectedProject, setSelectedProjectId } = useProjectContext();
  const { canViewInvites } = useProjectPermissions();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftGroup}>
          <Pressable onPress={onOpenMenu} style={styles.menuButton}>
            <Text style={styles.menuText}>Menu</Text>
          </Pressable>
          <View>
          <Text style={styles.title}>{selectedProject?.name ?? 'No project selected'}</Text>
          <Text style={styles.subtitle}>Renovation workspace</Text>
          </View>
        </View>
        {canViewInvites && onOpenInvites ? (
          <Pressable onPress={onOpenInvites} style={styles.inviteButton}>
            <Text style={styles.inviteText}>Invites</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.projects}>
        {projects.map((project) => (
          <Pressable
            key={project.id}
            onPress={() => setSelectedProjectId(project.id)}
            style={[
              styles.projectChip,
              project.id === selectedProject?.id ? styles.projectChipActive : null,
            ]}
          >
            <Text
              style={[
                styles.projectChipText,
                project.id === selectedProject?.id ? styles.projectChipTextActive : null,
              ]}
            >
              {project.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  menuText: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  title: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  projects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  inviteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  inviteText: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  projectChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  projectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectChipText: {
    fontSize: typography.small,
    color: colors.text,
  },
  projectChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
