import { PALETTE } from '../theme/tokens';
import { comp } from './compute';
import { today, uid } from './format';
import type {
  Holding,
  HistoryPoint,
  Portfolio,
  PricePoint,
  QuoteProviderId,
  Tx,
  TxType,
} from './types';

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

/** Caps on the stored series, so a hostile or corrupt file cannot grow without bound. */
export const MAX_HIST = 800;
export const MAX_TX = 500;
export const MAX_HISTORY = 1500;
export const MAX_HOLDINGS = 500;

const TX_TYPES: TxType[] = ['buy', 'sell', 'dividend', 'deposit', 'withdraw', 'price'];
/** What a holding gets when it arrives without a usable colour: the first swatch. */
const DEFAULT_COLOR = PALETTE[0][1];
const PROVIDER_IDS: QuoteProviderId[] = ['yahoo', 'finnhub'];

/** A finite number, or the fallback. Strings are accepted — the prototype wrote some. */
function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/** `YYYY-MM-DD`, or the fallback — anything else breaks every date label downstream. */
function dateStr(v: unknown, fallback: string): string {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function pricePoints(v: unknown): PricePoint[] {
  return arr(v)
    .filter(isObj)
    .map((p) => ({ d: dateStr(p.d, ''), p: num(p.p) }))
    .filter((p) => p.d !== '')
    .slice(-MAX_HIST);
}

function historyPoints(v: unknown): HistoryPoint[] {
  return arr(v)
    .filter(isObj)
    .map((p) => ({ d: dateStr(p.d, ''), v: num(p.v) }))
    .filter((p) => p.d !== '')
    .slice(-MAX_HISTORY);
}

/**
 * Every field is coerced to the type the screens assume. A price that arrives as
 * a string, a holding with no symbol or a `hist` full of nulls used to reach the
 * renderer untouched and crash it — and because the import is persisted before
 * anything draws, that crash came back on every launch.
 */
function holding(v: unknown): Holding {
  const h = isObj(v) ? v : {};
  const price = num(h.price);
  const quoteSymbol = str(h.quoteSymbol).trim();
  return {
    id: str(h.id) || uid(),
    sym: str(h.sym).trim() || '?',
    name: str(h.name) || str(h.sym).trim() || '?',
    shares: num(h.shares),
    avg: num(h.avg, price),
    price,
    prev: h.prev == null ? null : num(h.prev, price),
    sector: str(h.sector).trim() || 'Other',
    color: str(h.color).trim() || DEFAULT_COLOR,
    about: str(h.about),
    updated: dateStr(h.updated, ''),
    hist: pricePoints(h.hist),
    ...(quoteSymbol ? { quoteSymbol } : {}),
  };
}

function tx(v: unknown): Tx {
  const t = isObj(v) ? v : {};
  const type = str(t.type) as TxType;
  return {
    id: str(t.id) || uid(),
    type: TX_TYPES.includes(type) ? type : 'price',
    sym: str(t.sym),
    note: str(t.note),
    amount: num(t.amount),
    date: dateStr(t.date, today()),
  };
}

/**
 * Merges anything loaded from disk or pasted in as an export onto a blank
 * portfolio, so files written by the original HTML version — which had no
 * `settings` and no `quoteSymbol` — still open. Nothing is trusted: the input
 * is whatever was in AsyncStorage or in a file someone was handed, and only the
 * fields below survive, each one coerced to its declared type.
 */
export function hydrate(raw: unknown): Portfolio {
  const o = isObj(raw) ? raw : {};
  const base = blank();
  const s = isObj(o.settings) ? o.settings : {};
  const provider = str(s.provider) as QuoteProviderId;

  return {
    v: num(o.v, base.v),
    name: str(o.name),
    currency: str(o.currency, base.currency),
    goal: num(o.goal, base.goal),
    cash: num(o.cash),
    realized: num(o.realized),
    holdings: arr(o.holdings).slice(0, MAX_HOLDINGS).map(holding),
    tx: arr(o.tx).slice(0, MAX_TX).map(tx),
    history: historyPoints(o.history),
    created: dateStr(o.created, base.created),
    onboarded: o.onboarded === true,
    settings: {
      liveQuotes: s.liveQuotes !== false,
      provider: PROVIDER_IDS.includes(provider) ? provider : base.settings.provider,
      ...(typeof s.lastQuoteSync === 'string' ? { lastQuoteSync: s.lastQuoteSync } : {}),
    },
  };
}

/** One value point per day, overwriting today's as it moves. */
export function snapshot(S: Portfolio): void {
  const n = comp(S).net;
  const d = today();
  const last = S.history[S.history.length - 1];
  if (last && last.d === d) last.v = n;
  else S.history.push({ d, v: n });
  if (S.history.length > MAX_HISTORY) S.history = S.history.slice(-MAX_HISTORY);
}

export function logTx(S: Portfolio, o: Partial<Tx> & { type: Tx['type']; amount: number }): void {
  S.tx.unshift({ id: uid(), date: today(), sym: '', note: '', ...o });
  if (S.tx.length > MAX_TX) S.tx.length = MAX_TX;
}

export function pushPrice(h: Holding, p: number, date = today()): void {
  h.hist = h.hist || [];
  const last = h.hist[h.hist.length - 1];
  if (last && last.d === date) last.p = p;
  else h.hist.push({ d: date, p });
  if (h.hist.length > MAX_HIST) h.hist = h.hist.slice(-MAX_HIST);
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
