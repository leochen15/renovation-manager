import React, { useMemo, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const projectId = selectedProject?.id;

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
                      <Text style={styles.taskTitle}>{task.title}</Text>
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
  taskTitle: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
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
});
