import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { BudgetItem, BudgetStatus } from '../types';
import { useToast } from '../core/ToastContext';

const statusTone = {
  planned: 'default',
  committed: 'warning',
  paid: 'success',
} as const;

export const BudgetScreen = () => {
  const { showToast } = useToast();
  const { selectedProject } = useProjectContext();
  const { canViewBudget, canEditBudget } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [status, setStatus] = useState<'planned' | 'committed' | 'paid'>('planned');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEstimated, setDraftEstimated] = useState('');
  const [draftActual, setDraftActual] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<BudgetItem['status']>('planned');
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<BudgetStatus[]>([]);

  const projectId = selectedProject?.id;

  const { data: items } = useQuery({
    queryKey: ['budget', projectId],
    enabled: !!projectId && canViewBudget,
    queryFn: async () => {
      if (!projectId) return [] as BudgetItem[];
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetItem[];
    },
  });

  const categories = useMemo(
    () => [...new Set((items ?? []).map((i) => i.category).filter(Boolean))] as string[],
    [items]
  );

  const filteredItems = useMemo(() => {
    let list = items ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) || (i.category ?? '').toLowerCase().includes(q)
      );
    }
    if (selectedCategories.length > 0) {
      list = list.filter((i) => selectedCategories.includes(i.category));
    }
    if (selectedStatuses.length > 0) {
      list = list.filter((i) => selectedStatuses.includes(i.status));
    }
    return list;
  }, [items, searchQuery, selectedCategories, selectedStatuses]);

  const totals = useMemo(() => {
    const estimate = filteredItems.reduce((sum, item) => sum + Number(item.estimated_cost ?? 0), 0);
    const actual = filteredItems.reduce((sum, item) => sum + Number(item.actual_cost ?? 0), 0);
    return { estimate, actual };
  }, [filteredItems]);

  const activeFilterCount =
    (selectedCategories.length > 0 ? 1 : 0) + (selectedStatuses.length > 0 ? 1 : 0);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStatus = (s: BudgetStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((st) => st !== s) : [...prev, s]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
  };

  const beginEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setDraftName(item.name);
    setDraftEstimated(String(item.estimated_cost ?? ''));
    setDraftActual(item.actual_cost === null || item.actual_cost === undefined ? '' : String(item.actual_cost));
    setDraftStatus(item.status);
    setStatusMenuOpenId(null);
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftEstimated('');
    setDraftActual('');
    setDraftStatus('planned');
    setStatusMenuOpenId(null);
  };

  const submitEdit = async (item: BudgetItem) => {
    if (!projectId) return;
    if (!draftName.trim()) {
      showToast({ title: 'Name required', tone: 'error' });
      return;
    }
    const estimated = Number(draftEstimated);
    const actual = draftActual ? Number(draftActual) : null;
    if (Number.isNaN(estimated)) {
      showToast({ title: 'Estimated cost is required', tone: 'error' });
      return;
    }
    if (draftActual && Number.isNaN(actual)) {
      showToast({ title: 'Actual cost must be a number', tone: 'error' });
      return;
    }

    const { error } = await supabase
      .from('budget_items')
      .update({
        name: draftName.trim(),
        estimated_cost: estimated,
        actual_cost: actual,
        status: draftStatus,
      })
      .eq('id', item.id);

    if (error) {
      showToast({ title: 'Failed to update budget item', message: error.message, tone: 'error' });
      return;
    }

    cancelEdit();
    queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
  };

  const confirmDelete = (item: BudgetItem) => {
    setConfirmDeleteId((prev) => (prev === item.id ? null : item.id));
    setEditingId(null);
  };

  const deleteItem = async (item: BudgetItem) => {
    if (!projectId) return;
    const { error } = await supabase.from('budget_items').delete().eq('id', item.id);
    if (error) {
      showToast({ title: 'Failed to delete budget item', message: error.message, tone: 'error' });
      return;
    }
    setConfirmDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
  };

  const submit = async () => {
    if (!projectId) return;
    if (!name.trim() || !category.trim()) {
      showToast({ title: 'Name and category required', tone: 'error' });
      return;
    }
    const estimated = Number(estimatedCost);
    const actual = actualCost ? Number(actualCost) : null;
    if (Number.isNaN(estimated)) {
      showToast({ title: 'Estimated cost is required', tone: 'error' });
      return;
    }

    const { error } = await supabase.from('budget_items').insert({
      project_id: projectId,
      name,
      category,
      estimated_cost: estimated,
      actual_cost: actual,
      status,
    });

    if (error) {
      showToast({ title: 'Failed to add budget item', message: error.message, tone: 'error' });
      return;
    }

    setName('');
    setCategory('');
    setEstimatedCost('');
    setActualCost('');
    setStatus('planned');
    queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
  };

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Budget" subtitle="Track estimated vs actual spend." />
      {!canViewBudget ? (
        <EmptyState title="View-only access" description="You do not have access to view budget items." />
      ) : null}
      {!projectId ? (
        <EmptyState title="Select a project" description="Create or select a project to see budget items." />
      ) : null}
      {projectId && canViewBudget && canEditBudget ? (
        <Card>
          <Text style={styles.cardTitle}>New budget item</Text>
          <Input label="Item" value={name} onChangeText={setName} placeholder="Kitchen cabinetry" />
          <Input label="Category" value={category} onChangeText={setCategory} placeholder="Materials" />
          <Input label="Estimated cost" value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" />
          <Input label="Actual cost" value={actualCost} onChangeText={setActualCost} keyboardType="numeric" />
          <View style={styles.statusRow}>
            {(['planned', 'committed', 'paid'] as const).map((value) => (
              <Button
                key={value}
                label={value}
                onPress={() => setStatus(value)}
                variant={status === value ? 'primary' : 'secondary'}
                style={styles.statusButton}
              />
            ))}
          </View>
          <Button label="Save item" onPress={submit} />
        </Card>
      ) : null}
      {projectId && canViewBudget ? (
        <Card>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryValue}>Estimated: ${totals.estimate.toFixed(2)}</Text>
          <Text style={styles.summaryValue}>Actual: ${totals.actual.toFixed(2)}</Text>
        </Card>
      ) : null}
      {projectId && canViewBudget ? (
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search items..."
            />
          </View>
          <Button
            label={activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
            onPress={() => setFilterModalOpen(true)}
            variant="secondary"
            style={styles.filterButton}
          />
        </View>
      ) : null}
      {projectId && canViewBudget && !hasItems ? (
        <EmptyState title="No budget items" description="Add your first cost item to track spending." />
      ) : null}
      {projectId && canViewBudget && hasItems && filteredItems.length === 0 ? (
        <EmptyState title="No matching items" description="No budget items match your search or filters." />
      ) : null}
      {projectId && canViewBudget && hasItems && filteredItems.length > 0 ? (
        filteredItems.map((item) => (
          <Card key={item.id}>
            <View style={styles.itemHeader}>
              {editingId === item.id ? (
                <Input label="Item" value={draftName} onChangeText={setDraftName} placeholder="Kitchen cabinetry" />
              ) : (
                <Text style={styles.itemTitle}>{item.name}</Text>
              )}
              {editingId === item.id ? (
                <View style={styles.statusEditWrap}>
                  <Pressable
                    onPress={() =>
                      setStatusMenuOpenId((prev) => (prev === item.id ? null : item.id))
                    }
                    style={styles.statusPressable}
                  >
                    <Chip label={draftStatus} tone={statusTone[draftStatus]} />
                  </Pressable>
                  {statusMenuOpenId === item.id ? (
                    <View style={styles.statusMenu}>
                      {(['planned', 'committed', 'paid'] as const).map((value) => {
                        const active = value === draftStatus;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => {
                              setDraftStatus(value);
                              setStatusMenuOpenId(null);
                            }}
                            style={[styles.statusMenuItem, active ? styles.statusMenuItemActive : null]}
                          >
                            <Text style={[styles.statusMenuText, active ? styles.statusMenuTextActive : null]}>
                              {value}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Chip label={item.status} tone={statusTone[item.status]} />
              )}
            </View>
            <Text style={styles.itemDetail}>Category: {item.category}</Text>
            {editingId === item.id ? (
              <>
                <Input
                  label="Estimated cost"
                  value={draftEstimated}
                  onChangeText={setDraftEstimated}
                  keyboardType="numeric"
                />
                <Input
                  label="Actual cost"
                  value={draftActual}
                  onChangeText={setDraftActual}
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                <Text style={styles.itemDetail}>Estimated: ${Number(item.estimated_cost).toFixed(2)}</Text>
                <Text style={styles.itemDetail}>Actual: ${Number(item.actual_cost ?? 0).toFixed(2)}</Text>
              </>
            )}
            {canEditBudget ? (
              <View style={styles.actionRow}>
                {editingId === item.id ? (
                  <>
                    <Button label="Save" onPress={() => submitEdit(item)} />
                    <Button label="Cancel" onPress={cancelEdit} variant="secondary" />
                  </>
                ) : (
                  <>
                    <Button label="Edit" onPress={() => beginEdit(item)} variant="secondary" />
                    {confirmDeleteId === item.id ? (
                      <>
                        <Button label="Confirm" onPress={() => deleteItem(item)} variant="danger" />
                        <Button label="Cancel" onPress={() => setConfirmDeleteId(null)} variant="secondary" />
                      </>
                    ) : (
                      <Button label="Delete" onPress={() => confirmDelete(item)} variant="danger" />
                    )}
                  </>
                )}
              </View>
            ) : null}
          </Card>
        ))
      ) : null}

      <Modal
        visible={filterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filter</Text>
            <Text style={styles.filterSectionLabel}>Category</Text>
            <View style={styles.filterChips}>
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <Pressable key={cat} onPress={() => toggleCategory(cat)}>
                    <Chip label={cat} tone={active ? 'success' : 'default'} />
                  </Pressable>
                );
              })}
              {categories.length === 0 ? (
                <Text style={styles.filterEmpty}>No categories yet</Text>
              ) : null}
            </View>
            <Text style={styles.filterSectionLabel}>Status</Text>
            <View style={styles.filterChips}>
              {(['planned', 'committed', 'paid'] as const).map((s) => {
                const active = selectedStatuses.includes(s);
                return (
                  <Pressable key={s} onPress={() => toggleStatus(s)}>
                    <Chip label={s} tone={active ? statusTone[s] : 'default'} />
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Button label="Clear" onPress={clearFilters} variant="secondary" />
              <Button label="Close" onPress={() => setFilterModalOpen(false)} />
            </View>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInputWrap: {
    flex: 1,
    marginBottom: 0,
  },
  filterButton: {
    minWidth: 90,
    backgroundColor: '#6C8A7E',
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
    marginBottom: spacing.md,
  },
  filterSectionLabel: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterEmpty: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  modalActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusButton: {
    flexGrow: 1,
    minWidth: 100,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    color: colors.text,
  },
  itemDetail: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusEditWrap: {
    position: 'relative',
    alignItems: 'flex-end',
  },
  statusPressable: {
    borderRadius: radius.sm,
  },
  statusMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  statusMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusMenuItemActive: {
    backgroundColor: colors.surfaceAlt,
  },
  statusMenuText: {
    fontSize: typography.small,
    color: colors.text,
    textTransform: 'capitalize',
  },
  statusMenuTextActive: {
    fontWeight: '700',
  },
});
