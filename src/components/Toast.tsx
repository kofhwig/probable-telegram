import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme/tokens';

interface ToastItem {
  id: number;
  msg: string;
}

const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * The prototype's `#toast` stack: pills that rise above the tab bar and fade
 * out on their own. Kept out of the portfolio store so any screen can call it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const insets = useSafeAreaInsets();

  const toast = useCallback((msg: string) => {
    const id = next.current++;
    setItems((prev) => [...prev, { id, msg }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2100);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.wrap, { bottom: 104 + insets.bottom }]}>
        {items.map((t) => (
          <Animated.View key={t.id} entering={FadeInDown.duration(260)} exiting={FadeOut.duration(300)} style={styles.toast}>
            <Text style={styles.text} numberOfLines={2}>
              {t.msg}
            </Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  toast: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.toastBg,
    borderWidth: 1,
    borderColor: C.lineHi,
    maxWidth: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  text: {
    color: C.text,
    fontFamily: F.sansBold,
    fontSize: 13,
    textAlign: 'center',
  },
});
