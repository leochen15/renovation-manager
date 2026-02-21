import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useProjectContext } from '../core/ProjectContext';
import { colors, spacing, typography } from '../styles/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAllProjects?: () => void;
};

export const ProjectSwitcherModal = ({ visible, onClose, onAllProjects }: Props) => {
  const { projects, selectedProject, setSelectedProjectId } = useProjectContext();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Switch project</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {projects.map((project) => {
              const active = project.id === selectedProject?.id;
              return (
                <Pressable
                  key={project.id}
                  style={[styles.item, active ? styles.itemActive : null]}
                  onPress={() => {
                    setSelectedProjectId(project.id);
                    onClose();
                  }}
                >
                  <Text style={[styles.itemTitle, active ? styles.itemTitleActive : null]}>{project.name}</Text>
                  {project.address ? <Text style={styles.itemSubtitle}>{project.address}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            {onAllProjects ? (
              <Button label="All Projects" onPress={onAllProjects} />
            ) : null}
            <Button label="Close" onPress={onClose} variant="secondary" />
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
    maxHeight: '80%',
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
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  item: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemActive: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  itemTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  itemTitleActive: {
    color: colors.primary,
  },
  itemSubtitle: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
