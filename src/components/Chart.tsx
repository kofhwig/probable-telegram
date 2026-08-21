import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { makePath } from '../domain/compute';
import { dayLabel } from '../domain/format';
import { C, F } from '../theme/tokens';
import { withAlpha } from '../theme/oklch';

interface Props {
  vals: number[];
  height: number;
  color: string;
  strokeWidth?: number;
  gradientId: string;
  /** Dates parallel to `vals`; supplying them turns on the scrub tooltip. */
  dates?: string[];
  /** Formats the scrubbed value — usually `money`. */
  format?: (v: number) => string;
}

/**
 * The prototype's `chartSVG` plus its pointer scrub, redrawn with
 * react-native-svg and a pan gesture.
 */
export function Chart({ vals, height, color, strokeWidth = 2.4, gradientId, dates, format }: Props) {
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<{ i: number; x: number } | null>(null);

  const path = useMemo(
    () => (width > 0 && vals.length > 1 ? makePath(vals, width, height) : null),
    [vals, width, height]
  );

  const scrubbable = !!dates && dates.length === vals.length && vals.length > 1;

  const pick = (x: number) => {
    if (!width) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    setScrub({ i: Math.round(ratio * (vals.length - 1)), x: ratio * width });
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(scrubbable)
        .minDistance(0)
        .onBegin((e) => runOnJS(pick)(e.x))
        .onUpdate((e) => runOnJS(pick)(e.x))
        .onFinalize(() => runOnJS(setScrub)(null)),
    // `pick` closes over the current width and values, so rebuild when they change
    [scrubbable, width, vals.length]
  );

  const body = (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {path ? (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={path.area} fill={`url(#${gradientId})`} />
          <Path
            d={path.line}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      {scrub && path && dates ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.rule, { left: scrub.x, height, borderColor: withAlpha(color, 0.45) }]}
          />
          <View pointerEvents="none" style={[styles.tip, { left: scrub.x }]}>
            <Text style={styles.tipVal}>{format ? format(vals[scrub.i]) : String(vals[scrub.i])}</Text>
            <Text style={styles.tipDate}>{dayLabel(dates[scrub.i])}</Text>
          </View>
        </>
      ) : null}
    </View>
  );

  if (!scrubbable) return body;
  return <GestureDetector gesture={gesture}>{body}</GestureDetector>;
}

const styles = StyleSheet.create({
  rule: {
    position: 'absolute',
    top: 0,
    width: 0,
    borderLeftWidth: 1,
  },
  tip: {
    position: 'absolute',
    top: -4,
    transform: [{ translateX: -46 }],
    minWidth: 92,
    alignItems: 'center',
    backgroundColor: 'rgba(20,10,20,.85)',
    borderWidth: 1,
    borderColor: C.lineHi,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  tipVal: { color: C.text, fontSize: 11, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
  tipDate: { color: C.dim, fontSize: 10, fontFamily: F.sansSemi },
});
