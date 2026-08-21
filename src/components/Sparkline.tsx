import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { makePath } from '../domain/compute';

/** The 56×24 trailing line in each holding row. */
export function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  if (!vals || vals.length < 2) return <View style={{ width: 56 }} />;
  const p = makePath(vals, 64, 24, 3);
  return (
    <Svg width={56} height={24} viewBox="0 0 64 24" preserveAspectRatio="none">
      <Path d={p.line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
