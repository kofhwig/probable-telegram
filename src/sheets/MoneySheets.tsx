import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Btn, Card, Field, Seg, Select, SerifNum, tap } from '../components/ui';
import { comp } from '../domain/compute';
import { dayLabel, money2, parseNum, today } from '../domain/format';
import type { TxType } from '../domain/types';
import { usePortfolio } from '../store/PortfolioContext';
import { C, F } from '../theme/tokens';
import { TX_STYLE } from '../components/txStyle';
import { SheetShell, useSheet } from './SheetHost';

type CashMode = 'deposit' | 'withdraw' | 'set';

export function CashSheet() {
  const { S, cash } = usePortfolio();
  const { close } = useSheet();
  const [mode, setMode] = useState<CashMode>('deposit');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const n = parseNum(amt);
    if (isNaN(n)) return setErr('Enter an amount.');
    if (mode !== 'set' && n <= 0) return setErr('Amount must be above zero.');
    cash(mode, n, note.trim());
    tap('success');
    close();
  };

  return (
    <SheetShell title="Cash" sub="Cash counts toward net worth and funds your buys." error={err}>
      <Seg
        value={mode}
        onChange={(m) => {
          setMode(m);
          setAmt(m === 'set' ? String(S.cash) : '');
        }}
        options={[
          { value: 'deposit', label: 'Deposit' },
          { value: 'withdraw', label: 'Withdraw' },
          { value: 'set', label: 'Set balance' },
        ]}
      />
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Current balance</Text>
        <SerifNum style={styles.balanceValue}>{money2(S.currency, S.cash)}</SerifNum>
      </View>
      <Field
        label={mode === 'set' ? 'New balance' : 'Amount'}
        value={amt}
        onChangeText={setAmt}
        placeholder="1000"
        numeric
        sheet
      />
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder={mode === 'deposit' ? 'Transfer from bank' : 'What it was for'}
        sheet
      />
      <Btn
        label={mode === 'set' ? 'Set balance' : mode === 'deposit' ? 'Add to cash' : 'Take out of cash'}
        onPress={submit}
        style={{ marginTop: 6 }}
      />
    </SheetShell>
  );
}

export function LogSheet() {
  const { S, logActivity } = usePortfolio();
  const { close } = useSheet();
  const [kind, setKind] = useState<Extract<TxType, 'dividend' | 'deposit' | 'withdraw'>>('dividend');
  const [sym, setSym] = useState('');
  const [amt, setAmt] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const n = parseNum(amt);
    const d = date.trim();
    if (isNaN(n) || n <= 0) return setErr('Enter an amount above zero.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return setErr(`Date needs to look like ${today()}.`);
    logActivity(kind, n, d, note.trim(), sym);
    tap('success');
    close();
  };

  return (
    <SheetShell title="Log activity" sub="Dividends and transfers land in your cash balance." error={err}>
      <Seg
        value={kind}
        onChange={setKind}
        options={[
          { value: 'dividend', label: 'Dividend' },
          { value: 'deposit', label: 'Deposit' },
          { value: 'withdraw', label: 'Withdraw' },
        ]}
      />
      {kind === 'dividend' && S.holdings.length ? (
        <Select
          label="From"
          value={sym}
          onChange={setSym}
          options={[{ value: '', label: 'No specific holding' }, ...S.holdings.map((h) => ({ value: h.sym, label: h.sym }))]}
        />
      ) : null}
      <Field label="Amount" value={amt} onChangeText={setAmt} placeholder="284.10" numeric sheet />
      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" sheet />
      <Field label="Note" value={note} onChangeText={setNote} placeholder="Quarterly distribution" sheet />
      <Btn label="Log it" onPress={submit} style={{ marginTop: 6 }} />
    </SheetShell>
  );
}

export function GoalSheet() {
  const { S, setGoal } = usePortfolio();
  const { close } = useSheet();
  const [goal, setGoalText] = useState(String(S.goal));
  const [err, setErr] = useState('');
  const progress = comp(S).progress;

  const submit = () => {
    const g = parseNum(goal);
    if (isNaN(g) || g <= 0) return setErr('Give it a number above zero.');
    setGoal(g);
    tap('success');
    close();
  };

  return (
    <SheetShell title="Your goal" error={err}>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Icon name="lotus" size={34} color={C.pink} />
      </View>
      <Field label="Target net worth" value={goal} onChangeText={setGoalText} numeric sheet />
      <Text style={styles.hint}>
        The tree fills in as you approach it. Currently {Math.round(progress * 100)}% there.
      </Text>
      <Btn label="Save goal" onPress={submit} />
    </SheetShell>
  );
}

export function TxSheet({ id }: { id: string }) {
  const { S, deleteTx } = usePortfolio();
  const { close } = useSheet();
  const t = S.tx.find((x) => x.id === id);

  if (!t) {
    return (
      <SheetShell title="Entry">
        <Text style={styles.plain}>Gone.</Text>
      </SheetShell>
    );
  }

  const st = TX_STYLE[t.type] ?? TX_STYLE.price;
  const rows: [string, string][] = [
    ['Amount', (t.amount >= 0 ? '+' : '−') + money2(S.currency, Math.abs(t.amount))],
    ['Date', dayLabel(t.date)],
    ['Note', t.note || '—'],
  ];

  return (
    <SheetShell title={st.label + (t.sym ? ` · ${t.sym}` : '')}>
      <Card style={{ borderRadius: 16, padding: 16, marginBottom: 14 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.detailRow}>
            <Text style={styles.detailKey}>{k}</Text>
            <Text style={styles.detailVal}>{v}</Text>
          </View>
        ))}
      </Card>
      <Text style={styles.fine}>
        Deleting the entry removes it from the log only. It does not undo the effect on your cash or units.
      </Text>
      <Btn
        kind="danger"
        label="Delete entry"
        onPress={() => {
          deleteTx(id);
          tap('warning');
          close();
        }}
      />
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  balanceLabel: { color: C.dim, fontSize: 13, fontFamily: F.sansSemi },
  balanceValue: { fontSize: 24, fontVariant: ['tabular-nums'] },
  hint: { color: C.dimmer, fontSize: 11.5, fontFamily: F.sansMed, lineHeight: 17, marginBottom: 14 },
  plain: { color: C.dim, fontSize: 13, fontFamily: F.sansMed },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: 12 },
  detailKey: { color: C.dim, fontSize: 13.5, fontFamily: F.sansSemi },
  detailVal: { color: C.text, fontSize: 13.5, fontFamily: F.sansBold, textAlign: 'right', flexShrink: 1 },
  fine: { color: C.dimmer, fontSize: 12, fontFamily: F.sansMed, lineHeight: 18, marginBottom: 12 },
});
