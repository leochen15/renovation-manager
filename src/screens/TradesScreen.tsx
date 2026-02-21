import React, { useState } from 'react';
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
import { Trade } from '../types';
import { useToast } from '../core/ToastContext';

export const TradesScreen = () => {
  const { showToast } = useToast();
  const { selectedProject } = useProjectContext();
  const { canViewTrades, canEditTrades } = useProjectPermissions();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const projectId = selectedProject?.id;

  const { data: trades } = useQuery({
    queryKey: ['trades', projectId],
    enabled: !!projectId && canViewTrades,
    queryFn: async () => {
      if (!projectId) return [] as Trade[];
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
  });

  const submit = async () => {
    if (!projectId) return;
    if (!name.trim() || !trade.trim()) {
      showToast({ title: 'Name and trade required', tone: 'error' });
      return;
    }
    const { error } = await supabase.from('trades').insert({
      project_id: projectId,
      name,
      trade,
      phone,
      email,
    });

    if (error) {
      showToast({ title: 'Failed to add trade', message: error.message, tone: 'error' });
      return;
    }

    setName('');
    setTrade('');
    setPhone('');
    setEmail('');
    queryClient.invalidateQueries({ queryKey: ['trades', projectId] });
  };

  const hasTrades = (trades?.length ?? 0) > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="Trades" subtitle="Keep your contractor contacts handy." />
      {!canViewTrades ? (
        <EmptyState title="View-only access" description="You do not have access to view trade contacts." />
      ) : null}
      {!projectId ? (
        <EmptyState title="Select a project" description="Create or select a project to see trades." />
      ) : null}
      {projectId && canViewTrades && canEditTrades ? (
        <Card>
          <Text style={styles.cardTitle}>New trade contact</Text>
          <Input label="Name" value={name} onChangeText={setName} placeholder="Jamie Lee" />
          <Input label="Trade" value={trade} onChangeText={setTrade} placeholder="Electrician" />
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="(555) 010-204" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="jamie@trade.com" keyboardType="email-address" />
          <Button label="Save contact" onPress={submit} />
        </Card>
      ) : null}

      {projectId && canViewTrades && !hasTrades ? (
        <EmptyState title="No trade contacts" description="Add your first contractor to get started." />
      ) : null}
      {projectId && canViewTrades && hasTrades ? (
        trades?.map((item) => (
          <Card key={item.id}>
            <Text style={styles.tradeName}>{item.name}</Text>
            <Text style={styles.tradeDetail}>{item.trade}</Text>
            {item.phone ? <Text style={styles.tradeDetail}>{item.phone}</Text> : null}
            {item.email ? <Text style={styles.tradeDetail}>{item.email}</Text> : null}
          </Card>
        ))
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
  tradeName: {
    fontSize: typography.h2,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tradeDetail: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
});
