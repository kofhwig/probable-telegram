import { today } from '../domain/format';
import { pushPrice } from '../domain/model';
import type { Holding, Portfolio, PricePoint, QuoteProviderId } from '../domain/types';
import { finnhubProvider } from './finnhub';
import { quoteSymbolFor, type Quote, type QuoteProvider } from './provider';
import { yahooProvider } from './yahoo';

export const PROVIDERS: Record<QuoteProviderId, QuoteProvider> = {
  yahoo: yahooProvider,
  finnhub: finnhubProvider,
};

export interface RefreshFailure {
  sym: string;
  message: string;
}

export interface RefreshResult {
  updated: number;
  failures: RefreshFailure[];
}

/** Provider closes win on a shared date; local hand-entered points survive. */
export function mergeHistory(local: PricePoint[], incoming: PricePoint[]): PricePoint[] {
  const byDate = new Map<string, number>();
  local.forEach((p) => byDate.set(p.d, p.p));
  incoming.forEach((p) => byDate.set(p.d, p.p));
  const merged = Array.from(byDate, ([d, p]) => ({ d, p })).sort((a, b) => a.d.localeCompare(b.d));
  return merged.length > 800 ? merged.slice(-800) : merged;
}

/**
 * Writes a quote onto a holding in place. Today's change is measured against
 * the provider's previous close when it gives one, so refreshing twice in an
 * afternoon does not silently reset the day's move to zero.
 */
export function applyQuote(h: Holding, q: Quote): void {
  const priorMark = h.prev;
  const lastLocal = h.hist?.[h.hist.length - 1];

  if (q.previousClose != null) h.prev = q.previousClose;
  else if (lastLocal && lastLocal.d !== today()) h.prev = lastLocal.p;
  else if (priorMark == null) h.prev = h.price;

  h.price = q.price;
  h.updated = today();

  if (q.history.length) h.hist = mergeHistory(h.hist || [], q.history);
  else pushPrice(h, q.price);
}

/**
 * Refreshes every holding against the chosen provider. Failures are collected
 * rather than thrown: one dead ticker must not stop the other six, and a
 * holding that cannot be quoted keeps whatever price was typed in by hand.
 */
export async function refreshQuotes(S: Portfolio, apiKey?: string): Promise<RefreshResult> {
  const provider = PROVIDERS[S.settings.provider] || yahooProvider;
  if (!S.holdings.length) return { updated: 0, failures: [] };

  const results = await Promise.all(
    S.holdings.map(async (h) => {
      try {
        const q = await provider.getQuote(quoteSymbolFor(h), apiKey);
        return { h, q, error: null as string | null };
      } catch (e) {
        return { h, q: null, error: e instanceof Error ? e.message : 'Quote failed' };
      }
    })
  );

  let updated = 0;
  const failures: RefreshFailure[] = [];
  results.forEach(({ h, q, error }) => {
    if (q) {
      applyQuote(h, q);
      updated++;
    } else {
      failures.push({ sym: h.sym, message: error || 'Quote failed' });
    }
  });
  if (updated) S.settings.lastQuoteSync = new Date().toISOString();
  return { updated, failures };
}
