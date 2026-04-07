import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { queryClient } from '../lib/queryClient';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { AuthScreen } from '../screens/AuthScreen';
import { ProjectProvider } from './ProjectContext';
import { ProjectsNavigator } from './ProjectsNavigator';
import { LoadingState } from '../components/LoadingState';
import { ToastProvider, useToast } from './ToastContext';
import { initializeAnalytics, trackPageView } from '../lib/analytics';

const routePathMap: Record<string, string> = {
  Auth: '/auth',
  ProjectsHome: '/projects',
  ProjectWorkspace: '/workspace',
};

const AppRootInner = () => {
  const { session, loading } = useSession();
  const { showToast } = useToast();
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string | undefined>(undefined);

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

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      routeNameRef.current = 'Auth';
      trackPageView('Auth', routePathMap.Auth);
    }
  }, [loading, session]);

  const recordCurrentScreen = () => {
    const route = navigationRef.getCurrentRoute();
    const routeName = route?.name;

    if (!routeName || routeNameRef.current === routeName) return;

    routeNameRef.current = routeName;
    trackPageView(routeName, routePathMap[routeName] ?? '/');
  };

  if (loading) return <LoadingState label="Loading session" />;

  if (!session) {
    return (
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          ref={navigationRef}
          onReady={recordCurrentScreen}
          onStateChange={recordCurrentScreen}
        >
          <AuthScreen />
        </NavigationContainer>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        ref={navigationRef}
        onReady={recordCurrentScreen}
        onStateChange={recordCurrentScreen}
      >
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
