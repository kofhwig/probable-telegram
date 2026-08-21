import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../src/components/Icon';
import { Page } from '../../src/components/Page';
import { PetalBurst } from '../../src/components/Petals';
import { Card, SectionTitle, SerifNum, tap } from '../../src/components/ui';
import { Tree, TreeShadow } from '../../src/components/Tree';
import { daysAgo, money, pct } from '../../src/domain/format';
import { useSheet } from '../../src/sheets/SheetHost';
import { usePortfolio } from '../../src/store/PortfolioContext';
import { C, F } from '../../src/theme/tokens';

const STAGES = [
  'Stage 1 of 4 · Seedling',
  'Stage 2 of 4 · Taking root',
  'Stage 3 of 4 · Blossoming',
  'Stage 4 of 4 · Full bloom',
];

export default function Bloom() {
  const { S, c } = usePortfolio();
  const { open } = useSheet();
  const p = c.progress;
  const stage = p >= 1 ? 3 : p >= 0.5 ? 2 : p >= 0.2 ? 1 : 0;
  const [burst, setBurst] = useState(0);

  /** Crossing a milestone is worth a buzz and a shower of petals. */
  const lastStage = useRef(stage);
  useEffect(() => {
    if (stage > lastStage.current) {
      tap('success');
      setBurst((b) => b + 1);
    }
    lastStage.current = stage;
  }, [stage]);

  const yearAgo = Date.parse(new Date().toISOString().slice(0, 10)) - 365 * 86400000;
  const divs = S.tx
    .filter((t) => t.type === 'dividend' && Date.parse(t.date) >= yearAgo)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  let growthTxt = 'not enough history';
  let growthLbl = 'growth';
  if (S.history.length > 1) {
    const oldest = S.history.find((x) => Date.parse(x.d) >= yearAgo) || S.history[0];
    const span = Math.max(1, daysAgo(oldest.d));
    if (oldest.v > 0) {
      growthTxt = pct(((c.net - oldest.v) / oldest.v) * 100);
      growthLbl = 'growth · ' + (span >= 350 ? '12 mo' : span >= 60 ? `${Math.round(span / 30)} mo` : `${span} d`);
    }
  }
  const growthColor = growthTxt.charAt(0) === '−' ? C.coral : C.mint;

  const marks: [number, string, string][] = [
    [0.1, 'Seed planted', `The first ${money(S.currency, S.goal * 0.1)} in the ground`],
    [0.25, 'Taking root', 'A quarter of the way there'],
    [0.5, 'Branching out', `Halfway to ${money(S.currency, S.goal)}`],
    [1.0, 'Full bloom', 'Your goal, reached'],
  ];
  const reachedIdx = marks.reduce((acc, m, i) => (p >= m[0] ? i : acc), -1);

  return (
    <Page>
      <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 4 }}>
        <Text style={styles.stage}>{STAGES[stage]}</Text>
        <SerifNum style={styles.headline}>
          {p > 0 ? 'Your wealth is blossoming' : 'Nothing has bloomed yet'}
        </SerifNum>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Release petals"
        onPress={() => {
          tap('medium');
          setBurst((b) => b + 1);
        }}
        style={styles.treeWrap}
      >
        <TreeShadow />
        <Tree progress={p} />
        {burst > 0 ? <PetalBurst key={burst} burstKey={burst} /> : null}
        <View style={styles.tapHint}>
          <Icon name="tap" size={14} color={C.dim} />
          <Text style={styles.tapText}>tap to release petals</Text>
        </View>
      </Pressable>

      <Card style={{ borderRadius: 24, padding: 20, marginTop: 8 }}>
        <View style={styles.progressHead}>
          <Text style={styles.bloomed}>{Math.round(p * 100)}% bloomed</Text>
          <Pressable
            onPress={() => {
              tap();
              open({ name: 'goal' });
            }}
            style={styles.goalBtn}
          >
            <Text style={styles.goalText}>
              {money(S.currency, c.net)} / {money(S.currency, S.goal)}
            </Text>
            <Icon name="pencil" size={12} color={C.pinkDim} />
          </Pressable>
        </View>

        <View style={styles.track}>
          <LinearGradient
            colors={[C.fabTo, C.btnPrimaryFrom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${Number((p * 100).toFixed(1))}%`, height: '100%', borderRadius: 999 }}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <SerifNum style={[styles.statValue, { color: C.pink }]}>{money(S.currency, divs)}</SerifNum>
            <Text style={styles.statLabel}>dividends · 12 mo</Text>
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1 }}>
            <SerifNum style={[styles.statValue, { color: growthColor }]}>{growthTxt}</SerifNum>
            <Text style={styles.statLabel}>{growthLbl}</Text>
          </View>
        </View>
      </Card>

      <SectionTitle style={{ marginTop: 22, marginBottom: 12, marginHorizontal: 2 }}>Milestones</SectionTitle>
      <View style={{ gap: 10 }}>
        {marks.map((m, i) => {
          const reached = p >= m[0];
          const current = i === reachedIdx;
          const icon: IconName = current ? 'lotus' : reached ? 'check' : 'circleDashed';
          return (
            <View key={m[1]} style={[styles.mark, current && styles.markCurrent]}>
              {current ? (
                <LinearGradient
                  colors={[C.bloomCardFrom, C.bloomCardTo]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={[styles.markChip, reached && { backgroundColor: 'rgba(253,176,212,0.18)' }]}>
                <Icon name={icon} size={18} color={reached ? C.pinkSoft : C.dimmer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.markTitle}>{m[1]}</Text>
                <Text style={styles.markSub}>{current ? `You are here · ${Math.round(p * 100)}%` : m[2]}</Text>
              </View>
              <Text style={[styles.markAmount, { color: reached ? C.pinkSoft : C.dimmer }]}>
                {money(S.currency, S.goal * m[0])}
              </Text>
            </View>
          );
        })}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  stage: {
    color: C.pinkSoft,
    fontSize: 12,
    fontFamily: F.sansBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: { fontSize: 26, fontFamily: F.serifItalic, letterSpacing: 0, textAlign: 'center', marginTop: 2 },
  treeWrap: { height: 340, alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 },
  tapHint: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tapText: { color: C.dim, fontSize: 11, fontFamily: F.sansSemi },

  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  bloomed: { color: C.text, fontFamily: F.sansBold, fontSize: 15 },
  goalBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalText: { color: C.pinkDim, fontSize: 12.5, fontFamily: F.sansSemi, fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)', marginTop: 12, overflow: 'hidden' },
  statsRow: { flexDirection: 'row', gap: 18, marginTop: 18 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,.1)' },
  statValue: { fontSize: 24 },
  statLabel: { color: C.pinkDim, fontSize: 11.5, fontFamily: F.sansSemi, marginTop: 2 },

  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  markCurrent: { borderColor: 'rgba(253,176,212,0.4)', backgroundColor: 'transparent' },
  markChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  markTitle: { color: C.text, fontSize: 14, fontFamily: F.sansBold },
  markSub: { color: C.dim, fontSize: 12, fontFamily: F.sansMed },
  markAmount: { fontFamily: F.mono, fontSize: 13, fontVariant: ['tabular-nums'] },
});
