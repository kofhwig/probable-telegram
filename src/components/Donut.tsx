import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { C } from '../theme/tokens';

export interface DonutSegment {
  pct: number;
  color: string;
}

/**
 * The allocation ring. The prototype drew it as a `conic-gradient`; React
 * Native has no conic gradients, so it becomes a stroked circle with one dash
 * segment per position.
 */
export function Donut({
  segments,
  size = 104,
  thickness = 15,
  children,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let acc = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,.08)"
            strokeWidth={thickness}
            fill="none"
          />
          {segments.map((s, i) => {
            const len = (Math.max(0, s.pct) / 100) * circumference;
            const offset = -(acc / 100) * circumference;
            acc += s.pct;
            if (len <= 0) return null;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={[len, circumference - len]}
                strokeDashoffset={offset}
              />
            );
          })}
        </G>
      </Svg>
      <View
        style={{
          position: 'absolute',
          width: size - thickness * 2,
          height: size - thickness * 2,
          borderRadius: 999,
          backgroundColor: C.donutHole,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}
