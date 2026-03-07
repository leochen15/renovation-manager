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

export const ScheduleScreen = () => {
  const { showToast } = useToast();
  const { selectedProject } = useProjectContext();
  const { canViewSchedule, canEditSchedule } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'planned' | 'in_progress' | 'blocked' | 'done'>('planned');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<'planned' | 'in_progress' | 'blocked' | 'done'>('planned');
  const [editStartError, setEditStartError] = useState<string | null>(null);
  const [editEndError, setEditEndError] = useState<string | null>(null);
  const [editStartPickerOpen, setEditStartPickerOpen] = useState(false);
  const [editEndPickerOpen, setEditEndPickerOpen] = useState(false);

  const projectId = selectedProject?.id;

  useEffect(() => {
    if (editingTask) {
      setEditStartDate(editingTask.start_date);
      setEditEndDate(editingTask.end_date);
      setEditStatus(editingTask.status);
      setEditStartError(null);
      setEditEndError(null);
    }
  }, [editingTask]);

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

  const submit = async () => {
    if (!projectId) return;
    if (!title.trim() || !startDate || !endDate) {
      if (!title.trim()) {
        showToast({ title: 'Task name required', tone: 'error' });
      }
      setStartError(startDate ? null : 'Start date is required');
      setEndError(endDate ? null : 'End date is required');
      return;
    }
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);
    if (!start) {
      setStartError('Use YYYY-MM-DD');
      return;
    }
    if (!end) {
      setEndError('Use YYYY-MM-DD');
      return;
    }
    if (differenceInCalendarDays(end, start) <= 0) {
      setEndError('End date must be after start date.');
      return;
    }
    setStartError(null);
    setEndError(null);
    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title,
      start_date: startDate,
      end_date: endDate,
      status,
    });

    if (error) {
      showToast({ title: 'Failed to add task', message: error.message, tone: 'error' });
      return;
    }

    setTitle('');
    setStartDate('');
    setEndDate('');
    setStatus('planned');
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const saveEdit = async () => {
    if (!editingTask || !projectId) return;
    if (!editStartDate || !editEndDate) {
      setEditStartError(editStartDate ? null : 'Start date is required');
      setEditEndError(editEndDate ? null : 'End date is required');
      return;
    }
    const start = parseDateInput(editStartDate);
    const end = parseDateInput(editEndDate);
    if (!start) {
      setEditStartError('Use YYYY-MM-DD');
      return;
    }
    if (!end) {
      setEditEndError('Use YYYY-MM-DD');
      return;
    }
    if (differenceInCalendarDays(end, start) <= 0) {
      setEditEndError('End date must be after start date.');
      return;
    }
    setEditStartError(null);
    setEditEndError(null);
    const { error } = await supabase
      .from('tasks')
      .update({ start_date: editStartDate, end_date: editEndDate, status: editStatus })
      .eq('id', editingTask.id);

    if (error) {
      showToast({ title: 'Failed to update task', message: error.message, tone: 'error' });
      return;
    }
    showToast({ title: 'Task updated' });
    setEditingTask(null);
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const timeline = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;
    const dates = tasks.flatMap((task) => [parseISO(task.start_date), parseISO(task.end_date)]);
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const days = differenceInCalendarDays(max, min) + 1;
    return { min, max, days };
  }, [tasks]);

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

  const parseDateInput = (value: string) => {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const handlePickerChange =
    (setValue: (value: string) => void, setError: (value: string | null) => void, close: () => void) =>
    (_: any, selectedDate: Date | undefined) => {
      if (Platform.OS !== 'ios') close();
      if (selectedDate) {
        setValue(format(selectedDate, 'yyyy-MM-dd'));
        setError(null);
      }
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
      {projectId && canViewSchedule && (!tasks || tasks.length === 0) ? (
        <EmptyState title="No tasks yet" description="Add tasks to see them on the timeline." />
      ) : null}
      {projectId && canViewSchedule && tasks && tasks.length > 0 ? (
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
              {tasks.map((task) => {
                const start = parseISO(task.start_date);
                const end = parseISO(task.end_date);
                const offset = timeline ? differenceInCalendarDays(start, timeline.min) : 0;
                const duration = differenceInCalendarDays(end, start) + 1;
                return (
                  <View key={task.id} style={styles.ganttRow}>
                    <View style={styles.taskLabel}>
                      <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        {canEditSchedule ? (
                          <Pressable
                            onPress={() => setEditingTask(task)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Edit task"
                          >
                            <Text style={styles.editLink}>Edit</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <Chip label={task.status} tone={statusTone[task.status]} />
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            left: offset * displayDayWidth,
                            width: duration * displayDayWidth,
                          },
                        ]}
                      />
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
          {Platform.OS === 'web' ? (
            <>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Start date</Text>
                <input
                  id="start-date-input"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.currentTarget.value);
                    if (startError) setStartError(null);
                  }}
                  type="date"
                  style={styles.webDateInput as React.CSSProperties}
                />
                {startError ? <Text style={styles.dateErrorText}>{startError}</Text> : null}
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>End date</Text>
                <input
                  id="end-date-input"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.currentTarget.value);
                    if (endError) setEndError(null);
                  }}
                  type="date"
                  style={styles.webDateInput as React.CSSProperties}
                />
                {endError ? <Text style={styles.dateErrorText}>{endError}</Text> : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Start date</Text>
                <Pressable
                  onPress={() => setStartPickerOpen((prev) => !prev)}
                  style={[styles.dateControl, startError ? styles.dateControlError : null]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dateText, !startDate ? styles.datePlaceholder : null]}>
                    {startDate || 'Select date'}
                  </Text>
                </Pressable>
                {startError ? <Text style={styles.dateErrorText}>{startError}</Text> : null}
                {startPickerOpen ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={startDate ? parseISO(startDate) : new Date()}
                      mode="date"
                      display={pickerDisplay}
                      onChange={handlePickerChange(
                        setStartDate,
                        setStartError,
                        () => setStartPickerOpen(false)
                      )}
                    />
                    {Platform.OS === 'ios' ? (
                      <Button label="Done" variant="secondary" onPress={() => setStartPickerOpen(false)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>End date</Text>
                <Pressable
                  onPress={() => setEndPickerOpen((prev) => !prev)}
                  style={[styles.dateControl, endError ? styles.dateControlError : null]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dateText, !endDate ? styles.datePlaceholder : null]}>
                    {endDate || 'Select date'}
                  </Text>
                </Pressable>
                {endError ? <Text style={styles.dateErrorText}>{endError}</Text> : null}
                {endPickerOpen ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={endDate ? parseISO(endDate) : new Date()}
                      mode="date"
                      display={pickerDisplay}
                      onChange={handlePickerChange(setEndDate, setEndError, () => setEndPickerOpen(false))}
                    />
                    {Platform.OS === 'ios' ? (
                      <Button label="Done" variant="secondary" onPress={() => setEndPickerOpen(false)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </>
          )}
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

      <Modal
        visible={!!editingTask}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTask(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditingTask(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>
            {editingTask ? (
              <>
                <Text style={styles.editTaskName}>{editingTask.title}</Text>
                {Platform.OS === 'web' ? (
                  <>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>Start date</Text>
                      <input
                        value={editStartDate}
                        onChange={(e) => {
                          setEditStartDate(e.currentTarget.value);
                          if (editStartError) setEditStartError(null);
                        }}
                        type="date"
                        style={styles.webDateInput as React.CSSProperties}
                      />
                      {editStartError ? <Text style={styles.dateErrorText}>{editStartError}</Text> : null}
                    </View>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>End date</Text>
                      <input
                        value={editEndDate}
                        onChange={(e) => {
                          setEditEndDate(e.currentTarget.value);
                          if (editEndError) setEditEndError(null);
                        }}
                        type="date"
                        style={styles.webDateInput as React.CSSProperties}
                      />
                      {editEndError ? <Text style={styles.dateErrorText}>{editEndError}</Text> : null}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>Start date</Text>
                      <Pressable
                        onPress={() => setEditStartPickerOpen((prev) => !prev)}
                        style={[styles.dateControl, editStartError ? styles.dateControlError : null]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.dateText, !editStartDate ? styles.datePlaceholder : null]}>
                          {editStartDate || 'Select date'}
                        </Text>
                      </Pressable>
                      {editStartError ? <Text style={styles.dateErrorText}>{editStartError}</Text> : null}
                      {editStartPickerOpen && DateTimePicker ? (
                        <View style={styles.pickerWrap}>
                          <DateTimePicker
                            value={editStartDate ? parseISO(editStartDate) : new Date()}
                            mode="date"
                            display={pickerDisplay}
                            onChange={handlePickerChange(
                              setEditStartDate,
                              setEditStartError,
                              () => setEditStartPickerOpen(false)
                            )}
                          />
                          {Platform.OS === 'ios' ? (
                            <Button label="Done" variant="secondary" onPress={() => setEditStartPickerOpen(false)} />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.dateField}>
                      <Text style={styles.dateLabel}>End date</Text>
                      <Pressable
                        onPress={() => setEditEndPickerOpen((prev) => !prev)}
                        style={[styles.dateControl, editEndError ? styles.dateControlError : null]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.dateText, !editEndDate ? styles.datePlaceholder : null]}>
                          {editEndDate || 'Select date'}
                        </Text>
                      </Pressable>
                      {editEndError ? <Text style={styles.dateErrorText}>{editEndError}</Text> : null}
                      {editEndPickerOpen && DateTimePicker ? (
                        <View style={styles.pickerWrap}>
                          <DateTimePicker
                            value={editEndDate ? parseISO(editEndDate) : new Date()}
                            mode="date"
                            display={pickerDisplay}
                            onChange={handlePickerChange(
                              setEditEndDate,
                              setEditEndError,
                              () => setEditEndPickerOpen(false)
                            )}
                          />
                          {Platform.OS === 'ios' ? (
                            <Button label="Done" variant="secondary" onPress={() => setEditEndPickerOpen(false)} />
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </>
                )}
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
                  <Button label="Cancel" variant="secondary" onPress={() => setEditingTask(null)} />
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
  editTaskName: {
    fontSize: typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
