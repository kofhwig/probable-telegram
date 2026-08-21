import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { money, pct, toneOf } from '../domain/format';
import type { ComputedHolding } from '../domain/types';
import { C, F, toneColor } from '../theme/tokens';
import { Sparkline } from './Sparkline';
import { Row } from './ui';

/**
 * The prototype's `moverRow`: ticker chip, name, 30-day spark, value and the
 * day's move. Tapping opens the holding's detail screen.
 */
export function HoldingRow({
  h,
  currency,
  onPress,
}: {
  h: ComputedHolding;
  currency: string;
  onPress?: () => void;
}) {
  const router = useRouter();
  const tone = toneOf(h.dayPct);
  const vals = (h.hist || []).slice(-30).map((p) => p.p);

  return (
    <Row onPress={onPress ?? (() => router.push(`/holding/${h.id}`))}>
      <View style={[styles.chip, { backgroundColor: h.color }]}>
        <Text style={styles.chipText}>{h.sym.slice(0, 4)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sym}>{h.sym}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {h.name}
        </Text>
      </View>
      <Sparkline vals={vals} color={tone === 'down' ? C.coral : C.mint} />
      <View style={{ alignItems: 'flex-end', minWidth: 62 }}>
        <Text style={styles.value}>{money(currency, h.value)}</Text>
        <Text style={[styles.day, { color: toneColor(tone) }]}>{pct(h.dayPct)}</Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: F.mono, fontSize: 12, color: C.onPink, letterSpacing: -0.3, fontWeight: '700' },
  sym: { color: C.text, fontSize: 14.5, fontFamily: F.sansBold },
  name: { color: C.dim, fontSize: 12, fontFamily: F.sansMed },
  value: { color: C.text, fontSize: 14, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
  day: { fontSize: 12, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
});
