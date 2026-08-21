import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { oklch } from '../theme/oklch';

const W = 280;
const H = 300;
const N = 110;
/** Blossoms open in index order, so the canopy sparkles in rather than sweeping. */
const BUCKETS = 8;

function rngf(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Blossom {
  x: number;
  y: number;
  s: number;
  hue: number;
  on: boolean;
}

/** Same seed, same trig, same ellipse as the prototype's `treeHTML`. */
function layout(progress: number): Blossom[] {
  const r = rngf(2024);
  const lit = Math.round(Math.min(1, progress) * N);
  const cx = 140;
  const cy = 110;
  const radx = 118;
  const rady = 88;
  const out: Blossom[] = [];
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r());
    const x = cx + radx * rad * Math.cos(a);
    const y = cy + rady * rad * Math.sin(a) * 0.92;
    const on = i < lit;
    const s = (on ? 7 : 5) + r() * (on ? 6 : 4);
    const hue = 346 + r() * 12;
    out.push({ x, y, s, hue, on });
  }
  return out;
}

/** Trunk and four limbs: [x1, y1, x2, y2, thickness]. */
const BRANCHES: [number, number, number, number, number][] = [
  [140, 300, 140, 150, 5],
  [140, 210, 86, 150, 3.5],
  [140, 205, 196, 150, 3.5],
  [112, 176, 70, 120, 2.6],
  [170, 176, 210, 120, 2.6],
];

export function Tree({ progress }: { progress: number }) {
  const blossoms = useMemo(() => layout(progress), [progress]);
  const reduced = useReducedMotion();

  const buckets = useMemo(() => {
    const size = Math.ceil(N / BUCKETS);
    return Array.from({ length: BUCKETS }, (_, b) => blossoms.slice(b * size, (b + 1) * size));
  }, [blossoms]);

  return (
    <View style={styles.wrap}>
      {/* trunk and limbs */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {BRANCHES.map((b, i) => {
          const len = Math.hypot(b[2] - b[0], b[3] - b[1]);
          const ang = (Math.atan2(b[3] - b[1], b[2] - b[0]) * 180) / Math.PI;
          const midX = (b[0] + b[2]) / 2;
          const midY = (b[1] + b[3]) / 2;
          return (
            <Rect
              key={i}
              x={midX - len / 2}
              y={midY - b[4] / 2}
              width={len}
              height={b[4]}
              rx={b[4] / 2}
              fill={oklch(0.44, 0.045, 38)}
              origin={`${midX}, ${midY}`}
              rotation={ang}
            />
          );
        })}
      </Svg>

      {/* canopy, opening in eight staggered passes */}
      {buckets.map((bucket, b) => (
        <Animated.View
          key={b}
          style={StyleSheet.absoluteFill}
          entering={
            reduced
              ? FadeIn.duration(1)
              : ZoomIn.delay(b * 90)
                  .duration(600)
                  .springify()
                  .damping(12)
          }
        >
          <Svg width={W} height={H}>
            <Defs>
              <RadialGradient id={`lit${b}`} cx="35%" cy="30%" r="70%">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="55%" stopColor={oklch(0.84, 0.11, 352)} />
                <Stop offset="100%" stopColor={oklch(0.72, 0.13, 352)} />
              </RadialGradient>
              <RadialGradient id={`off${b}`} cx="50%" cy="50%" r="60%">
                <Stop offset="0%" stopColor={oklch(0.42, 0.05, 352)} />
                <Stop offset="100%" stopColor={oklch(0.32, 0.04, 352)} />
              </RadialGradient>
            </Defs>
            {bucket.map((p, i) =>
              p.on ? (
                <Circle
                  key={`g${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={p.s / 2 + 4}
                  fill={oklch(0.78, 0.13, p.hue, 0.22)}
                />
              ) : null
            )}
            {bucket.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={p.s / 2} fill={`url(#${p.on ? 'lit' : 'off'}${b})`} />
            ))}
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

/** The soft pink pool under the trunk. */
export function TreeShadow() {
  return (
    <Svg width={200} height={60} style={styles.shadow}>
      <Defs>
        <RadialGradient id="treeShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={oklch(0.6, 0.14, 350, 0.4)} />
          <Stop offset="70%" stopColor={oklch(0.6, 0.14, 350, 0)} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={30} rx={100} ry={30} fill="url(#treeShadow)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, height: H },
  shadow: { position: 'absolute', bottom: 24 },
});
