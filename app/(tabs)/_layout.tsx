import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../src/components/Icon';
import { tap } from '../../src/components/ui';
import { C, F } from '../../src/theme/tokens';
// expo-router vendors react-navigation, so the tab-bar props come from there
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

const ITEMS: { name: string; icon: IconName; label: string }[] = [
  { name: 'index', icon: 'house', label: 'Home' },
  { name: 'portfolio', icon: 'pie', label: 'Portfolio' },
  { name: 'bloom', icon: 'lotus', label: 'Bloom' },
  { name: 'activity', icon: 'swap', label: 'Activity' },
  { name: 'insights', icon: 'sparkle', label: 'Insights' },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }} tabBar={(p) => <BloomTabBar {...p} />}>
      {ITEMS.map((i) => (
        <Tabs.Screen key={i.name} name={i.name} options={{ title: i.label }} />
      ))}
    </Tabs>
  );
}

/**
 * The prototype's `.nav`: four labelled tabs around a raised, breathing lotus
 * button that jumps to the Bloom screen.
 */
function BloomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(18, insets.bottom) }]}>
      <LinearGradient colors={[C.navTop, C.navBottom]} style={StyleSheet.absoluteFill} />
      {state.routes.map((route, index) => {
        const item = ITEMS.find((i) => i.name === route.name);
        if (!item) return null;
        const focused = state.index === index;
        const go = () => {
          tap();
          if (!focused) navigation.navigate(route.name);
        };

        if (item.name === 'bloom') {
          return <Fab key={route.key} onPress={go} />;
        }
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={item.label}
            onPress={go}
            style={styles.item}
          >
            <Icon name={item.icon} size={23} color={focused ? C.pinkSoft : C.dimmer} />
            <Text style={[styles.label, { color: focused ? C.pinkSoft : C.dimmer }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);

  React.useEffect(() => {
    if (reduced) return;
    glow.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, reduced]);

  const style = useAnimatedStyle(() => ({
    shadowOpacity: 0.55 + glow.value * 0.3,
    shadowRadius: 14 + glow.value * 10,
  }));

  return (
    <Pressable accessibilityRole="tab" accessibilityLabel="Bloom" onPress={onPress} style={styles.fabWrap}>
      {/* shadow and clipping have to live on separate views, or iOS drops the glow */}
      <Animated.View style={[styles.fabShadow, style]}>
        <View style={styles.fab}>
          <LinearGradient
            colors={[C.fabFrom, C.fabTo]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.fabIcon}>
            <Icon name="lotus" size={27} color={C.onPink} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    overflow: 'visible',
  },
  item: { alignItems: 'center', gap: 4, paddingVertical: 6, width: 54 },
  label: { fontSize: 10, fontFamily: F.sansBold },
  fabWrap: { width: 58, marginTop: -26 },
  fabShadow: {
    width: 58,
    height: 58,
    borderRadius: 999,
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // the gradient fills the button absolutely, so the mark needs to sit above it
  fabIcon: { zIndex: 1 },
});
