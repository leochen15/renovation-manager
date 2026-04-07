import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useProjectContext } from '../core/ProjectContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import { colors, spacing, typography } from '../styles/theme';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { Notice } from '../types';
import { useToast } from '../core/ToastContext';
import { useWorkspaceScroll } from '../core/WorkspaceScrollContext';

export const NoticeboardScreen = () => {
  const { showToast } = useToast();
  const { handleScroll } = useWorkspaceScroll();
  const { selectedProject } = useProjectContext();
  const { canViewNoticeboard, canEditNoticeboard } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');

  const projectId = selectedProject?.id;

  const { data: notices } = useQuery({
    queryKey: ['notices', projectId],
    enabled: !!projectId && canViewNoticeboard,
    queryFn: async () => {
      if (!projectId) return [] as Notice[];
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notice[];
    },
  });

  const submit = async () => {
    if (!projectId) return;
    if (!title.trim() || !body.trim()) {
      showToast({ title: 'Title and body required', tone: 'error' });
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('notices').insert({
      project_id: projectId,
      title,
      body,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      created_by: user.id,
    });

    if (error) {
      showToast({ title: 'Failed to add notice', message: error.message, tone: 'error' });
      return;
    }

    setTitle('');
    setBody('');
    setTags('');
    queryClient.invalidateQueries({ queryKey: ['notices', projectId] });
  };

  const removeNotice = async (noticeId: string) => {
    if (!projectId) return;
    const { error } = await supabase.from('notices').delete().eq('id', noticeId);
    if (error) {
      showToast({ title: 'Failed to delete notice', message: error.message, tone: 'error' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['notices', projectId] });
  };

  const hasNotices = (notices?.length ?? 0) > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
      <SectionHeader title="Noticeboard" subtitle="Capture decisions, updates, and issues." />
      {!canViewNoticeboard ? (
        <EmptyState title="View-only access" description="You do not have access to view the noticeboard." />
      ) : null}
      {!projectId ? (
        <EmptyState title="Select a project" description="Create or select a project to see notices." />
      ) : null}
      {projectId && canViewNoticeboard && canEditNoticeboard ? (
      <Card>
        <Text style={styles.cardTitle}>New notice</Text>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Tile delivery delay" />
        <Input label="Details" value={body} onChangeText={setBody} placeholder="Supplier is pushing by 3 days" multiline />
        <Input label="Tags" value={tags} onChangeText={setTags} placeholder="decision, issue" />
        <Button label="Post notice" onPress={submit} />
      </Card>
      ) : null}

      {projectId && canViewNoticeboard && !hasNotices ? (
        <EmptyState title="No notices yet" description="Post your first update to keep everyone aligned." />
      ) : null}
      {projectId && canViewNoticeboard && hasNotices ? (
        notices?.map((notice) => (
          <Card key={notice.id}>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMeta}>
              Posted {format(parseISO(notice.created_at), 'MMM d, yyyy')}
            </Text>
            <Text style={styles.noticeBody}>{notice.body}</Text>
            <View style={styles.tagRow}>
              {notice.tags?.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </View>
            {canEditNoticeboard ? (
              <View style={styles.noticeActions}>
                <Button label="Delete" onPress={() => removeNotice(notice.id)} variant="secondary" />
              </View>
            ) : null}
          </Card>
        ))
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  noticeTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noticeBody: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  noticeMeta: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  noticeActions: {
    marginTop: spacing.md,
  },
});
