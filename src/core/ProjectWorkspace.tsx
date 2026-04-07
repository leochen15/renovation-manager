import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useProjectContext } from './ProjectContext';
import { colors, radius, spacing, typography } from '../styles/theme';
import { Drawer } from '../components/Drawer';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { usePendingInvites } from '../hooks/usePendingInvites';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { NoticeboardScreen } from '../screens/NoticeboardScreen';
import { TradesScreen } from '../screens/TradesScreen';
import { BudgetScreen } from '../screens/BudgetScreen';
import { InvitesScreen } from '../screens/InvitesScreen';
import { ProjectSwitcherModal } from '../components/ProjectSwitcherModal';
import { ProjectsStackParamList } from './ProjectsNavigator';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { WorkspaceScrollProvider } from './WorkspaceScrollContext';

const tabs = [
  { key: 'schedule', label: 'Schedule', component: ScheduleScreen },
  { key: 'noticeboard', label: 'Noticeboard', component: NoticeboardScreen },
  { key: 'trades', label: 'Trades', component: TradesScreen },
  { key: 'budget', label: 'Budget', component: BudgetScreen },
  { key: 'invites', label: 'Invites', component: InvitesScreen },
] as const;

export const ProjectWorkspace = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<ProjectsStackParamList>>();
  const { width } = useWindowDimensions();
  const { selectedProject } = useProjectContext();
  const [activeKey, setActiveKey] = useState<(typeof tabs)[number]['key']>('schedule');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [workspaceScrollY, setWorkspaceScrollY] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const drawerTranslateX = useRef(new Animated.Value(-320)).current;
  const heroCollapse = useRef(new Animated.Value(0)).current;
  const hasSwitchedToInvitesRef = useRef(false);
  const { data: pendingInvites, isLoading: isLoadingInvites } = usePendingInvites();
  const {
    canViewSchedule,
    canViewNoticeboard,
    canViewTrades,
    canViewBudget,
    canViewInvites,
  } = useProjectPermissions();

  const isWideLayout = width >= 960;
  const isCollapsibleMobileHero = !isWideLayout && (Platform.OS === 'ios' || Platform.OS === 'web');
  const projectId = selectedProject?.id ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const availableTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (tab.key === 'schedule') return canViewSchedule;
        if (tab.key === 'noticeboard') return canViewNoticeboard;
        if (tab.key === 'trades') return canViewTrades;
        if (tab.key === 'budget') return canViewBudget;
        if (tab.key === 'invites') return canViewInvites;
        return true;
      }),
    [canViewBudget, canViewInvites, canViewNoticeboard, canViewSchedule, canViewTrades]
  );

  const { data: scheduleTasks } = useQuery({
    queryKey: ['workspace-active-tasks', projectId],
    enabled: !!projectId && canViewSchedule,
    queryFn: async () => {
      if (!projectId) return [] as Task[];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, project_id, title, start_date, end_date, status, trade_id, sort_order, created_at')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const activeTodayTasks = useMemo(() => {
    const titles = new Set<string>();
    return (scheduleTasks ?? [])
      .filter((task) => task.status !== 'done' && task.start_date <= today && task.end_date >= today)
      .filter((task) => {
        const normalizedTitle = task.title.trim();
        if (!normalizedTitle || titles.has(normalizedTitle)) return false;
        titles.add(normalizedTitle);
        return true;
      });
  }, [scheduleTasks, today]);

  const todayHeadline = activeTodayTasks.length
    ? `${activeTodayTasks.length} activit${activeTodayTasks.length === 1 ? 'y' : 'ies'} on now`
    : 'No activities on now';

  const todaySummary = activeTodayTasks.length
    ? activeTodayTasks.length <= 2
      ? activeTodayTasks.map((task) => task.title).join(' and ')
      : `${activeTodayTasks
          .slice(0, 2)
          .map((task) => task.title)
          .join(', ')} +${activeTodayTasks.length - 2} more`
    : pendingInvites?.length
      ? `${pendingInvites.length} invite${pendingInvites.length > 1 ? 's' : ''} waiting review.`
      : 'Nothing is scheduled for today yet. Add date ranges in the schedule to highlight live activity here.';

  useEffect(() => {
    if (!selectedProject) {
      setSwitcherOpen(true);
      return;
    }
    if (!availableTabs.find((tab) => tab.key === activeKey)) {
      setActiveKey(availableTabs[0]?.key ?? 'schedule');
    }
  }, [activeKey, availableTabs, selectedProject]);

  useEffect(() => {
    if (
      !isLoadingInvites &&
      !hasSwitchedToInvitesRef.current &&
      pendingInvites &&
      pendingInvites.length > 0 &&
      canViewInvites &&
      selectedProject &&
      availableTabs.find((tab) => tab.key === 'invites')
    ) {
      hasSwitchedToInvitesRef.current = true;
      setActiveKey('invites');
    }
  }, [availableTabs, canViewInvites, isLoadingInvites, pendingInvites, selectedProject]);

  useEffect(() => {
    setWorkspaceScrollY(0);
  }, [activeKey, projectId]);

  useEffect(() => {
    Animated.timing(heroCollapse, {
      toValue: isCollapsibleMobileHero && workspaceScrollY > 8 ? 1 : 0,
      duration: 75,
      useNativeDriver: false,
    }).start();
  }, [heroCollapse, isCollapsibleMobileHero, workspaceScrollY]);

  const ActiveComponent = useMemo(
    () => availableTabs.find((tab) => tab.key === activeKey)?.component ?? ScheduleScreen,
    [activeKey, availableTabs]
  );

  const handleWorkspaceScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (!isCollapsibleMobileHero) return;
    setWorkspaceScrollY(Math.max(0, event.nativeEvent.contentOffset.y));
  };

  const animatedHeroHeight = heroCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [heroHeight || 180, 0],
    extrapolate: 'clamp',
  });
  const animatedHeroOpacity = heroCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const animatedHeroTranslateY = heroCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });
  const animatedHeroMarginBottom = heroCollapse.interpolate({
    inputRange: [0, 1],
    outputRange: [spacing.md, 0],
    extrapolate: 'clamp',
  });

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerTranslateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerTranslateX, {
      toValue: -320,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const drawerItems = availableTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    onPress: () => {
      setActiveKey(tab.key);
      closeDrawer();
    },
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.backgroundOrb, styles.backgroundOrbLeft]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbRight]} />
      <View
        style={[
          styles.shell,
          isWideLayout ? styles.shellWide : null,
          { paddingTop: isWideLayout ? spacing.lg : spacing.md + insets.top * 0.15 },
        ]}
      >
        {isWideLayout ? (
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Freno</Text>
            <Text style={styles.sidebarSubtitle}>Friendly Renovation Manager</Text>

            <View style={styles.sidebarSummary}>
              <Text style={styles.summaryEyebrow}>TODAY</Text>
              <Text style={styles.summaryCount}>{todayHeadline}</Text>
              <Text style={styles.summaryCopy}>{todaySummary}</Text>
              {activeTodayTasks.length ? (
                <View style={styles.summaryActivityList}>
                  {activeTodayTasks.slice(0, 3).map((task) => (
                    <View key={task.id} style={styles.summaryActivityChip}>
                      <Text style={styles.summaryActivityText}>{task.title}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Text style={styles.sidebarLabel}>Sections</Text>
            <View style={styles.sidebarNav}>
              {availableTabs.map((tab) => {
                const active = tab.key === activeKey;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveKey(tab.key)}
                    style={[styles.sidebarNavItem, active ? styles.sidebarNavItemActive : null]}
                  >
                    <Text style={[styles.sidebarNavText, active ? styles.sidebarNavTextActive : null]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setSwitcherOpen(true)} style={styles.sidebarProjectButton}>
              <Text style={styles.sidebarProjectButtonText}>Switch project</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.mobileHeader}>
            <Pressable onPress={openDrawer} style={styles.mobileHeaderButton}>
              <Text style={styles.mobileHeaderButtonText}>Menu</Text>
            </Pressable>
            <View style={styles.mobileTitleWrap}>
              <Text style={styles.mobileTitle}>Site Journal</Text>
              <Text style={styles.mobileSubtitle}>{selectedProject?.name ?? 'Choose a project'}</Text>
            </View>
            <Pressable onPress={() => setSwitcherOpen(true)} style={styles.mobileHeaderButton}>
              <Text style={styles.mobileHeaderButtonText}>Projects</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.mainColumn}>
          <Animated.View
            style={[
              styles.heroWrap,
              isCollapsibleMobileHero
                ? {
                    height: animatedHeroHeight,
                    opacity: animatedHeroOpacity,
                    marginBottom: animatedHeroMarginBottom,
                    transform: [{ translateY: animatedHeroTranslateY }],
                  }
                : null,
            ]}
          >
            <View
              onLayout={({ nativeEvent }) => {
                if (!heroHeight) setHeroHeight(nativeEvent.layout.height);
              }}
              style={styles.heroCard}
            >
              <View style={styles.heroBody}>
                <Text style={styles.heroLabel}>Project</Text>
                <Text style={styles.heroTitle}>{selectedProject?.name ?? 'Choose a project'}</Text>
                <Text style={styles.heroSubtitle}>
                  {selectedProject?.address ?? 'A warmer, more modern workspace for schedules, spend, contacts, and project decisions.'}
                </Text>
              </View>
              {!isWideLayout ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileTabsRow}>
                  {availableTabs.map((tab) => {
                    const active = tab.key === activeKey;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setActiveKey(tab.key)}
                        style={[styles.mobileTab, active ? styles.mobileTabActive : null]}
                      >
                        <Text style={[styles.mobileTabText, active ? styles.mobileTabTextActive : null]}>
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          </Animated.View>

          <WorkspaceScrollProvider value={{ handleScroll: handleWorkspaceScroll }}>
            <View style={styles.contentPanel}>
              <ActiveComponent />
            </View>
          </WorkspaceScrollProvider>
        </View>
      </View>

      {!isWideLayout ? (
        <Drawer
          visible={drawerOpen}
          onClose={closeDrawer}
          translateX={drawerTranslateX}
          items={drawerItems}
        />
      ) : null}

      <ProjectSwitcherModal
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        onAllProjects={() => {
          setSwitcherOpen(false);
          navigation.navigate('ProjectsHome');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.9,
  },
  backgroundOrbLeft: {
    width: 280,
    height: 280,
    left: -90,
    top: 24,
    backgroundColor: '#eadfbe',
  },
  backgroundOrbRight: {
    width: 300,
    height: 300,
    right: -110,
    top: 100,
    backgroundColor: colors.backgroundAccent,
  },
  shell: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  shellWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.lg,
  },
  sidebar: {
    width: 290,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidebarTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  sidebarSubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
  sidebarSummary: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryEyebrow: {
    fontSize: typography.small,
    color: '#b7ccc3',
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  summaryCount: {
    marginTop: spacing.sm,
    color: colors.white,
    fontSize: 30,
    fontWeight: '700',
  },
  summaryCopy: {
    marginTop: spacing.xs,
    color: '#dde7e2',
    fontSize: typography.small,
    lineHeight: 22,
  },
  summaryActivityList: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryActivityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  summaryActivityText: {
    color: colors.white,
    fontSize: typography.small,
    fontWeight: '700',
  },
  sidebarLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  sidebarNav: {
    gap: spacing.sm,
  },
  sidebarNavItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  sidebarNavItemActive: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidebarNavText: {
    fontSize: typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sidebarNavTextActive: {
    color: colors.text,
  },
  sidebarProjectButton: {
    marginTop: 'auto',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  sidebarProjectButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  mobileHeaderButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mobileHeaderButtonText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
  mobileTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  mobileTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  mobileSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: typography.small,
  },
  mainColumn: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
  },
  heroCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  heroWrap: {
    overflow: 'hidden',
  },
  heroBody: {
    gap: spacing.xs,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '600',
  },
  heroTitle: {
    color: colors.text,
    fontSize: Platform.OS === 'web' ? 48 : 34,
    lineHeight: Platform.OS === 'web' ? 58 : 42,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 760,
  },
  mobileTabsRow: {
    marginTop: spacing.md,
    paddingRight: spacing.sm,
  },
  mobileTab: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mobileTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mobileTabText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
  mobileTabTextActive: {
    color: colors.white,
  },
  contentPanel: {
    flex: 1,
    minHeight: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
});
