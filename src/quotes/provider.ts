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

/** Guards against a provider handing back a string, a zero, or a NaN. */
export function asFinite(n: unknown): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : (n as number);
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : null;
}
