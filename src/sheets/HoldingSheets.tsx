import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Btn,
  Card,
  Field,
  Seg,
  Select,
  tap,
} from '../components/ui';
import { SECTORS } from '../domain/constants';
import { daysAgo, money2, parseNum, price as fmtPrice, qty } from '../domain/format';
import { quoteSymbolFor } from '../quotes/provider';
import { usePortfolio } from '../store/PortfolioContext';
import { C, F, PALETTE } from '../theme/tokens';
import { SheetShell, useSheet } from './SheetHost';

/** Add a holding, or edit one in place — the prototype's `add` / `edit` sheet. */
export function AddEditSheet({ id }: { id?: string }) {
  const { S, saveHolding, refresh } = usePortfolio();
  const { close } = useSheet();
  const editing = id ? S.holdings.find((h) => h.id === id) : undefined;

  const [sym, setSym] = useState(editing?.sym ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [shares, setShares] = useState(editing ? String(editing.shares) : '');
  const [avg, setAvg] = useState(editing ? String(editing.avg) : '');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [prev, setPrev] = useState(editing?.prev != null ? String(editing.prev) : '');
  const [sector, setSector] = useState(editing?.sector ?? 'Technology');
  const [color, setColor] = useState(editing?.color ?? PALETTE[0][1]);
  const [about, setAbout] = useState(editing?.about ?? '');
  const [quoteSym, setQuoteSym] = useState(editing?.quoteSymbol ?? '');
  const [err, setErr] = useState('');

  const submit = () => {
    const sy = sym.trim().toUpperCase();
    const sh = parseNum(shares);
    const av = parseNum(avg);
    const pr = parseNum(price);
    const pvRaw = prev.trim();
    const pv = pvRaw ? parseNum(pvRaw) : null;

    if (!sy) return setErr('A symbol is required.');
    if (isNaN(sh) || sh <= 0) return setErr('Units must be a number above zero.');
    if (isNaN(pr) || pr < 0) return setErr('Enter the current price.');

    saveHolding(
      {
        sym: sy,
        name: name.trim() || sy,
        shares: sh,
        avg: isNaN(av) ? pr : av,
        price: pr,
        prev: pv == null || isNaN(pv) ? null : pv,
        sector,
        color,
        about: about.trim(),
        quoteSymbol: quoteSym.trim().toUpperCase() || undefined,
      },
      id
    );
    close();
    if (S.settings.liveQuotes) refresh({ silent: true });
  };

  const autoQuote = quoteSymbolFor({ sym: sym || 'SYM', sector, quoteSymbol: quoteSym });

  return (
    <SheetShell
      title={editing ? `Edit ${editing.sym}` : 'Add a holding'}
      sub={editing ? null : 'Previous close is optional'}
      error={err}
    >
      <Field label="Symbol" value={sym} onChangeText={setSym} placeholder="NVDA" autoCapitalize="characters" sheet />
      <Field label="Name" value={name} onChangeText={setName} placeholder="NVIDIA Corp" sheet />
      <View style={styles.two}>
        <Field
          label={editing ? 'Units held' : 'Units'}
          value={shares}
          onChangeText={setShares}
          placeholder="10"
          numeric
          style={styles.half}
          sheet
        />
        <Field label="Average cost" value={avg} onChangeText={setAvg} placeholder="150" numeric style={styles.half} sheet />
      </View>
      <View style={styles.two}>
        <Field label="Current price" value={price} onChangeText={setPrice} placeholder="172.32" numeric style={styles.half} sheet />
        <Field label="Previous close" value={prev} onChangeText={setPrev} placeholder="optional" numeric style={styles.half} sheet />
      </View>

      <Select
        label="Sector"
        value={sector}
        options={SECTORS.map((s) => ({ value: s, label: s }))}
        onChange={setSector}
      />

      <View style={{ marginBottom: 13 }}>
        <Text style={styles.label}>Colour</Text>
        <View style={styles.swatches}>
          {PALETTE.map(([name2, c]) => (
            <Pressable
              key={name2}
              accessibilityLabel={name2}
              onPress={() => {
                tap();
                setColor(c);
              }}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
            />
          ))}
        </View>
      </View>

      <Field
        label="Quote symbol"
        value={quoteSym}
        onChangeText={setQuoteSym}
        placeholder={autoQuote}
        autoCapitalize="characters"
        hint={`What we ask the price provider for. Blank uses ${autoQuote}.`}
        sheet
      />

      <Field
        label="Notes"
        value={about}
        onChangeText={setAbout}
        placeholder="Why you hold it, what to watch"
        multiline
        sheet
      />

      <Btn label={editing ? 'Save changes' : 'Add holding'} onPress={submit} style={{ marginTop: 6 }} />
    </SheetShell>
  );
}

/** Record a buy or a sell against a position. */
export function TradeSheet({ id, initialSide }: { id: string; initialSide: 'buy' | 'sell' }) {
  const { S, trade } = usePortfolio();
  const { close } = useSheet();
  const h = S.holdings.find((x) => x.id === id);
  const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
  const [q, setQ] = useState('');
  const [p, setP] = useState(h ? String(+h.price.toFixed(4)) : '');
  const [fee, setFee] = useState('');
  const [err, setErr] = useState('');

  const est = useMemo(() => {
    const qn = parseNum(q);
    const pn = parseNum(p);
    return !isNaN(qn) && !isNaN(pn) ? qn * pn : 0;
  }, [q, p]);

  if (!h) return <SheetShell title="Trade">{null}</SheetShell>;

  const submit = () => {
    const qn = parseNum(q);
    const pn = parseNum(p);
    const fn = parseNum(fee) || 0;
    if (isNaN(qn) || qn <= 0) return setErr('How many units?');
    if (isNaN(pn) || pn < 0) return setErr('Enter a price per unit.');
    if (side === 'sell' && qn > h.shares + 1e-9) return setErr(`You only hold ${qty(h.shares)} units.`);
    trade(id, side, qn, pn, fn);
    tap('success');
    close();
  };

  return (
    <SheetShell
      title={`${side === 'buy' ? 'Buy' : 'Sell'} ${h.sym}`}
      sub="Updates units, average cost and cash."
      error={err}
    >
      <Seg
        value={side}
        onChange={setSide}
        options={[
          { value: 'buy', label: 'Buy' },
          { value: 'sell', label: 'Sell' },
        ]}
      />
      <View style={styles.two}>
        <Field
          label="Units"
          value={q}
          onChangeText={setQ}
          placeholder={side === 'sell' ? qty(h.shares) : '10'}
          numeric
          style={styles.half}
          sheet
        />
        <Field label="Price per unit" value={p} onChangeText={setP} numeric style={styles.half} sheet />
      </View>
      <Field label="Fees" value={fee} onChangeText={setFee} placeholder="0" numeric sheet />

      <Card style={{ borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <View style={styles.estRow}>
          <Text style={styles.estLabel}>{side === 'buy' ? 'Cash out' : 'Cash in'}</Text>
          <Text style={styles.estValue}>{money2(S.currency, est)}</Text>
        </View>
        <View style={[styles.estRow, { marginTop: 6 }]}>
          <Text style={styles.estSub}>Cash after</Text>
          <Text style={styles.estSub}>{money2(S.currency, S.cash + (side === 'buy' ? -est : est))}</Text>
        </View>
        {side === 'sell' ? (
          <View style={[styles.estRow, { marginTop: 6 }]}>
            <Text style={styles.estSub}>You hold</Text>
            <Text style={styles.estSub}>{qty(h.shares)} units</Text>
          </View>
        ) : null}
      </Card>

      <Btn label={side === 'buy' ? 'Record purchase' : 'Record sale'} onPress={submit} />
    </SheetShell>
  );
}

/** Type new prices by hand, or pull them from the quote provider. */
export function PricesSheet({ only }: { only?: string }) {
  const { S, savePrices, refresh, refreshing } = usePortfolio();
  const { close } = useSheet();
  const list = only ? S.holdings.filter((h) => h.id === only) : S.holdings;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(list.map((h) => [h.id, String(+h.price.toFixed(4))]))
  );

  if (!list.length) {
    return (
      <SheetShell title="Update prices">
        <Text style={styles.plain}>No holdings yet.</Text>
      </SheetShell>
    );
  }

  const submit = () => {
    const next: Record<string, number> = {};
    Object.entries(values).forEach(([hid, v]) => {
      const n = parseNum(v);
      if (!isNaN(n)) next[hid] = n;
    });
    savePrices(next);
    tap('success');
    close();
  };

  return (
    <SheetShell title="Update prices" sub="Today’s change is measured from the price you replace.">
      {S.settings.liveQuotes ? (
        <Btn
          kind="sec"
          compact
          label={refreshing ? 'Fetching quotes…' : 'Fetch live prices'}
          disabled={refreshing}
          onPress={async () => {
            const result = await refresh();
            if (result?.updated) close();
          }}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {list.map((h) => (
        <Field
          key={h.id}
          label={`${h.sym} · ${h.name}`}
          value={values[h.id] ?? ''}
          onChangeText={(v) => setValues((prev) => ({ ...prev, [h.id]: v }))}
          numeric
          hint={`was ${fmtPrice(S.currency, h.price)}${
            h.updated ? ` · ${daysAgo(h.updated) === 0 ? 'today' : daysAgo(h.updated) + 'd ago'}` : ''
          }`}
          sheet
        />
      ))}
      <Btn label="Save prices" onPress={submit} style={{ marginTop: 6 }} />
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  two: { flexDirection: 'row', gap: 11 },
  half: { flex: 1 },
  label: {
    color: C.dim,
    fontSize: 11.5,
    fontFamily: F.sansBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  swatches: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#fff', transform: [{ scale: 1.08 }] },
  estRow: { flexDirection: 'row', justifyContent: 'space-between' },
  estLabel: { color: C.dim, fontSize: 13, fontFamily: F.sansSemi },
  estValue: { color: C.text, fontSize: 13, fontFamily: F.sansHeavy, fontVariant: ['tabular-nums'] },
  estSub: { color: C.dimmer, fontSize: 12, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  plain: { color: C.dim, fontSize: 13, fontFamily: F.sansMed },
});
