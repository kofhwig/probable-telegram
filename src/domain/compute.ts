import { SECTOR_COLOR } from '../theme/tokens';
import { daysAgo, money, pct, signed, today } from './format';
import type {
  Alert,
  Computed,
  ComputedHolding,
  Portfolio,
  SectorRow,
} from './types';

/**
 * Every number on screen comes from here. Ported verbatim from the prototype's
 * `comp()` so the app and the original agree to the cent.
 */
export function comp(S: Portfolio): Computed {
  const hs: ComputedHolding[] = S.holdings.map((h) => {
    const value = h.shares * h.price;
    const cost = h.shares * h.avg;
    const prev = h.prev == null ? h.price : h.prev;
    return {
      ...h,
      value,
      cost,
      pl: value - cost,
      plPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      dayAbs: h.shares * (h.price - prev),
      dayPct: prev > 0 ? ((h.price - prev) / prev) * 100 : 0,
      weight: 0,
    };
  });
  const invested = hs.reduce((s, h) => s + h.value, 0);
  const net = invested + S.cash;
  hs.forEach((h) => {
    h.weight = net > 0 ? (h.value / net) * 100 : 0;
  });
  const dayAbs = hs.reduce((s, h) => s + h.dayAbs, 0);
  const prevNet = net - dayAbs;
  const unreal = hs.reduce((s, h) => s + h.pl, 0);
  return {
    hs,
    invested,
    net,
    dayAbs,
    dayPct: prevNet > 0 ? (dayAbs / prevNet) * 100 : 0,
    unreal,
    total: unreal + (S.realized || 0),
    cashWeight: net > 0 ? (S.cash / net) * 100 : 0,
    progress: S.goal > 0 ? Math.min(1, net / S.goal) : 0,
  };
}

export function sectorRows(S: Portfolio, c: Computed): SectorRow[] {
  const m: Record<string, number> = {};
  c.hs.forEach((h) => {
    m[h.sector] = (m[h.sector] || 0) + h.value;
  });
  if (S.cash > 0) m['Cash'] = (m['Cash'] || 0) + S.cash;
  return Object.keys(m)
    .sort((a, b) => m[b] - m[a])
    .map((k) => ({
      label: k,
      value: m[k],
      pct: c.net > 0 ? (m[k] / c.net) * 100 : 0,
      color: SECTOR_COLOR[k] || SECTOR_COLOR.Other,
    }));
}

/**
 * Herfindahl spread across positions and sectors, marked down when one name or
 * one sector dominates. Same weights and penalty curve as the prototype.
 */
export function diversification(S: Portfolio, c: Computed): { score: number; label: string } {
  const parts = c.hs.map((h) => h.weight / 100).filter((w) => w > 0);
  if (S.cash > 0 && c.net > 0) parts.push(S.cash / c.net);
  const n = parts.length;
  if (n < 2) return { score: n === 1 ? 8 : 0, label: n === 1 ? 'Single position' : 'Nothing planted' };
  const hhi = parts.reduce((s, w) => s + w * w, 0);
  const even = 1 / n;
  const assetScore = Math.max(0, Math.min(1, 1 - (hhi - even) / (1 - even)));
  const secs = sectorRows(S, c).map((s) => s.pct / 100);
  const sHhi = secs.reduce((s, w) => s + w * w, 0);
  const sEven = 1 / Math.max(secs.length, 1);
  const secScore =
    secs.length < 2 ? 0 : Math.max(0, Math.min(1, 1 - (sHhi - sEven) / (1 - sEven)));
  const breadth = Math.min(1, n / 10);
  const topAsset = Math.max.apply(null, parts);
  const topSec = secs.length ? Math.max.apply(null, secs) : 1;
  const penalty = 1 - Math.max(0, topSec - 0.35) * 0.8 - Math.max(0, topAsset - 0.25) * 0.8;
  const score = Math.round(
    (assetScore * 0.45 + secScore * 0.35 + breadth * 0.2) * Math.max(0.25, penalty) * 100
  );
  const label =
    score >= 80
      ? 'Healthy spread'
      : score >= 55
        ? 'Leaning heavy'
        : score >= 30
          ? 'Concentrated'
          : 'Very concentrated';
  return { score, label };
}

export function rangeSeries(S: Portfolio, days: number) {
  const h = S.history;
  if (!h.length) return [];
  if (!days) return h.slice();
  const cut = Date.parse(today()) - days * 86400000;
  const out = h.filter((p) => Date.parse(p.d) >= cut);
  return out.length >= 2 ? out : h.slice(-2);
}

export interface Path {
  line: string;
  area: string;
  up: boolean;
  pts: { x: number; y: number }[];
}

/** SVG path builder, unchanged from the prototype. */
export function makePath(vals: number[], w: number, hgt: number, pad = 5): Path {
  const n = vals.length;
  if (n === 0) return { line: '', area: '', up: true, pts: [] };
  const min = Math.min.apply(null, vals);
  const max = Math.max.apply(null, vals);
  const span = max - min || Math.max(1, Math.abs(max) * 0.02);
  const sx = n > 1 ? w / (n - 1) : 0;
  const pts = vals.map((v, i) => ({
    x: n > 1 ? i * sx : w / 2,
    y: pad + (hgt - 2 * pad) * (1 - (v - min) / span),
  }));
  const line = 'M' + pts.map((p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L');
  return { line, area: line + ' L' + w + ' ' + hgt + ' L0 ' + hgt + ' Z', up: vals[n - 1] >= vals[0], pts };
}

/** The bell-icon feed. Same thresholds as the prototype. */
export function alerts(S: Portfolio): Alert[] {
  const c = comp(S);
  const out: Alert[] = [];
  const cur = S.currency;
  c.hs.forEach((h) => {
    if (Math.abs(h.dayPct) >= 3)
      out.push({
        icon: h.dayPct > 0 ? 'trendUp' : 'trendDown',
        tone: h.dayPct > 0 ? 'up' : 'down',
        title: h.sym + ' moved ' + pct(h.dayPct),
        body: signed(cur, h.dayAbs) + ' since the previous close you recorded.',
      });
  });
  const big = c.hs.slice().sort((a, b) => b.weight - a.weight)[0];
  if (big && big.weight > 35)
    out.push({
      icon: 'info',
      tone: '',
      title: big.sym + ' is ' + big.weight.toFixed(0) + '% of the portfolio',
      body: 'One branch is carrying most of the tree.',
    });
  if (c.cashWeight > 20 && S.cash > 0)
    out.push({
      icon: 'wallet',
      tone: '',
      title: 'Cash is ' + c.cashWeight.toFixed(0) + '% of net worth',
      body: money(cur, S.cash) + ' is sitting idle.',
    });
  const stale = c.hs.filter((h) => h.updated && daysAgo(h.updated) >= 7);
  if (stale.length)
    out.push({
      icon: 'refresh',
      tone: '',
      title: stale.length + ' price' + (stale.length > 1 ? 's are' : ' is') + ' over a week old',
      body: 'Update them to keep your net worth honest.',
    });
  if (c.progress >= 1)
    out.push({
      icon: 'lotus',
      tone: 'up',
      title: 'Full bloom',
      body: 'You crossed your ' + money(cur, S.goal) + ' goal.',
    });
  return out;
}
