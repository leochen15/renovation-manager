import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRoot } from './src/core/AppRoot';

export default function App() {
  return (
    <GestureHandlerRootView
      style={[styles.root, Platform.OS === 'web' ? styles.rootWeb : null]}
    >
      <SafeAreaProvider>
        <AppRoot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootWeb: {
    height: '100dvh',
    minHeight: '100dvh',
    width: '100%',
    overflow: 'auto',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
});
