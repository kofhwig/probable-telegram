import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HoldingRow } from '../components/HoldingRow';
import { Icon } from '../components/Icon';
import { Field, Row } from '../components/ui';
import { alerts } from '../domain/compute';
import { usePortfolio } from '../store/PortfolioContext';
import { C, F } from '../theme/tokens';
import { SheetShell, useSheet } from './SheetHost';

export function SearchSheet() {
  const { S, c } = usePortfolio();
  const { close } = useSheet();
  const router = useRouter();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return c.hs
      .filter((h) => !query || h.sym.toLowerCase().includes(query) || h.name.toLowerCase().includes(query))
      .sort((a, b) => b.value - a.value);
  }, [c.hs, q]);

  return (
    <SheetShell title="Find a holding">
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Symbol or name" autoCapitalize="none" sheet />
      {results.length ? (
        <View style={{ gap: 10 }}>
          {results.map((h) => (
            <HoldingRow
              key={h.id}
              h={h}
              currency={S.currency}
              onPress={() => {
                close();
                router.push(`/holding/${h.id}`);
              }}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.plain}>Nothing matches that.</Text>
      )}
    </SheetShell>
  );
}

export function AlertsSheet() {
  const { S } = usePortfolio();
  const list = alerts(S);

  return (
    <SheetShell
      title="Alerts"
      sub={list.length ? `${list.length} thing${list.length === 1 ? '' : 's'} worth a look` : undefined}
    >
      {list.length ? (
        <View style={{ gap: 10 }}>
          {list.map((a, i) => (
            <Row key={i} align="flex-start">
              <View style={styles.chip}>
                <Icon
                  name={a.icon as never}
                  size={18}
                  color={a.tone === 'up' ? C.mint : a.tone === 'down' ? C.coral : C.pinkSoft}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.body}>{a.body}</Text>
              </View>
            </Row>
          ))}
        </View>
      ) : (
        <Text style={styles.plain}>
          Nothing needs you right now. Alerts appear when a position moves sharply, a price goes stale, or one branch
          grows too heavy.
        </Text>
      )}
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  plain: { color: C.dim, fontSize: 13, fontFamily: F.sansMed, lineHeight: 21, paddingVertical: 6, paddingHorizontal: 2 },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  title: { color: C.text, fontSize: 14, fontFamily: F.sansBold },
  body: { color: C.dim, fontSize: 12.5, fontFamily: F.sansMed, lineHeight: 18, marginTop: 2 },
});
