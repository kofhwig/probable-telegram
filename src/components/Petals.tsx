import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { oklch } from '../theme/oklch';

function rngf(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A single petal shape: the prototype's `border-radius:60% 0 60% 0` teardrop. */
function Petal({ size, style }: { size: number; style?: object }) {
  return (
    <LinearGradient
      colors={[oklch(0.88, 0.09, 350), oklch(0.78, 0.12, 338)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderTopLeftRadius: size * 0.6,
          borderBottomRightRadius: size * 0.6,
        },
        style,
      ]}
    />
  );
}

interface BurstPetal {
  tx: number;
  ty: number;
  size: number;
}

function BurstOne({ p, index }: { p: BurstPetal; index: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(index * 12, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.12 ? t.value / 0.12 : 1 - t.value,
    transform: [
      { translateX: t.value * p.tx },
      { translateY: t.value * p.ty },
      { scale: 0.3 + t.value * 0.7 },
      { rotate: `${t.value * 300}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.burstPetal, style]}>
      <Petal size={p.size} />
    </Animated.View>
  );
}

/**
 * The tap-the-tree flourish. Mounted with a fresh `burstKey` each tap so the
 * animation restarts, and unmounted by the caller when it finishes.
 */
export function PetalBurst({ burstKey }: { burstKey: number }) {
  const petals = useMemo(() => {
    const r = rngf(burstKey || 1);
    return Array.from({ length: 16 }, () => {
      const ang = r() * Math.PI * 2;
      const dist = 70 + r() * 120;
      return {
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist - 40 - r() * 60,
        size: 7 + r() * 8,
      };
    });
  }, [burstKey]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {petals.map((p, i) => (
        <BurstOne key={i} p={p} index={i} />
      ))}
    </View>
  );
}

function Falling({ i, height }: { i: number; height: number }) {
  const r = useMemo(() => rngf(7 + i * 31), [i]);
  const cfg = useMemo(() => {
    const size = 6 + Math.round(r() * 9);
    const left = r() * 100;
    const dur = (9 + r() * 9) * 1000;
    const delay = r() * 12000;
    const drift = r() * 40 - 10;
    return { size, left, dur, delay, drift };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      cfg.delay,
      withRepeat(withTiming(1, { duration: cfg.dur, easing: Easing.linear }), -1, false)
    );
  }, [cfg.dur, cfg.delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.08 ? (t.value / 0.08) * 0.85 : t.value > 0.9 ? (1 - t.value) * 8.5 : 0.85,
    transform: [
      { translateY: -40 + t.value * (height + 60) },
      { translateX: cfg.drift * Math.sin(t.value * Math.PI) },
      { rotate: `${t.value * 340}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: `${cfg.left}%`, top: 0 }, style]}>
      <Petal size={cfg.size} />
    </Animated.View>
  );
}

/**
 * Petals drifting down behind the whole app — the prototype's `#ambient`
 * layer. Skipped entirely when the system asks for reduced motion.
 */
export function AmbientPetals({ count = 12 }: { count?: number }) {
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <Falling key={i} i={i} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  burstPetal: { position: 'absolute', left: '50%', top: '40%' },
});
