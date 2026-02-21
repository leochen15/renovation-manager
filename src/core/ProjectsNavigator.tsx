import React, { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { ProjectWorkspace } from './ProjectWorkspace';
import { usePendingInvites } from '../hooks/usePendingInvites';
import { useProjectContext } from './ProjectContext';

export type ProjectsStackParamList = {
  ProjectsHome: undefined;
  ProjectWorkspace: undefined;
};

const Stack = createStackNavigator<ProjectsStackParamList>();

const InviteNavigationHandler = () => {
  const navigation = useNavigation<StackNavigationProp<ProjectsStackParamList>>();
  const { data: pendingInvites, isLoading } = usePendingInvites();
  const { projects, selectedProject } = useProjectContext();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasNavigatedRef.current) return;
    
    // Only navigate if there are pending invites and user has at least one project
    // (If no projects, invites are shown on ProjectsScreen)
    if (pendingInvites && pendingInvites.length > 0 && (projects.length > 0 || selectedProject)) {
      hasNavigatedRef.current = true;
      // Small delay to ensure ProjectContext is ready
      setTimeout(() => {
        navigation.navigate('ProjectWorkspace');
      }, 100);
    }
  }, [pendingInvites, isLoading, projects.length, selectedProject, navigation]);

  return null;
};

export const ProjectsNavigator = () => (
  <>
    <InviteNavigationHandler />
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsHome" component={ProjectsScreen} />
      <Stack.Screen name="ProjectWorkspace" component={ProjectWorkspace} />
    </Stack.Navigator>
  </>
);
