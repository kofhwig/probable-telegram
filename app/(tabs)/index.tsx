import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chart } from '../../src/components/Chart';
import { Donut } from '../../src/components/Donut';
import { HoldingRow } from '../../src/components/HoldingRow';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import {
  Btn,
  Card,
  Empty,
  EmptyText,
  Eyebrow,
  IconBtn,
  Pill,
  SectionTitle,
  SerifNum,
  tap,
} from '../../src/components/ui';
import { alerts, rangeSeries } from '../../src/domain/compute';
import { RANGES } from '../../src/domain/constants';
import { dayLabel, greeting, money, pct, signed, toneOf } from '../../src/domain/format';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F, R } from '../../src/theme/tokens';

export default function Home() {
  const { S, c, refresh, refreshing } = usePortfolio();
  const { open } = useSheet();
  const router = useRouter();
  const [range, setRange] = useState('1M');

  const rangeDef = RANGES.find((r) => r[0] === range) || RANGES[1];
  const series = useMemo(() => rangeSeries(S, rangeDef[1]), [S, rangeDef]);
  const vals = series.map((p) => p.v);
  const dates = series.map((p) => p.d);
  const first = vals[0];
  const last = vals[vals.length - 1];
  const rangeChg = vals.length > 1 ? last - first : 0;
  const rangePct = vals.length > 1 && first > 0 ? (rangeChg / first) * 100 : 0;
  const chartColor = rangeChg >= 0 ? C.mint : C.coral;
  const tone = toneOf(c.dayAbs);
  const alertCount = alerts(S).length;

  const movers = c.hs
    .filter((h) => Math.abs(h.dayPct) > 0.0001)
    .sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct))
    .slice(0, 3);
  const shown = movers.length ? movers : c.hs.slice().sort((a, b) => b.value - a.value).slice(0, 3);

  const segments = c.hs
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((h) => ({ pct: h.weight, color: h.color }));
  if (S.cash > 0) segments.push({ pct: c.cashWeight, color: C.muted });
  const assetCount = c.hs.length + (S.cash > 0 ? 1 : 0);
  const bloomPct = Math.round(c.progress * 100);

  const hero = (
    <View style={styles.hero}>
      <LinearGradient colors={[C.heroFrom, C.heroTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.halo} />
      <View style={styles.heroLabel}>
        <Icon name="lotus" size={15} color={C.pink} />
        <Text style={styles.heroLabelText}>Total net worth</Text>
      </View>
      <SerifNum style={styles.net}>{money(S.currency, c.net)}</SerifNum>
      <View style={styles.dayRow}>
        <Pill tone={tone === 'down' ? 'coral' : tone === 'up' ? 'mint' : 'grey'}>{pct(c.dayPct)}</Pill>
        <Text style={styles.dayText}>{signed(S.currency, c.dayAbs)} today</Text>
      </View>

      {vals.length > 1 ? (
        <View style={{ marginTop: 18 }}>
          <Chart
            vals={vals}
            dates={dates}
            height={96}
            color={chartColor}
            gradientId="heroFill"
            format={(v) => money(S.currency, v)}
          />
          <View style={styles.chartFooter}>
            <Text style={styles.chartFoot}>{dayLabel(series[0].d)}</Text>
            <Text style={[styles.chartFoot, { color: rangeChg >= 0 ? C.mint : C.coral }]}>
              {signed(S.currency, rangeChg)} · {pct(rangePct)} over {rangeDef[0]}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noSeries}>Your value line starts today.{'\n'}One point per day, from here on.</Text>
      )}

      <View style={styles.tfrow}>
        {RANGES.map((r) => {
          const on = r[0] === range;
          return (
            <Pressable
              key={r[0]}
              onPress={() => {
                tap();
                setRange(r[0]);
              }}
              style={[styles.tf, on && styles.tfOn]}
            >
              <Text style={[styles.tfText, on && { color: C.onPink }]}>{r[0]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => open({ name: 'settings' })} style={{ flex: 1 }}>
        <Text style={styles.kick}>{greeting()}</Text>
        <SerifNum style={styles.who}>{S.name || 'Your portfolio'}</SerifNum>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <IconBtn label="Search holdings" onPress={() => open({ name: 'search' })}>
          <Icon name="search" size={18} color={C.pinkSoft} />
        </IconBtn>
        <IconBtn label="Alerts" dot={alertCount > 0} onPress={() => open({ name: 'alerts' })}>
          <Icon name="bell" size={18} color={C.pinkSoft} />
        </IconBtn>
      </View>
    </View>
  );

  if (!S.holdings.length && S.cash === 0) {
    return (
      <Page testID="screen-home">
        {header}
        {hero}
        <Empty>
          <Icon name="lotus" size={30} color={C.pink} />
          <EmptyText>
            Nothing planted yet. Add a holding or record the cash you are holding, and the numbers here start working.
          </EmptyText>
          <Btn label="Add your first holding" onPress={() => open({ name: 'add' })} />
          <Btn kind="sec" label="Record cash" onPress={() => open({ name: 'cash' })} style={{ marginTop: 9 }} />
        </Empty>
      </Page>
    );
  }

  return (
    <Page testID="screen-home" onRefresh={S.settings.liveQuotes ? () => refresh() : undefined} refreshing={refreshing}>
      {header}
      {hero}

      <View style={styles.pairRow}>
        <Card style={{ flex: 1.15 }}>
          <Eyebrow style={{ marginBottom: 14 }}>Allocation</Eyebrow>
          <View style={{ alignItems: 'center' }}>
            <Donut segments={segments}>
              <Text style={styles.donutNum}>{assetCount}</Text>
              <Text style={styles.donutLabel}>{assetCount === 1 ? 'asset' : 'assets'}</Text>
            </Donut>
          </View>
        </Card>

        <Pressable
          onPress={() => {
            tap();
            router.push('/bloom');
          }}
          style={styles.bloomCard}
        >
          <LinearGradient colors={[C.bloomCardFrom, C.bloomCardTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.bloomIcon}>
            <Icon name="lotus" size={82} color={C.pink} />
          </View>
          <Eyebrow style={{ color: C.pinkSoft }}>Your bloom</Eyebrow>
          <SerifNum style={styles.bloomPct}>{bloomPct}%</SerifNum>
          <Text style={styles.bloomGoal}>toward {money(S.currency, S.goal)}</Text>
          <View style={styles.bloomCta}>
            <Text style={styles.bloomCtaText}>View tree</Text>
            <Icon name="arrowRight" size={13} color={C.pinkSoft} />
          </View>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <SectionTitle>{movers.length ? 'Top movers today' : 'Your holdings'}</SectionTitle>
        <Pressable
          onPress={() => {
            tap();
            router.push('/portfolio');
          }}
        >
          <Text style={styles.link}>All holdings</Text>
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>
        {shown.map((h) => (
          <HoldingRow key={h.id} h={h} currency={S.currency} />
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  kick: { color: C.pinkDim, fontSize: 13, fontFamily: F.sansSemi },
  who: { fontSize: 27, marginTop: 3, letterSpacing: 0 },

  hero: {
    borderRadius: R.hero,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.10)',
  },
  halo: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,180,220,0.08)',
  },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabelText: { color: C.pinkSoft, fontSize: 12.5, fontFamily: F.sansBold, letterSpacing: 0.4, textTransform: 'uppercase' },
  net: { fontSize: 46, marginTop: 8, marginBottom: 6, fontVariant: ['tabular-nums'] },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  dayText: { color: C.pinkSoft, fontSize: 13.5, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartFoot: { color: C.dimmer, fontSize: 10.5, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  noSeries: {
    height: 96,
    marginTop: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: C.dimmer,
    fontSize: 12,
    fontFamily: F.sansSemi,
    lineHeight: 18,
    paddingTop: 34,
  },
  tfrow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tf: { flex: 1, paddingVertical: 7, borderRadius: 11, alignItems: 'center', backgroundColor: 'rgba(255,255,255,.05)' },
  tfOn: { backgroundColor: C.btnPrimaryFrom },
  tfText: { fontFamily: F.mono, fontSize: 11.5, letterSpacing: 0.5, color: C.pinkDim },

  pairRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  donutNum: { color: C.text, fontSize: 18, fontFamily: F.sansHeavy, fontVariant: ['tabular-nums'] },
  donutLabel: { color: C.pinkDim, fontSize: 10, fontFamily: F.sansSemi },

  bloomCard: {
    flex: 1,
    borderRadius: R.card,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,170,210,.28)',
  },
  bloomIcon: { position: 'absolute', right: -14, bottom: -14, opacity: 0.22 },
  bloomPct: { fontSize: 34, marginTop: 8 },
  bloomGoal: { color: C.pinkSoft, fontSize: 12, fontFamily: F.sansSemi, marginTop: 4 },
  bloomCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  bloomCtaText: { color: C.pinkSoft, fontSize: 12, fontFamily: F.sansBold },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  link: { color: C.pinkSoft, fontSize: 12.5, fontFamily: F.sansBold },
});
