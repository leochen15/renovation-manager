import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useProjectContext } from '../core/ProjectContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import { colors, radius, spacing, typography } from '../styles/theme';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { Task } from '../types';
import { useToast } from '../core/ToastContext';

const statusTone = {
  planned: 'default',
  in_progress: 'warning',
  blocked: 'danger',
  done: 'success',
} as const;

const baseDayWidth = 24;

type RangeDraft = {
  id?: string;
  start_date: string;
  end_date: string;
  startError?: string | null;
  endError?: string | null;
};

type GroupedTask = {
  groupKey: string;
  project_id: string;
  title: string;
  created_at: string;
  status: Task['status'];
  ranges: Task[];
};

type PickerState = {
  context: 'new' | 'edit';
  index: number;
  field: 'start_date' | 'end_date';
} | null;

const makeGroupKey = (task: Task) => `${task.project_id}::${task.title}::${task.created_at}`;

const parseDateInput = (value: string) => {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const makeRangeKey = (range: Pick<RangeDraft, 'start_date' | 'end_date'>) =>
  `${range.start_date}::${range.end_date}`;

export const ScheduleScreen = () => {
  const { showToast } = useToast();
  const { selectedProject } = useProjectContext();
  const { canViewSchedule, canEditSchedule } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [ranges, setRanges] = useState<RangeDraft[]>([{ start_date: '', end_date: '' }]);
  const [status, setStatus] = useState<'planned' | 'in_progress' | 'blocked' | 'done'>('planned');
  const [editingGroup, setEditingGroup] = useState<GroupedTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRanges, setEditRanges] = useState<RangeDraft[]>([]);
  const [editStatus, setEditStatus] = useState<'planned' | 'in_progress' | 'blocked' | 'done'>('planned');
  const [deletedRangeIds, setDeletedRangeIds] = useState<string[]>([]);
  const [activePicker, setActivePicker] = useState<PickerState>(null);

  const projectId = selectedProject?.id;

  useEffect(() => {
    if (editingGroup) {
      setEditTitle(editingGroup.title);
      setEditRanges(
        editingGroup.ranges
          .slice()
          .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
          .map((range) => ({ id: range.id, start_date: range.start_date, end_date: range.end_date }))
      );
      setEditStatus(editingGroup.status);
      setDeletedRangeIds([]);
    }
  }, [editingGroup]);

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId && canViewSchedule,
    queryFn: async () => {
      if (!projectId) return [] as Task[];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const groupedTasks = useMemo<GroupedTask[]>(() => {
    if (!tasks || tasks.length === 0) return [];
    const groups = new Map<string, GroupedTask>();
    tasks.forEach((task) => {
      const key = makeGroupKey(task);
      const existing = groups.get(key);
      if (existing) {
        existing.ranges.push(task);
      } else {
        groups.set(key, {
          groupKey: key,
          project_id: task.project_id,
          title: task.title,
          created_at: task.created_at,
          status: task.status,
          ranges: [task],
        });
      }
    });
    const grouped = Array.from(groups.values()).map((group) => ({
      ...group,
      ranges: group.ranges.slice().sort((a, b) => (a.start_date > b.start_date ? 1 : -1)),
    }));
    grouped.sort((a, b) => {
      const aStart = a.ranges[0]?.start_date ?? '';
      const bStart = b.ranges[0]?.start_date ?? '';
      return aStart > bStart ? 1 : -1;
    });
    return grouped;
  }, [tasks]);

  const timeline = useMemo(() => {
    if (!groupedTasks || groupedTasks.length === 0) return null;
    const dates = groupedTasks.flatMap((group) =>
      group.ranges.flatMap((range) => [parseISO(range.start_date), parseISO(range.end_date)])
    );
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const days = differenceInCalendarDays(max, min) + 1;
    return { min, max, days };
  }, [groupedTasks]);

  const baseWidth = Dimensions.get('window').width;
  const availableWidth = Platform.OS === 'web' ? baseWidth - spacing.lg * 2 : baseWidth;
  const displayDays = timeline ? timeline.days + 1 : 0;
  const displayDayWidth = timeline
    ? Math.max(baseDayWidth, availableWidth / Math.max(1, displayDays))
    : baseDayWidth;
  const timelineWidth = timeline ? displayDays * displayDayWidth : availableWidth;
  const pickerDisplay = Platform.OS === 'ios' ? 'spinner' : 'default';
  const DateTimePicker =
    Platform.OS === 'web' ? null : (require('@react-native-community/datetimepicker').default as React.ComponentType<any>);

  const updateRangeValue = (
    context: 'new' | 'edit',
    index: number,
    field: 'start_date' | 'end_date',
    value: string
  ) => {
    const setter = context === 'new' ? setRanges : setEditRanges;
    setter((prev) =>
      prev.map((range, idx) => {
        if (idx !== index) return range;
        return {
          ...range,
          [field]: value,
          ...(field === 'start_date' ? { startError: null } : { endError: null }),
        } as RangeDraft;
      })
    );
  };

  const addRange = (context: 'new' | 'edit') => {
    const setter = context === 'new' ? setRanges : setEditRanges;
    setter((prev) => [...prev, { start_date: '', end_date: '' }]);
  };

  const removeRange = (context: 'new' | 'edit', index: number) => {
    const setter = context === 'new' ? setRanges : setEditRanges;
    setter((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (context === 'edit') {
        const removed = prev[index];
        if (removed?.id) {
          setDeletedRangeIds((current) => (current.includes(removed.id as string) ? current : [...current, removed.id as string]));
        }
      }
      return next;
    });
  };

  const handlePickerChange = (context: 'new' | 'edit', index: number, field: 'start_date' | 'end_date') =>
    (_: any, selectedDate: Date | undefined) => {
      if (Platform.OS !== 'ios') setActivePicker(null);
      if (selectedDate) {
        updateRangeValue(context, index, field, format(selectedDate, 'yyyy-MM-dd'));
      }
    };

  const validateRanges = (
    currentRanges: RangeDraft[],
    setter: React.Dispatch<React.SetStateAction<RangeDraft[]>>
  ) => {
    let hasErrors = false;
    const normalized = currentRanges.map((range) => {
      let startError: string | null = null;
      let endError: string | null = null;
      if (!range.start_date) {
        startError = 'Start date is required';
      } else if (!parseDateInput(range.start_date)) {
        startError = 'Use YYYY-MM-DD';
      }

      if (!range.end_date) {
        endError = 'End date is required';
      } else if (!parseDateInput(range.end_date)) {
        endError = 'Use YYYY-MM-DD';
      }

      if (!startError && !endError) {
        const start = parseDateInput(range.start_date);
        const end = parseDateInput(range.end_date);
        if (start && end && differenceInCalendarDays(end, start) < 0) {
          endError = 'End date must be on or after start date.';
        }
      }

      if (startError || endError) {
        hasErrors = true;
      }
      return { ...range, startError, endError };
    });

    setter(normalized);
    const validRanges = normalized.filter((range) => !range.startError && !range.endError);
    return { hasErrors, validRanges };
  };

  const submit = async () => {
    if (!projectId) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast({ title: 'Task name required', tone: 'error' });
      return;
    }

    const { hasErrors, validRanges } = validateRanges(ranges, setRanges);
    if (hasErrors) return;

    const uniqueRanges = validRanges.filter((range, index, list) => {
      const key = makeRangeKey(range);
      return list.findIndex((item) => makeRangeKey(item) === key) === index;
    });

    if (uniqueRanges.length === 0) {
      showToast({ title: 'Add at least one date range', tone: 'error' });
      return;
    }

    const groupCreatedAt = new Date().toISOString();
    const payload = uniqueRanges.map((range) => ({
      project_id: projectId,
      title: trimmedTitle,
      start_date: range.start_date,
      end_date: range.end_date,
      status,
      created_at: groupCreatedAt,
    }));

    const { error } = await supabase.from('tasks').insert(payload);

    if (error) {
      showToast({ title: 'Failed to add task', message: error.message, tone: 'error' });
      return;
    }

    setTitle('');
    setRanges([{ start_date: '', end_date: '' }]);
    setStatus('planned');
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const saveEdit = async () => {
    if (!editingGroup || !projectId) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      showToast({ title: 'Task name required', tone: 'error' });
      return;
    }

    const { hasErrors, validRanges } = validateRanges(editRanges, setEditRanges);
    if (hasErrors) return;

    const uniqueRanges = validRanges.filter((range, index, list) => {
      const key = makeRangeKey(range);
      return list.findIndex((item) => makeRangeKey(item) === key) === index;
    });

    const existingRanges = uniqueRanges.filter((range) => range.id);
    const existingKeys = new Set(existingRanges.map((range) => makeRangeKey(range)));
    const newRanges = uniqueRanges.filter((range) => !range.id && !existingKeys.has(makeRangeKey(range)));

    const { error: groupError } = await supabase
      .from('tasks')
      .update({ title: trimmedTitle, status: editStatus })
      .eq('project_id', projectId)
      .eq('title', editingGroup.title)
      .eq('created_at', editingGroup.created_at);

    if (groupError) {
      showToast({ title: 'Failed to update task', message: groupError.message, tone: 'error' });
      return;
    }

    for (const range of existingRanges) {
      const { error } = await supabase
        .from('tasks')
        .update({ start_date: range.start_date, end_date: range.end_date })
        .eq('id', range.id);
      if (error) {
        showToast({ title: 'Failed to update task', message: error.message, tone: 'error' });
        return;
      }
    }

    if (deletedRangeIds.length > 0) {
      for (const rangeId of deletedRangeIds) {
        const { error } = await supabase.from('tasks').delete().eq('id', rangeId);
        if (error) {
          showToast({ title: 'Failed to remove date range', message: error.message, tone: 'error' });
          return;
        }
      }
    }

    if (newRanges.length > 0) {
      const insertPayload = newRanges.map((range) => ({
        project_id: projectId,
        title: trimmedTitle,
        start_date: range.start_date,
        end_date: range.end_date,
        status: editStatus,
        created_at: editingGroup.created_at,
      }));
      const { error } = await supabase.from('tasks').insert(insertPayload);
      if (error) {
        showToast({ title: 'Failed to add date ranges', message: error.message, tone: 'error' });
        return;
      }
    }

    showToast({ title: 'Task updated' });
    setEditingGroup(null);
    setActivePicker(null);
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const renderRangeFields = (context: 'new' | 'edit', currentRanges: RangeDraft[]) => {
    const isWeb = Platform.OS === 'web';
    return currentRanges.map((range, index) => {
      const canRemove =
        context === 'new' ? currentRanges.length > 1 : currentRanges.length > 1 || !!range.id;
      return (
        <View key={`${context}-range-${range.id ?? index}`} style={styles.rangeBlock}>
          <View style={styles.rangeHeader}>
            <Text style={styles.rangeTitle}>Date range {index + 1}</Text>
            {canRemove ? (
              <Pressable
                onPress={() => removeRange(context, index)}
                accessibilityRole="button"
                accessibilityLabel="Remove date range"
              >
                <Text style={styles.removeLink}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          {isWeb ? (
            <>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Start date</Text>
                <input
                  value={range.start_date}
                  onChange={(event) => updateRangeValue(context, index, 'start_date', event.currentTarget.value)}
                  type="date"
                  style={styles.webDateInput as React.CSSProperties}
                />
                {range.startError ? <Text style={styles.dateErrorText}>{range.startError}</Text> : null}
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>End date</Text>
                <input
                  value={range.end_date}
                  onChange={(event) => updateRangeValue(context, index, 'end_date', event.currentTarget.value)}
                  type="date"
                  style={styles.webDateInput as React.CSSProperties}
                />
                {range.endError ? <Text style={styles.dateErrorText}>{range.endError}</Text> : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Start date</Text>
                <Pressable
                  onPress={() => setActivePicker({ context, index, field: 'start_date' })}
                  style={[styles.dateControl, range.startError ? styles.dateControlError : null]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dateText, !range.start_date ? styles.datePlaceholder : null]}>
                    {range.start_date || 'Select date'}
                  </Text>
                </Pressable>
                {range.startError ? <Text style={styles.dateErrorText}>{range.startError}</Text> : null}
                {activePicker?.context === context &&
                activePicker.index === index &&
                activePicker.field === 'start_date' &&
                DateTimePicker ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={range.start_date ? parseISO(range.start_date) : new Date()}
                      mode="date"
                      display={pickerDisplay}
                      onChange={handlePickerChange(context, index, 'start_date')}
                    />
                    {Platform.OS === 'ios' ? (
                      <Button label="Done" variant="secondary" onPress={() => setActivePicker(null)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>End date</Text>
                <Pressable
                  onPress={() => setActivePicker({ context, index, field: 'end_date' })}
                  style={[styles.dateControl, range.endError ? styles.dateControlError : null]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dateText, !range.end_date ? styles.datePlaceholder : null]}>
                    {range.end_date || 'Select date'}
                  </Text>
                </Pressable>
                {range.endError ? <Text style={styles.dateErrorText}>{range.endError}</Text> : null}
                {activePicker?.context === context &&
                activePicker.index === index &&
                activePicker.field === 'end_date' &&
                DateTimePicker ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={range.end_date ? parseISO(range.end_date) : new Date()}
                      mode="date"
                      display={pickerDisplay}
                      onChange={handlePickerChange(context, index, 'end_date')}
                    />
                    {Platform.OS === 'ios' ? (
                      <Button label="Done" variant="secondary" onPress={() => setActivePicker(null)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      );
    });
  };

  const closeEdit = () => {
    setEditingGroup(null);
    setActivePicker(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Schedule" subtitle="Plan and track your timeline." />
      {!canViewSchedule ? (
        <EmptyState title="View-only access" description="You do not have access to view the schedule." />
      ) : null}
      {!projectId ? (
        <EmptyState title="Select a project" description="Create or select a project to see the schedule." />
      ) : null}
      {projectId && canViewSchedule && (!groupedTasks || groupedTasks.length === 0) ? (
        <EmptyState title="No tasks yet" description="Add tasks to see them on the timeline." />
      ) : null}
      {projectId && canViewSchedule && groupedTasks && groupedTasks.length > 0 ? (
        <View style={styles.ganttWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={[styles.ganttBody, { width: timelineWidth }]}>
              <View style={styles.ganttHeader}>
                {timeline
                  ? Array.from({ length: displayDays }).map((_, index) => {
                      const date = new Date(timeline.min.getTime());
                      date.setDate(date.getDate() + index);
                      return (
                        <View key={index} style={[styles.ganttHeaderCell, { width: displayDayWidth }]}>
                          <Text style={styles.ganttHeaderText}>{format(date, 'MMM d')}</Text>
                        </View>
                      );
                    })
                  : null}
              </View>
              {groupedTasks.map((group) => {
                return (
                  <View key={group.groupKey} style={styles.ganttRow}>
                    <View style={styles.taskLabel}>
                      <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>{group.title}</Text>
                        {canEditSchedule ? (
                          <Pressable
                            onPress={() => setEditingGroup(group)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Edit task"
                          >
                            <Text style={styles.editLink}>Edit</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Chip label={group.status} tone={statusTone[group.status]} />
                    </View>
                    <View style={styles.barTrack}>
                      {group.ranges.map((range, index) => {
                        const start = parseISO(range.start_date);
                        const end = parseISO(range.end_date);
                        const offset = timeline ? differenceInCalendarDays(start, timeline.min) : 0;
                        const duration = differenceInCalendarDays(end, start) + 1;
                        return (
                          <View
                            key={range.id ?? `${group.groupKey}-${index}`}
                            style={[
                              styles.bar,
                              {
                                left: offset * displayDayWidth,
                                width: duration * displayDayWidth,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {projectId && canViewSchedule && canEditSchedule ? (
        <Card>
          <Text style={styles.cardTitle}>New task</Text>
          <Input label="Task name" value={title} onChangeText={setTitle} placeholder="Install cabinets" />
          {renderRangeFields('new', ranges)}
          <Pressable
            onPress={() => addRange('new')}
            accessibilityRole="button"
            accessibilityLabel="Add date range"
          >
            <Text style={styles.addLink}>Add Date(s)</Text>
          </Pressable>
          <View style={styles.statusRow}>
            {(['planned', 'in_progress', 'blocked', 'done'] as const).map((value) => (
              <Button
                key={value}
                label={value}
                onPress={() => setStatus(value)}
                variant={status === value ? 'primary' : 'secondary'}
                style={styles.statusButton}
              />
            ))}
          </View>
          <Button label="Add task" onPress={submit} />
        </Card>
      ) : null}

      <Modal visible={!!editingGroup} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>
            {editingGroup ? (
              <>
                <Input label="Task name" value={editTitle} onChangeText={setEditTitle} />
                {renderRangeFields('edit', editRanges)}
                <Pressable
                  onPress={() => addRange('edit')}
                  accessibilityRole="button"
                  accessibilityLabel="Add date range"
                >
                  <Text style={styles.addLink}>Add Date(s)</Text>
                </Pressable>
                <View style={styles.statusRow}>
                  {(['planned', 'in_progress', 'blocked', 'done'] as const).map((value) => (
                    <Button
                      key={value}
                      label={value}
                      onPress={() => setEditStatus(value)}
                      variant={editStatus === value ? 'primary' : 'secondary'}
                      style={styles.statusButton}
                    />
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Button label="Cancel" variant="secondary" onPress={closeEdit} />
                  <Button label="Save" onPress={saveEdit} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateField: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateControl: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  dateControlError: {
    borderColor: colors.danger,
  },
  dateText: {
    fontSize: typography.body,
    color: colors.text,
  },
  webDateInput: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    width: '100%',
    boxSizing: 'border-box',
  },
  dateErrorText: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.danger,
  },
  datePlaceholder: {
    color: colors.textMuted,
  },
  pickerWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  statusButton: {
    flexGrow: 1,
    minWidth: 110,
  },
  rangeBlock: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rangeTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  addLink: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  removeLink: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  ganttWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  ganttHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  ganttHeaderCell: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  ganttHeaderText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ganttBody: {
    paddingVertical: spacing.sm,
  },
  ganttRow: {
    paddingVertical: spacing.xs,
  },
  taskLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  editLink: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  barTrack: {
    height: 20,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
