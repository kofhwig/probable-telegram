import { comp } from './compute';
import { today, uid } from './format';
import type { Holding, Portfolio, Tx } from './types';

export function blank(): Portfolio {
  return {
    v: 1,
    name: '',
    currency: 'USD',
    goal: 100000,
    cash: 0,
    realized: 0,
    holdings: [],
    tx: [],
    history: [],
    created: today(),
    settings: { liveQuotes: true, provider: 'yahoo' },
  };
}

/**
 * Merges anything loaded from disk or pasted in as an export onto a blank
 * portfolio, so files written by the original HTML version — which had no
 * `settings` and no `quoteSymbol` — still open.
 */
export function hydrate(raw: unknown): Portfolio {
  const o = (raw || {}) as Partial<Portfolio>;
  const base = blank();
  const p: Portfolio = { ...base, ...o, settings: { ...base.settings, ...(o.settings || {}) } };
  p.holdings = (p.holdings || []).map((h) => ({ ...h, hist: h.hist || [] }));
  p.tx = p.tx || [];
  p.history = p.history || [];
  p.realized = p.realized || 0;
  return p;
}

/** One value point per day, overwriting today's as it moves. */
export function snapshot(S: Portfolio): void {
  const n = comp(S).net;
  const d = today();
  const last = S.history[S.history.length - 1];
  if (last && last.d === d) last.v = n;
  else S.history.push({ d, v: n });
  if (S.history.length > 1500) S.history = S.history.slice(-1500);
}

export function logTx(S: Portfolio, o: Partial<Tx> & { type: Tx['type']; amount: number }): void {
  S.tx.unshift({ id: uid(), date: today(), sym: '', note: '', ...o });
  if (S.tx.length > 500) S.tx.length = 500;
}

export function pushPrice(h: Holding, p: number, date = today()): void {
  h.hist = h.hist || [];
  const last = h.hist[h.hist.length - 1];
  if (last && last.d === date) last.p = p;
  else h.hist.push({ d: date, p });
  if (h.hist.length > 800) h.hist = h.hist.slice(-800);
}

/** Buy: weighted average cost absorbs the fee, cash pays for it. */
export function applyBuy(S: Portfolio, h: Holding, q: number, p: number, fee: number): void {
  const gross = q * p;
  h.avg = (h.shares * h.avg + gross + fee) / (h.shares + q);
  h.shares += q;
  S.cash -= gross + fee;
}

/** Sell: the difference against average cost becomes realised P/L. */
export function applySell(S: Portfolio, h: Holding, q: number, p: number, fee: number): void {
  const gross = q * p;
  S.realized = (S.realized || 0) + q * (p - h.avg) - fee;
  h.shares -= q;
  S.cash += gross - fee;
}

/** A position sold down to nothing leaves the book. */
export function isClosed(h: Holding): boolean {
  return h.shares <= 1e-9;
}
