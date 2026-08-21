import { asFinite, QuoteError, type Quote, type QuoteProvider } from './provider';

const BASE = 'https://finnhub.io/api/v1/quote';

/** Finnhub's quote payload: `c` current, `pc` previous close. */
export interface FinnhubQuoteResponse {
  c?: number;
  pc?: number;
  d?: number;
  dp?: number;
  t?: number;
}

export function parseFinnhub(symbol: string, json: FinnhubQuoteResponse): Quote {
  const price = asFinite(json?.c);
  if (!price) throw new QuoteError(symbol, 'No price for ' + symbol);
  return {
    symbol,
    price,
    previousClose: asFinite(json?.pc),
    // The free quote endpoint returns a spot price only; the local `hist`
    // series keeps growing from each refresh instead.
    history: [],
  };
}

export const finnhubProvider: QuoteProvider = {
  id: 'finnhub',
  label: 'Finnhub (API key)',
  needsKey: true,
  async getQuote(symbol: string, apiKey?: string): Promise<Quote> {
    if (!apiKey) throw new QuoteError(symbol, 'Add a Finnhub API key in Settings');
    const url = `${BASE}?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch {
      throw new QuoteError(symbol, 'No connection');
    }
    if (res.status === 401 || res.status === 403) throw new QuoteError(symbol, 'API key rejected');
    if (res.status === 429) throw new QuoteError(symbol, 'Rate limited — try again shortly');
    if (!res.ok) throw new QuoteError(symbol, `Provider said ${res.status}`);
    return parseFinnhub(symbol, (await res.json()) as FinnhubQuoteResponse);
  },
};
