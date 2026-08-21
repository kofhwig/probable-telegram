import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import {
  Btn,
  Empty,
  EmptyText,
  Eyebrow,
  GhostBtn,
  PageKick,
  PageTitle,
  Row,
  SerifNum,
  tap,
} from '../../src/components/ui';
import { money, pct, price as fmtPrice, qty, signed, toneOf } from '../../src/domain/format';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F, R, toneColor } from '../../src/theme/tokens';

export default function PortfolioScreen() {
  const { S, c, refresh, refreshing } = usePortfolio();
  const { open } = useSheet();
  const router = useRouter();
  const hs = c.hs.slice().sort((a, b) => b.value - a.value);
  const totalTone = toneOf(c.total);

  return (
    <Page onRefresh={S.settings.liveQuotes ? () => refresh() : undefined} refreshing={refreshing}>
      <View style={styles.head}>
        <View>
          <PageKick>Holdings</PageKick>
          <PageTitle>Your portfolio</PageTitle>
        </View>
        <GhostBtn label="Add" icon={<Icon name="plus" size={14} color={C.pinkSoft} />} onPress={() => open({ name: 'add' })} />
      </View>

      <View style={styles.summary}>
        <LinearGradient colors={[C.investedFrom, C.investedTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Invested value</Text>
            <SerifNum style={styles.invested}>{money(S.currency, c.invested)}</SerifNum>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.retLabel}>All-time return</Text>
            <Text style={[styles.retValue, { color: toneColor(totalTone) }]}>{signed(S.currency, c.total)}</Text>
            <Text style={styles.retSub}>
              {S.realized
                ? `${signed(S.currency, c.unreal)} open · ${signed(S.currency, S.realized)} realised`
                : 'unrealised'}
            </Text>
          </View>
        </View>
        {hs.length ? (
          <View style={styles.weightBar}>
            {hs.map((h) => (
              <View key={h.id} style={{ flex: Math.max(h.weight, 0.6), height: 8, borderRadius: 2, backgroundColor: h.color }} />
            ))}
            {S.cash > 0 ? (
              <View style={{ flex: Math.max(c.cashWeight, 0.6), height: 8, borderRadius: 2, backgroundColor: C.muted }} />
            ) : null}
          </View>
        ) : null}
      </View>

      {hs.length ? (
        <>
          <View style={styles.listHead}>
            <Eyebrow>
              {hs.length} position{hs.length > 1 ? 's' : ''}
            </Eyebrow>
            <Pressable
              onPress={() => {
                tap();
                open({ name: 'prices' });
              }}
              style={styles.updateBtn}
            >
              <Icon name="refresh" size={14} color={C.pinkSoft} />
              <Text style={styles.link}>Update prices</Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            {hs.map((h) => {
              const t = toneOf(h.dayPct);
              return (
                <Row key={h.id} onPress={() => router.push(`/holding/${h.id}`)}>
                  <View style={[styles.chip, { backgroundColor: h.color }]}>
                    <Text style={styles.chipText}>{h.sym.slice(0, 4)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sym}>{h.sym}</Text>
                    <Text style={styles.sub}>
                      {qty(h.shares)} @ {fmtPrice(S.currency, h.price)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.value}>{money(S.currency, h.value)}</Text>
                    <Text style={[styles.day, { color: toneColor(t) }]}>{pct(h.dayPct)}</Text>
                  </View>
                  <Icon name="caretRight" size={15} color={C.dimmer} />
                </Row>
              );
            })}
          </View>
        </>
      ) : (
        <Empty>
          <EmptyText>No positions yet. Add the first one and the allocation, insights and tree all start filling in.</EmptyText>
          <Btn label="Add a holding" onPress={() => open({ name: 'add' })} />
        </Empty>
      )}

      <Eyebrow style={{ marginTop: 22, marginBottom: 10, marginHorizontal: 2 }}>Cash</Eyebrow>
      <Row onPress={() => open({ name: 'cash' })}>
        <View style={styles.iconChip}>
          <Icon name="wallet" size={19} color={C.pinkSoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sym}>Cash and equivalents</Text>
          <Text style={styles.sub}>{c.net > 0 ? `${c.cashWeight.toFixed(1)}% of net worth` : 'Not set'}</Text>
        </View>
        <Text style={[styles.value, S.cash < 0 && { color: C.coral }]}>{money(S.currency, S.cash)}</Text>
        <Icon name="caretRight" size={15} color={C.dimmer} />
      </Row>
    </Page>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, marginTop: 6 },
  summary: {
    borderRadius: R.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.09)',
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryLabel: { color: C.pinkSoft, fontSize: 12, fontFamily: F.sansSemi },
  invested: { fontSize: 32, fontVariant: ['tabular-nums'] },
  retLabel: { color: C.pinkDim, fontSize: 11, fontFamily: F.sansSemi },
  retValue: { fontSize: 17, fontFamily: F.sansHeavy, fontVariant: ['tabular-nums'] },
  retSub: { color: C.dimmer, fontSize: 10, fontFamily: F.sansSemi, marginTop: 2 },
  weightBar: { flexDirection: 'row', gap: 2, marginTop: 14, height: 8, borderRadius: 999, overflow: 'hidden' },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginHorizontal: 2 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { color: C.pinkSoft, fontSize: 12.5, fontFamily: F.sansBold },

  chip: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: F.mono, fontSize: 12, color: C.onPink, letterSpacing: -0.3, fontWeight: '700' },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.07)',
  },
  sym: { color: C.text, fontSize: 15, fontFamily: F.sansBold },
  sub: { color: C.dim, fontSize: 12, fontFamily: F.sansMed, fontVariant: ['tabular-nums'] },
  value: { color: C.text, fontSize: 15, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
  day: { fontSize: 12.5, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
});
