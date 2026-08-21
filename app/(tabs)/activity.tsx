import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { TX_STYLE } from '../../src/components/txStyle';
import {
  Btn,
  Empty,
  EmptyText,
  Eyebrow,
  GhostBtn,
  PageKick,
  PageTitle,
  Row,
} from '../../src/components/ui';
import { dayLabel, money2, monthLabel } from '../../src/domain/format';
import type { Tx } from '../../src/domain/types';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F } from '../../src/theme/tokens';

export default function Activity() {
  const { S } = usePortfolio();
  const { open } = useSheet();

  /** Newest first, with a month heading whenever the month changes. */
  const rows = useMemo(() => {
    const sorted = S.tx.slice().sort((a, b) => b.date.localeCompare(a.date));
    const out: ({ kind: 'month'; label: string } | { kind: 'tx'; tx: Tx })[] = [];
    let last = '';
    sorted.forEach((tx) => {
      const m = monthLabel(tx.date);
      if (m !== last) {
        last = m;
        out.push({ kind: 'month', label: m });
      }
      out.push({ kind: 'tx', tx });
    });
    return out;
  }, [S.tx]);

  return (
    <Page>
      <View style={styles.head}>
        <View>
          <PageKick>Recent</PageKick>
          <PageTitle>Activity</PageTitle>
        </View>
        <GhostBtn label="Log" icon={<Icon name="plus" size={14} color={C.pinkSoft} />} onPress={() => open({ name: 'log' })} />
      </View>

      {!S.tx.length ? (
        <Empty>
          <EmptyText>
            Nothing logged yet. Buys, sells, dividends and transfers you record will land here, oldest at the bottom.
          </EmptyText>
          <Btn label="Log something" onPress={() => open({ name: 'log' })} />
        </Empty>
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((r, i) =>
            r.kind === 'month' ? (
              <Eyebrow key={`m${i}`} style={{ marginTop: 8, marginHorizontal: 2 }}>
                {r.label}
              </Eyebrow>
            ) : (
              <TxRow key={r.tx.id} tx={r.tx} currency={S.currency} onPress={() => open({ name: 'tx', id: r.tx.id })} />
            )
          )}
        </View>
      )}
    </Page>
  );
}

function TxRow({ tx, currency, onPress }: { tx: Tx; currency: string; onPress: () => void }) {
  const st = TX_STYLE[tx.type] ?? TX_STYLE.price;
  const amtColor = tx.amount > 0 ? C.mint : tx.amount < 0 ? C.text : C.dimmer;

  return (
    <Row onPress={onPress}>
      <View style={[styles.chip, { backgroundColor: st.bg }]}>
        <Icon name={st.icon} size={19} color={st.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title}>
          {st.label}
          {tx.sym ? ` · ${tx.sym}` : ''}
        </Text>
        <Text style={styles.note} numberOfLines={1}>
          {tx.note || '—'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: amtColor }]}>
          {(tx.amount >= 0 ? '+' : '−') + money2(currency, Math.abs(tx.amount))}
        </Text>
        <Text style={styles.date}>{dayLabel(tx.date)}</Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, marginTop: 6 },
  chip: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 14.5, fontFamily: F.sansBold },
  note: { color: C.dim, fontSize: 12, fontFamily: F.sansMed },
  amount: { fontSize: 14.5, fontFamily: F.sansBold, fontVariant: ['tabular-nums'] },
  date: { color: C.dimmer, fontSize: 11.5, fontFamily: F.sansMed },
});
