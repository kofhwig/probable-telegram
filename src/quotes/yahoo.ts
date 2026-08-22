import type { PricePoint } from '../domain/types';
import { asFinite, getQuoteJson, QuoteError, type Quote, type QuoteProvider } from './provider';

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

/** The slice of the chart response we actually read. */
export interface YahooChartResponse {
  chart?: {
    result?: {
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[] | null;
    error?: { description?: string } | null;
  };
}

/**
 * Pulled out of the network call so it can be tested against recorded
 * responses — the sandbox this was written in cannot reach Yahoo.
 */
export function parseYahoo(symbol: string, json: YahooChartResponse): Quote {
  const err = json?.chart?.error;
  if (err) throw new QuoteError(symbol, err.description || 'Quote provider returned an error');

  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  const price = asFinite(meta?.regularMarketPrice);
  if (!price) throw new QuoteError(symbol, 'No price for ' + symbol);

  const previousClose = asFinite(meta?.chartPreviousClose) ?? asFinite(meta?.previousClose);

  const stamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const history: PricePoint[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const p = asFinite(closes[i]);
    if (!p) continue; // holidays and halted sessions come back as null
    history.push({ d: new Date(stamps[i] * 1000).toISOString().slice(0, 10), p: +p.toFixed(4) });
  }

  return { symbol: meta?.symbol || symbol, price, previousClose, history };
}

/**
 * Yahoo's chart endpoint needs no API key and covers equities, ETFs, indices
 * and crypto pairs. It is not a documented public API, so treat a failure as
 * ordinary and keep the hand-entered price.
 */
export const yahooProvider: QuoteProvider = {
  id: 'yahoo',
  label: 'Yahoo Finance (no key needed)',
  needsKey: false,
  async getQuote(symbol: string): Promise<Quote> {
    const url = `${BASE}${encodeURIComponent(symbol)}?range=6mo&interval=1d`;
    const res = await getQuoteJson<YahooChartResponse>(url, symbol);
    if (!res.ok) throw new QuoteError(symbol, `Provider said ${res.status}`);
    return parseYahoo(symbol, res.json as YahooChartResponse);
  },
};
