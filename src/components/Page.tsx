import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme/tokens';
import { ScreenBackground } from './ScreenBackground';

/**
 * Every screen's shell: safe-area padding, room for the tab bar, the
 * prototype's `riseUp` entrance, and pull-to-refresh where it makes sense.
 */
export function Page({
  children,
  onRefresh,
  refreshing,
  testID,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Screen roots are tagged so the walkthrough can tell the mounted scenes apart. */
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  return (
    <View style={styles.screen} testID={testID}>
      <ScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={C.pinkSoft}
              colors={[C.pink]}
              progressBackgroundColor={C.bgMid}
            />
          ) : undefined
        }
      >
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(420)}>{children}</Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgMid },
  scroll: { flex: 1 },
  // the tab bar floats over the scroll area; the prototype reserved the same room
  content: { paddingHorizontal: 22, paddingBottom: 124 },
});
