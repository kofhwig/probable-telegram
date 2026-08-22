import type { Holding, PricePoint } from '../domain/types';

export interface Quote {
  symbol: string;
  price: number;
  /** The exchange's previous close, when the provider reports one. */
  previousClose: number | null;
  /** Daily closes, oldest first. Empty when the provider only returns a spot price. */
  history: PricePoint[];
}

export interface QuoteProvider {
  id: string;
  /** Human-readable, shown in Settings. */
  label: string;
  /** True when the provider cannot be called without a key. */
  needsKey: boolean;
  getQuote(symbol: string, apiKey?: string): Promise<Quote>;
}

export class QuoteError extends Error {
  constructor(
    public symbol: string,
    message: string
  ) {
    super(message);
    this.name = 'QuoteError';
  }
}

/**
 * What to ask the provider for. Crypto tickers are quoted as pairs, so `BTC`
 * on its own would resolve to an unrelated equity; the user can override this
 * per holding in the edit sheet.
 */
export function quoteSymbolFor(h: Pick<Holding, 'sym' | 'sector' | 'quoteSymbol'>): string {
  if (h.quoteSymbol && h.quoteSymbol.trim()) return h.quoteSymbol.trim().toUpperCase();
  const s = h.sym.trim().toUpperCase();
  if (h.sector === 'Crypto' && !s.includes('-')) return s + '-USD';
  return s;
}

/**
 * How long to wait for a provider before giving up. React Native's `fetch` has
 * no timeout of its own: on a connection that accepts and then stalls, the
 * promise never settles, and the pull-to-refresh spinner turns forever.
 */
export const QUOTE_TIMEOUT_MS = 10000;

export interface QuoteResponse<T> {
  status: number;
  ok: boolean;
  /** Parsed body, present only when the request succeeded. */
  json: T | null;
}

/**
 * GETs JSON under one deadline — headers *and* body, since a response that
 * arrives and then stops streaming hangs just as badly — mapping every
 * transport failure onto a QuoteError the refresh loop knows how to report.
 */
export async function getQuoteJson<T>(
  url: string,
  symbol: string,
  timeoutMs = QUOTE_TIMEOUT_MS
): Promise<QuoteResponse<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) return { status: res.status, ok: false, json: null };
    let json: T;
    try {
      json = (await res.json()) as T;
    } catch {
      if (ctrl.signal.aborted) throw new QuoteError(symbol, 'Timed out — try again');
      throw new QuoteError(symbol, 'Unreadable response');
    }
    return { status: res.status, ok: true, json };
  } catch (e) {
    if (e instanceof QuoteError) throw e;
    const aborted = ctrl.signal.aborted || (e instanceof Error && e.name === 'AbortError');
    throw new QuoteError(symbol, aborted ? 'Timed out — try again' : 'No connection');
  } finally {
    clearTimeout(timer);
  }
}

/** Guards against a provider handing back a string, a zero, or a NaN. */
export function asFinite(n: unknown): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : (n as number);
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
}
