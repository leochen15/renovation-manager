import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ProjectsNavigator } from './ProjectsNavigator';
import { queryClient } from '../lib/queryClient';

export const AppShell = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <ProjectsNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
};
