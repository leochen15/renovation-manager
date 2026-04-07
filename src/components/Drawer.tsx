import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../styles/theme';

const drawerWidth = 300;

type DrawerItem = {
  key: string;
  label: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: DrawerItem[];
  translateX: Animated.Value;
};

export const Drawer = ({ visible, onClose, items, translateX }: Props) => {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.drawer,
          { paddingTop: spacing.xl + insets.top },
          { transform: [{ translateX }] },
        ]}
      >
        <Text style={styles.title}>Menu</Text>
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} style={styles.item}>
            <Text style={styles.itemText}>{item.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
      <Pressable style={styles.backdrop} onPress={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawer: {
    width: drawerWidth,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemText: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
});
