import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { Bar, Btn, Card, Empty, EmptyText, Eyebrow, PageKick, PageTitle, SerifNum } from '../../src/components/ui';
import { diversification, sectorRows } from '../../src/domain/compute';
import { money, pct, signed, toneOf } from '../../src/domain/format';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F, HUE, R, toneColor, type HueKey } from '../../src/theme/tokens';

interface Tip {
  icon: IconName;
  hue: HueKey;
  title: string;
  body: string;
}

export default function Insights() {
  const { S, c } = usePortfolio();
  const { open } = useSheet();

  if (!c.hs.length) {
    return (
      <Page>
        <View style={{ marginTop: 6, marginBottom: 18, marginHorizontal: 2 }}>
          <PageKick>For you</PageKick>
          <PageTitle>Insights</PageTitle>
        </View>
        <Empty>
          <EmptyText>
            Insights read your positions: how spread out you are, which sector dominates, what moved. Add a holding to
            switch them on.
          </EmptyText>
          <Btn label="Add a holding" onPress={() => open({ name: 'add' })} />
        </Empty>
      </Page>
    );
  }

  const div = diversification(S, c);
  const rows = sectorRows(S, c);
  const byDay = c.hs.slice().sort((a, b) => b.dayPct - a.dayPct);
  const best = byDay[0];
  const worst = byDay[byDay.length - 1];
  const winners = c.hs.filter((h) => h.pl > 0).length;

  const tips: Tip[] = [];
  const topSec = rows[0];
  if (topSec && topSec.pct > 45 && topSec.label !== 'Cash')
    tips.push({
      icon: 'scissors',
      hue: 'prune',
      title: 'Prune the canopy',
      body: `${topSec.label} is ${topSec.pct.toFixed(0)}% of your book. A rotation into broad index or dividend names would shake the branches loose.`,
    });
  const big = c.hs.slice().sort((a, b) => b.weight - a.weight)[0];
  if (big && big.weight > 30)
    tips.push({
      icon: 'target',
      hue: 'weight',
      title: 'One branch is carrying the tree',
      body: `${big.sym} is ${big.weight.toFixed(0)}% of net worth. Trimming it back would soften the fall if it turns.`,
    });
  if (c.cashWeight > 20)
    tips.push({
      icon: 'wallet',
      hue: 'cash',
      title: 'Cash is resting',
      body: `${money(S.currency, S.cash)} — ${c.cashWeight.toFixed(0)}% of the total — is not planted anywhere.`,
    });
  if (c.cashWeight < 2 && c.net > 0)
    tips.push({
      icon: 'info',
      hue: 'dry',
      title: 'No dry powder',
      body: 'Under 2% in cash leaves nothing to buy a dip with, and nothing for an unexpected bill.',
    });
  if (!tips.length)
    tips.push({
      icon: 'lotus',
      hue: 'steady',
      title: 'Steady canopy',
      body: 'No position or sector is dominating, and cash is in a reasonable band. Nothing here needs your attention today.',
    });

  const divColor = div.score >= 80 ? C.mint : div.score >= 55 ? C.gold : C.coral;

  return (
    <Page>
      <View style={{ marginTop: 6, marginBottom: 18, marginHorizontal: 2 }}>
        <PageKick>For you</PageKick>
        <PageTitle>Insights</PageTitle>
      </View>

      <View style={styles.pair}>
        <Card style={{ flex: 1 }}>
          <Eyebrow style={{ fontSize: 11.5 }}>Diversification</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <SerifNum style={{ fontSize: 38 }}>{div.score}</SerifNum>
            <Text style={styles.outOf}>/100</Text>
          </View>
          <Text style={[styles.divLabel, { color: divColor }]}>{div.label}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Eyebrow style={{ fontSize: 11.5 }}>Best today</Eyebrow>
          <SerifNum style={{ fontSize: 26, marginTop: 8 }}>{best.sym}</SerifNum>
          <Text style={[styles.bestPct, { color: toneColor(toneOf(best.dayPct)) }]}>{pct(best.dayPct)}</Text>
          <Text style={styles.bestSub}>{signed(S.currency, best.dayAbs)} today</Text>
        </Card>
      </View>

      <Card style={{ padding: 20, marginBottom: 14 }}>
        <Text style={styles.cardTitle}>Sector exposure</Text>
        <View style={{ gap: 13 }}>
          {rows.map((s) => (
            <View key={s.label}>
              <View style={styles.sectorHead}>
                <Text style={styles.sectorLabel}>{s.label}</Text>
                <Text style={styles.sectorPct}>{s.pct.toFixed(1)}%</Text>
              </View>
              <Bar pct={s.pct} color={s.color} />
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ padding: 20, marginBottom: 14 }}>
        <Text style={styles.cardTitle}>Position health</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <SerifNum style={[styles.healthNum, { color: C.mint }]}>{winners}</SerifNum>
            <Text style={styles.healthLabel}>in profit</Text>
          </View>
          <View style={{ flex: 1 }}>
            <SerifNum style={[styles.healthNum, { color: C.coral }]}>{c.hs.length - winners}</SerifNum>
            <Text style={styles.healthLabel}>underwater</Text>
          </View>
          <View style={{ flex: 1.3 }}>
            <SerifNum style={[styles.healthNum, { color: toneColor(toneOf(worst.dayPct)) }]}>{worst.sym}</SerifNum>
            <Text style={styles.healthLabel}>weakest today</Text>
          </View>
        </View>
      </Card>

      {tips.map((t) => {
        const hue = HUE[t.hue];
        return (
          <View key={t.title} style={[styles.tip, { borderColor: hue.line }]}>
            <LinearGradient colors={[hue.bgFrom, C.heroTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.tipChip, { backgroundColor: hue.chip }]}>
              <Icon name={t.icon} size={19} color={hue.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipBody}>{t.body}</Text>
            </View>
          </View>
        );
      })}
    </Page>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  outOf: { color: C.pinkDim, fontSize: 14, fontFamily: F.sansSemi },
  divLabel: { fontSize: 12, fontFamily: F.sansBold, marginTop: 2 },
  bestPct: { fontSize: 13, fontFamily: F.sansBold, marginTop: 2, fontVariant: ['tabular-nums'] },
  bestSub: { color: C.dimmer, fontSize: 11.5, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  cardTitle: { color: C.text, fontSize: 14.5, fontFamily: F.sansBold, marginBottom: 16 },
  sectorHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sectorLabel: { color: C.text, fontSize: 13, fontFamily: F.sansSemi, opacity: 0.9 },
  sectorPct: { color: C.text, fontSize: 13, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
  healthNum: { fontSize: 24 },
  healthLabel: { color: C.pinkDim, fontSize: 11.5, fontFamily: F.sansSemi },
  tip: {
    borderRadius: R.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 11,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
  },
  tipChip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: C.text, fontSize: 14, fontFamily: F.sansBold, marginBottom: 4 },
  tipBody: { color: C.dim, fontSize: 12.5, fontFamily: F.sansMed, lineHeight: 19 },
});
