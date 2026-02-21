import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { queryClient } from '../lib/queryClient';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { AuthScreen } from '../screens/AuthScreen';
import { ProjectProvider } from './ProjectContext';
import { ProjectsNavigator } from './ProjectsNavigator';
import { LoadingState } from '../components/LoadingState';
import { ToastProvider, useToast } from './ToastContext';

const AppRootInner = () => {
  const { session, loading } = useSession();
  const { showToast } = useToast();

  useEffect(() => {
    const ensureProfile = async () => {
      if (!session?.user) return;
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, full_name: session.user.email ?? 'Renovator' }, { onConflict: 'id' });

      if (error) {
        showToast({ title: 'Profile error', message: error.message, tone: 'error' });
      }
    };

    ensureProfile();
  }, [session, showToast]);

  if (loading) return <LoadingState label="Loading session" />;

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AuthScreen />
        </NavigationContainer>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <ProjectProvider userId={session.user.id}>
          <ProjectsNavigator />
        </ProjectProvider>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

export const AppRoot = () => {
  return (
    <ToastProvider>
      <AppRootInner />
    </ToastProvider>
  );
};
