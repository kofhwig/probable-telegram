import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chart } from '../../src/components/Chart';
import { Icon } from '../../src/components/Icon';
import { useToast } from '../../src/components/Toast';
import { Btn, Card, IconBtn, SerifNum, tap } from '../../src/components/ui';
import { daysAgo, money, pct, price as fmtPrice, qty, signed, toneOf } from '../../src/domain/format';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F, toneColor } from '../../src/theme/tokens';

/**
 * The prototype's full-screen `.overlay` becomes a real modal route, so the
 * system back gesture dismisses it.
 */
export default function HoldingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { S, c, deleteHolding } = usePortfolio();
  const { open } = useSheet();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const h = c.hs.find((x) => x.id === id);
  if (!h) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.gone}>This holding is gone.</Text>
        <Btn kind="sec" label="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const tone = toneOf(h.dayPct);
  const retTone = toneOf(h.pl);
  const hist = (h.hist || []).slice(-120);
  const col = tone === 'down' ? C.coral : tone === 'up' ? C.mint : C.muted;

  /** Two taps to remove, as in the prototype — no modal, but no accidents. */
  const remove = () => {
    if (!pendingDelete) {
      setPendingDelete(true);
      toast('Tap again to remove this holding');
      deleteTimer.current = setTimeout(() => setPendingDelete(false), 3200);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteHolding(h.id);
    tap('warning');
    router.back();
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[C.overlayTop, C.overlayBottom]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <IconBtn label="Back" size={42} onPress={() => router.back()}>
            <Icon name="arrowLeft" size={18} color={C.text} />
          </IconBtn>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.sym}>{h.sym}</Text>
            <Text style={styles.name}>{h.name}</Text>
          </View>
          <IconBtn label="Edit holding" size={42} onPress={() => open({ name: 'edit', id: h.id })}>
            <Icon name="pencil" size={17} color={C.pinkSoft} />
          </IconBtn>
        </View>

        <View style={{ alignItems: 'center' }}>
          <SerifNum style={styles.price}>{fmtPrice(S.currency, h.price)}</SerifNum>
          <Text style={[styles.dayLine, { color: toneColor(tone) }]}>
            {pct(h.dayPct)} · {signed(S.currency, h.dayAbs)} today
          </Text>
          <Text style={styles.updated}>
            {h.updated
              ? daysAgo(h.updated) === 0
                ? 'price updated today'
                : `price ${daysAgo(h.updated)} day${daysAgo(h.updated) > 1 ? 's' : ''} old`
              : 'price entered by you'}
          </Text>
        </View>

        {hist.length > 1 ? (
          <View style={{ marginTop: 22, marginBottom: 10 }}>
            <Chart
              vals={hist.map((p) => p.p)}
              dates={hist.map((p) => p.d)}
              height={150}
              color={col}
              strokeWidth={2.6}
              gradientId="detailFill"
              format={(v) => fmtPrice(S.currency, v)}
            />
          </View>
        ) : (
          <Text style={styles.noHist}>No price history yet.{'\n'}Each price you record adds a point.</Text>
        )}

        <View style={styles.statGrid}>
          <StatBox label="Your position" value={money(S.currency, h.value)} sub={`${qty(h.shares)} ${h.shares === 1 ? 'unit' : 'units'}`} />
          <StatBox label="Total return" value={signed(S.currency, h.pl)} sub={pct(h.plPct)} tone={toneColor(retTone)} />
          <StatBox label="Average cost" value={fmtPrice(S.currency, h.avg)} sub="you paid" />
          <StatBox label="Portfolio weight" value={`${h.weight.toFixed(1)}%`} sub="of net worth" />
        </View>

        {h.about ? (
          <Card style={{ borderRadius: 16, padding: 16, marginTop: 11 }}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesBody}>{h.about}</Text>
          </Card>
        ) : null}

        <Btn kind="sec" compact label="Update price" onPress={() => open({ name: 'prices', id: h.id })} style={{ marginTop: 11 }} />
        <Btn
          kind="danger"
          compact
          label={pendingDelete ? 'Tap again to remove' : 'Remove this holding'}
          onPress={remove}
          style={{ marginTop: 9 }}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Btn kind="sec" label="Sell" onPress={() => open({ name: 'trade', id: h.id, side: 'sell' })} style={{ flex: 1 }} />
        <Btn label="Buy more" onPress={() => open({ name: 'trade', id: h.id, side: 'buy' })} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function StatBox({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.overlayBottom },
  // clears the pinned Buy/Sell footer
  body: { paddingHorizontal: 22, paddingBottom: 32 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  sym: { color: C.text, fontFamily: F.sansBold, fontSize: 15 },
  name: { color: C.dim, fontSize: 11.5, fontFamily: F.sansMed },
  price: { fontSize: 44, fontVariant: ['tabular-nums'] },
  dayLine: { fontSize: 14, fontFamily: F.sansBold, marginTop: 2, fontVariant: ['tabular-nums'] },
  updated: { color: C.dimmer, fontSize: 11, fontFamily: F.sansSemi, marginTop: 4 },
  noHist: {
    marginTop: 18,
    marginBottom: 6,
    textAlign: 'center',
    color: C.dimmer,
    fontSize: 12,
    fontFamily: F.sansSemi,
    lineHeight: 18,
    paddingVertical: 30,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 8 },
  statBox: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 15,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  statLabel: { color: C.dim, fontSize: 11.5, fontFamily: F.sansSemi },
  statValue: { color: C.text, fontSize: 18, fontFamily: F.sansHeavy, marginTop: 5, fontVariant: ['tabular-nums'] },
  statSub: { color: C.dim, fontSize: 11.5, fontFamily: F.sansMed, marginTop: 1, fontVariant: ['tabular-nums'] },
  notesTitle: { color: C.text, fontFamily: F.sansBold, fontSize: 13.5, marginBottom: 6 },
  notesBody: { color: C.dim, fontSize: 12.5, fontFamily: F.sansMed, lineHeight: 19 },
  footer: { flexDirection: 'row', gap: 11, paddingHorizontal: 22, paddingTop: 14 },
  gone: { color: C.dim, fontSize: 14, fontFamily: F.sansMed, textAlign: 'center', marginBottom: 16 },
});
