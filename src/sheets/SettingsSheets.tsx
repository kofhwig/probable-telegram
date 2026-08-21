import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useToast } from '../components/Toast';
import { Btn, Card, Eyebrow, Field, Select, tap } from '../components/ui';
import { CURRENCIES } from '../domain/constants';
import { today } from '../domain/format';
import type { QuoteProviderId } from '../domain/types';
import { getApiKey, setApiKey } from '../quotes/apiKey';
import { PROVIDERS } from '../quotes/refresh';
import { usePortfolio } from '../store/PortfolioContext';
import { C, F } from '../theme/tokens';
import { SheetShell, useSheet } from './SheetHost';

export function SettingsSheet() {
  const { S, saveSettings } = usePortfolio();
  const { open, close } = useSheet();
  const [name, setName] = useState(S.name);
  const [currency, setCurrency] = useState(S.currency);
  const [goal, setGoal] = useState(String(S.goal));
  const [liveQuotes, setLiveQuotes] = useState(S.settings.liveQuotes);
  const [provider, setProvider] = useState<QuoteProviderId>(S.settings.provider);
  const [key, setKey] = useState('');

  useEffect(() => {
    getApiKey().then((k) => setKey(k ?? ''));
  }, []);

  const submit = async () => {
    saveSettings({ name: name.trim(), currency, goal: parseFloat(goal.replace(/[^\d.]/g, '')), liveQuotes, provider });
    if (provider === 'finnhub') await setApiKey(key.trim());
    close();
  };

  const lastSync = S.settings.lastQuoteSync
    ? new Date(S.settings.lastQuoteSync).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'never';

  return (
    <SheetShell title="Settings">
      <Field label="Your name" value={name} onChangeText={setName} placeholder="Your name" sheet />
      <Select
        label="Currency"
        value={currency}
        onChange={setCurrency}
        options={Object.keys(CURRENCIES).map((k) => ({ value: k, label: `${k} ${CURRENCIES[k].trim()}` }))}
        hint="Display only — it does not convert your numbers."
      />
      <Field label="Goal" value={goal} onChangeText={setGoal} numeric sheet />

      <Eyebrow style={{ marginTop: 6, marginBottom: 10 }}>Live prices</Eyebrow>
      <View style={styles.switchRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.switchLabel}>Fetch quotes automatically</Text>
          <Text style={styles.switchSub}>
            Pull to refresh on Home, and once when the app opens. Last sync: {lastSync}.
          </Text>
        </View>
        <Switch
          value={liveQuotes}
          onValueChange={(v) => {
            tap();
            setLiveQuotes(v);
          }}
          trackColor={{ true: C.btnPrimaryFrom, false: 'rgba(255,255,255,.14)' }}
          thumbColor={Platform.OS === 'android' ? (liveQuotes ? C.onPink : '#eee') : undefined}
        />
      </View>

      {liveQuotes ? (
        <>
          <Select
            label="Provider"
            value={provider}
            onChange={setProvider}
            options={(Object.keys(PROVIDERS) as QuoteProviderId[]).map((id) => ({
              value: id,
              label: PROVIDERS[id].label,
            }))}
          />
          {provider === 'finnhub' ? (
            <Field
              label="Finnhub API key"
              value={key}
              onChangeText={setKey}
              placeholder="paste your key"
              autoCapitalize="none"
              hint="Stored in the device keychain, never in your export."
              sheet
            />
          ) : null}
        </>
      ) : null}

      <Btn label="Save" onPress={submit} style={{ marginTop: 6, marginBottom: 18 }} />

      <Eyebrow style={{ marginBottom: 10 }}>Your data</Eyebrow>
      <Card style={{ borderRadius: 16, padding: 14, marginBottom: 11 }}>
        <Stat label="Positions" value={String(S.holdings.length)} />
        <Stat label="Logged entries" value={String(S.tx.length)} />
        <Stat label="Days of history" value={String(S.history.length)} />
        <Stat label="Saved on device" value="yes" tone={C.mint} />
      </Card>
      <Btn kind="sec" compact label="Export or import" onPress={() => open({ name: 'data' })} />
      <Btn kind="danger" compact label="Start over" onPress={() => open({ name: 'reset' })} style={{ marginTop: 9 }} />
    </SheetShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

export function DataSheet() {
  const { exportJSON, importJSON } = usePortfolio();
  const { close } = useSheet();
  const toast = useToast();
  const [text, setText] = useState(() => exportJSON());
  const [err, setErr] = useState('');

  const share = async () => {
    try {
      const file = new File(Paths.cache, `bloom-portfolio-${today()}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Bloom portfolio' });
      } else {
        await Clipboard.setStringAsync(text);
        toast('Sharing is unavailable — copied instead');
      }
    } catch {
      toast('Could not write the export file');
    }
  };

  const pick = async () => {
    try {
      const res = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain'] });
      if (res.canceled) return;
      const loaded = await res.result.text();
      if (importJSON(loaded)) {
        tap('success');
        close();
      } else {
        setErr('That file is not a Bloom export.');
      }
    } catch {
      setErr('Could not read that file.');
    }
  };

  return (
    <SheetShell title="Export or import" error={err}>
      <Field
        label="Your portfolio as JSON"
        value={text}
        onChangeText={setText}
        multiline
        hint="Share it somewhere safe, or paste a previous export over it and load."
        sheet
      />
      <View style={styles.two}>
        <Btn
          kind="sec"
          compact
          label="Copy"
          onPress={async () => {
            await Clipboard.setStringAsync(text);
            toast('Copied');
          }}
          style={{ flex: 1 }}
        />
        <Btn kind="sec" compact label="Share file" onPress={share} style={{ flex: 1 }} />
      </View>
      <Btn kind="sec" compact label="Load from a file" onPress={pick} style={{ marginTop: 10 }} />
      <Btn
        label="Load pasted data"
        onPress={() => {
          if (importJSON(text)) {
            tap('success');
            close();
          } else setErr('That is not a Bloom export.');
        }}
        style={{ marginTop: 10 }}
      />
    </SheetShell>
  );
}

export function ResetSheet() {
  const { reset } = usePortfolio();
  const { close } = useSheet();
  return (
    <SheetShell title="Start over">
      <Text style={styles.warn}>
        This clears every holding, entry and day of history on this device. Export first if you want a copy.
      </Text>
      <Btn
        kind="danger"
        label="Delete everything"
        onPress={() => {
          reset();
          tap('warning');
          close();
        }}
      />
      <Btn kind="sec" label="Keep my portfolio" onPress={close} style={{ marginTop: 9 }} />
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  two: { flexDirection: 'row', gap: 11 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  switchLabel: { color: C.text, fontSize: 14, fontFamily: F.sansBold },
  switchSub: { color: C.dim, fontSize: 12, fontFamily: F.sansMed, lineHeight: 17, marginTop: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { color: C.dim, fontSize: 13, fontFamily: F.sansSemi },
  statValue: { color: C.text, fontSize: 13, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  warn: { color: C.dim, fontSize: 13.5, fontFamily: F.sansMed, lineHeight: 21, marginTop: 4, marginBottom: 16 },
});
