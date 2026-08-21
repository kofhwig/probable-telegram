import { today } from '../../domain/format';
import type { Holding } from '../../domain/types';
import finnhubAapl from '../__fixtures__/finnhub-aapl.json';
import yahooNvda from '../__fixtures__/yahoo-nvda.json';
import yahooUnknown from '../__fixtures__/yahoo-unknown.json';
import { parseFinnhub } from '../finnhub';
import { QuoteError, quoteSymbolFor } from '../provider';
import { applyQuote, mergeHistory } from '../refresh';
import { parseYahoo, type YahooChartResponse } from '../yahoo';

function holding(over: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    sym: 'NVDA',
    name: 'NVIDIA Corp',
    shares: 10,
    avg: 100,
    price: 150,
    prev: 148,
    sector: 'Technology',
    color: '#fff',
    about: '',
    updated: '2026-03-10',
    hist: [],
    ...over,
  };
}

describe('parseYahoo', () => {
  const q = parseYahoo('NVDA', yahooNvda as YahooChartResponse);

  it('reads the spot price and previous close', () => {
    expect(q.price).toBe(172.32);
    expect(q.previousClose).toBe(167.56);
    expect(q.symbol).toBe('NVDA');
  });

  it('builds daily history and drops the null sessions', () => {
    expect(q.history).toHaveLength(4);
    expect(q.history[0]).toEqual({ d: '2026-03-10', p: 165.11 });
    expect(q.history.some((p) => p.p == null)).toBe(false);
  });

  it('throws a QuoteError for an unknown symbol', () => {
    expect(() => parseYahoo('ZZZZ', yahooUnknown as YahooChartResponse)).toThrow(QuoteError);
  });

  it('throws rather than writing a zero price', () => {
    const empty = { chart: { result: [{ meta: { regularMarketPrice: 0 } }] } };
    expect(() => parseYahoo('AAA', empty as YahooChartResponse)).toThrow(/No price/);
  });
});

describe('parseFinnhub', () => {
  it('reads current and previous close, with no history', () => {
    const q = parseFinnhub('AAPL', finnhubAapl);
    expect(q.price).toBe(210.2);
    expect(q.previousClose).toBe(208.28);
    expect(q.history).toEqual([]);
  });

  it('rejects the empty payload Finnhub returns for a bad symbol', () => {
    expect(() => parseFinnhub('ZZZZ', { c: 0, pc: 0 })).toThrow(QuoteError);
  });
});

describe('quoteSymbolFor', () => {
  it('passes equities through unchanged', () => {
    expect(quoteSymbolFor({ sym: 'nvda', sector: 'Technology' })).toBe('NVDA');
  });

  it('turns a bare crypto ticker into a USD pair', () => {
    expect(quoteSymbolFor({ sym: 'BTC', sector: 'Crypto' })).toBe('BTC-USD');
  });

  it('leaves a crypto pair alone', () => {
    expect(quoteSymbolFor({ sym: 'ETH-EUR', sector: 'Crypto' })).toBe('ETH-EUR');
  });

  it('prefers an explicit override', () => {
    expect(quoteSymbolFor({ sym: 'VOD', sector: 'Technology', quoteSymbol: 'vod.l' })).toBe('VOD.L');
  });
});

describe('mergeHistory', () => {
  it('lets provider closes win on a shared date and keeps local-only points', () => {
    const merged = mergeHistory(
      [
        { d: '2026-03-10', p: 1 },
        { d: '2026-03-11', p: 2 },
      ],
      [
        { d: '2026-03-11', p: 22 },
        { d: '2026-03-12', p: 3 },
      ]
    );
    expect(merged).toEqual([
      { d: '2026-03-10', p: 1 },
      { d: '2026-03-11', p: 22 },
      { d: '2026-03-12', p: 3 },
    ]);
  });

  it('caps the series at 800 points', () => {
    const long = Array.from({ length: 900 }, (_, i) => ({ d: `2026-01-${i}`, p: i }));
    expect(mergeHistory(long, []).length).toBe(800);
  });
});

describe('applyQuote', () => {
  it('takes the provider’s previous close, so the day move survives a second refresh', () => {
    const h = holding({ price: 150, prev: 148 });
    applyQuote(h, { symbol: 'NVDA', price: 172.32, previousClose: 167.56, history: [] });
    expect(h.price).toBe(172.32);
    expect(h.prev).toBe(167.56);

    // refreshing again mid-session must not reset the day's move to zero
    applyQuote(h, { symbol: 'NVDA', price: 173.5, previousClose: 167.56, history: [] });
    expect(h.prev).toBe(167.56);
  });

  it('falls back to the last recorded close when the provider gives none', () => {
    const h = holding({ price: 150, prev: 148, hist: [{ d: '2026-03-16', p: 150 }] });
    applyQuote(h, { symbol: 'NVDA', price: 155, previousClose: null, history: [] });
    expect(h.prev).toBe(150);
  });

  it('stamps the update date and records the price', () => {
    const h = holding({ hist: [] });
    applyQuote(h, { symbol: 'NVDA', price: 155, previousClose: 150, history: [] });
    expect(h.updated).toBe(today());
    expect(h.hist[h.hist.length - 1]).toEqual({ d: today(), p: 155 });
  });

  it('merges a provider history rather than appending a lone point', () => {
    const h = holding({ hist: [{ d: '2026-03-01', p: 100 }] });
    applyQuote(h, {
      symbol: 'NVDA',
      price: 172.32,
      previousClose: 167.56,
      history: [
        { d: '2026-03-16', p: 169.02 },
        { d: '2026-03-17', p: 172.32 },
      ],
    });
    expect(h.hist).toHaveLength(3);
    expect(h.hist[0].d).toBe('2026-03-01');
  });
});
