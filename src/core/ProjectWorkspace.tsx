import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProjectContext } from './ProjectContext';
import { colors, spacing, typography } from '../styles/theme';
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

const tabs = [
  { key: 'schedule', label: 'Schedule', component: ScheduleScreen },
  { key: 'noticeboard', label: 'Noticeboard', component: NoticeboardScreen },
  { key: 'trades', label: 'Trades', component: TradesScreen },
  { key: 'budget', label: 'Budget', component: BudgetScreen },
  { key: 'invites', label: 'Invites', component: InvitesScreen },
] as const;

export const ProjectWorkspace = () => {
  const insets = useSafeAreaInsets();
  const { selectedProject } = useProjectContext();
  const navigation = useNavigation<StackNavigationProp<ProjectsStackParamList>>();
  const [activeKey, setActiveKey] = useState<(typeof tabs)[number]['key']>('schedule');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const drawerTranslateX = useRef(new Animated.Value(-260)).current;
  const hasSwitchedToInvitesRef = useRef(false);
  const { data: pendingInvites, isLoading: isLoadingInvites } = usePendingInvites();
  const {
    canViewSchedule,
    canViewNoticeboard,
    canViewTrades,
    canViewBudget,
    canViewInvites,
  } = useProjectPermissions();

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
    [canViewSchedule, canViewNoticeboard, canViewTrades, canViewBudget, canViewInvites]
  );

  useEffect(() => {
    if (!selectedProject) {
      setSwitcherOpen(true);
      return;
    }
    if (!availableTabs.find((tab) => tab.key === activeKey)) {
      const nextKey = availableTabs[0]?.key ?? 'schedule';
      setActiveKey(nextKey);
    }
  }, [availableTabs, activeKey, selectedProject]);

  // Auto-switch to invites tab if there are pending invites
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
  }, [pendingInvites, isLoadingInvites, canViewInvites, selectedProject, availableTabs]);

  const ActiveComponent = useMemo(() => {
    return availableTabs.find((tab) => tab.key === activeKey)?.component ?? ScheduleScreen;
  }, [activeKey, availableTabs]);

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
      toValue: -260,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const drawerItems = [
    ...availableTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      onPress: () => {
        setActiveKey(tab.key);
        closeDrawer();
      },
    })),
  ];

  return (
    <SafeAreaView
      style={[styles.container, Platform.OS === 'web' ? styles.containerWeb : null]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={openDrawer} style={styles.menuButton}>
            <Text style={styles.menuText}>Menu</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>{selectedProject?.name ?? 'Choose a project'}</Text>
            <Text style={styles.subtitle}>Project workspace</Text>
          </View>
        </View>
        <Pressable onPress={() => setSwitcherOpen(true)} style={styles.projectsButton}>
          <Text style={styles.projectsText}>Projects</Text>
        </Pressable>
      </View>
      <View
        style={[
          styles.content,
          Platform.OS === 'web' ? styles.contentScroll : null,
          Platform.OS === 'web' ? { paddingBottom: Math.max(tabBarHeight, 56) } : null,
        ]}
      >
        <ActiveComponent />
      </View>
      <View
        onLayout={({ nativeEvent }) => setTabBarHeight(nativeEvent.layout.height)}
        style={[
          styles.tabBar,
          Platform.OS === 'web' ? styles.tabBarFixed : null,
          { paddingBottom: spacing.sm + insets.bottom },
        ]}
        pointerEvents={Platform.OS === 'web' ? 'box-none' : 'auto'}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {availableTabs.map((tab) => {
            const active = tab.key === activeKey;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveKey(tab.key)}
                style={[styles.tabButton, active ? styles.tabButtonActive : null]}
              >
                <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <Drawer
        visible={drawerOpen}
        onClose={closeDrawer}
        translateX={drawerTranslateX}
        items={drawerItems}
      />
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
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentScroll: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  containerWeb: {
    height: '100vh',
    width: '100%',
  },
  topBar: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
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
  projectsButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  projectsText: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  tabBarFixed: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  tabRow: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
  },
});
