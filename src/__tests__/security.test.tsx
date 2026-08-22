import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORE_KEY } from '../domain/constants';
import { hydrate, MAX_HIST } from '../domain/model';
import { finnhubProvider } from '../quotes/finnhub';
import { applyQuote } from '../quotes/refresh';
import { parseYahoo } from '../quotes/yahoo';
import { yahooProvider } from '../quotes/yahoo';
import { PortfolioProvider, usePortfolio } from '../store/PortfolioContext';
import type { Holding } from '../domain/types';

const API_KEY = 'fnh-SECRETKEY-9f3a';

jest.mock('../components/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => 'fnh-SECRETKEY-9f3a'),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

type Api = ReturnType<typeof usePortfolio>;

function quoteAnswers() {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: string) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        c: 10,
        pc: 9,
        chart: { result: [{ meta: { regularMarketPrice: 10, chartPreviousClose: 9 } }] },
      }),
    };
  }) as unknown as typeof fetch;
  return calls;
}

async function setup() {
  const ref: { current: Api | null } = { current: null };
  function Probe() {
    ref.current = usePortfolio();
    return null;
  }
  render(
    <PortfolioProvider>
      <Probe />
    </PortfolioProvider>
  );
  await waitFor(() => expect(ref.current?.ready).toBe(true));
  const api = () => ref.current as Api;
  await act(async () => {
    api().start('sample', 'Mara', 'USD');
    jest.advanceTimersByTime(300);
  });
  return api;
}

beforeEach(() => {
  AsyncStorage.clear();
  (SecureStore.getItemAsync as jest.Mock).mockClear();
  quoteAnswers();
});

/**
 * 1. The Finnhub key is a credential. It belongs in the keychain and in the
 *    request to Finnhub — nowhere else, and above all not in the export people
 *    are told to "share somewhere safe", nor in the portfolio on disk.
 */
describe('the API key', () => {
  it('reaches Finnhub but never the export or the stored portfolio', async () => {
    const api = await setup();
    const calls = quoteAnswers();

    await act(async () => {
      api().saveSettings({ provider: 'finnhub' });
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      await api().refresh({ silent: true });
      jest.advanceTimersByTime(400);
    });

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((u) => u.includes(`token=${encodeURIComponent(API_KEY)}`))).toBe(true);

    expect(api().exportJSON()).not.toContain('SECRETKEY');
    expect(JSON.stringify(api().S)).not.toContain('SECRETKEY');
    const stored = (await AsyncStorage.getItem(STORE_KEY)) ?? '';
    expect(stored).not.toContain('SECRETKEY');
    expect(stored.length).toBeGreaterThan(0);
  });

  it('is never sent to a provider that did not ask for one', async () => {
    const api = await setup();
    const calls = quoteAnswers();

    await act(async () => {
      api().saveSettings({ provider: 'yahoo' });
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      await api().refresh({ silent: true });
      jest.advanceTimersByTime(400);
    });

    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((u) => {
      expect(u).toContain('query1.finance.yahoo.com');
      expect(u).not.toContain('SECRETKEY');
      expect(u).not.toContain('token=');
    });
  });
});

/**
 * 2. An export is a file that arrives from outside — a chat message, a download,
 *    a backup someone edited. `JSON.parse` keeps `__proto__` as a plain key, and
 *    a merge that assigns keys one by one can turn it back into a prototype
 *    write, poisoning every object in the process.
 */
describe('an import carrying prototype keys', () => {
  const payloads = [
    '{"__proto__":{"polluted":"yes"},"holdings":[]}',
    '{"constructor":{"prototype":{"polluted":"yes"}},"holdings":[]}',
    '{"holdings":[{"sym":"X","__proto__":{"polluted":"yes"}}]}',
    '{"holdings":[],"settings":{"__proto__":{"polluted":"yes"}}}',
  ];

  it.each(payloads)('leaves Object.prototype alone: %s', (raw) => {
    const before = Object.keys(Object.prototype).length;

    const p = hydrate(JSON.parse(raw));

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Object.keys(Object.prototype).length).toBe(before);
    expect(Object.getPrototypeOf(p)).toBe(Object.prototype);
    p.holdings.forEach((h) => expect(Object.getPrototypeOf(h)).toBe(Object.prototype));
    expect(p).not.toHaveProperty('polluted');
  });

  it('survives the whole import path, storage included', async () => {
    const api = await setup();

    await act(async () => {
      expect(api().importJSON(payloads[0])).toBe(true);
      jest.advanceTimersByTime(400);
    });

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(api().exportJSON()).not.toContain('polluted');
  });
});

/**
 * 3. Anything that is not a portfolio has to be refused, and anything that is
 *    one has to arrive with the types the screens assume — the import is written
 *    to disk before it is drawn, so a file that breaks a screen breaks every
 *    launch after it.
 */
describe('an import that is not a portfolio', () => {
  it.each([
    ['plain text', 'hello'],
    ['a JSON array', '[1,2,3]'],
    ['a JSON string', '"holdings"'],
    ['a number', '12'],
    ['null', 'null'],
    ['an object without holdings', '{"cash":100}'],
    ['holdings that are not a list', '{"holdings":{"0":{"sym":"X"}}}'],
    ['truncated JSON', '{"holdings":[{"sym":"X"'],
  ])('is refused: %s', async (_label, raw) => {
    const api = await setup();
    const before = api().exportJSON();

    let accepted = true;
    await act(async () => {
      accepted = api().importJSON(raw);
      jest.advanceTimersByTime(400);
    });

    expect(accepted).toBe(false);
    expect(api().exportJSON()).toBe(before);
  });

  it('normalises a hostile-but-parseable file before it reaches disk', async () => {
    const api = await setup();
    const hostile = JSON.stringify({
      holdings: [{ sym: 'X', price: '9e99999', shares: 'lots', hist: [{ d: 'whenever', p: 'high' }] }],
      cash: { nested: 'object' },
      settings: { provider: '../../etc/passwd', liveQuotes: 'sure' },
      tx: 'not a list',
      evil: 'payload',
    });

    await act(async () => {
      expect(api().importJSON(hostile)).toBe(true);
      jest.advanceTimersByTime(400);
    });

    const stored = JSON.parse((await AsyncStorage.getItem(STORE_KEY)) as string);
    expect(stored).not.toHaveProperty('evil');
    expect(stored.cash).toBe(0);
    expect(stored.tx).toEqual([]);
    expect(stored.settings.provider).toBe('yahoo');
    expect(isFinite(stored.holdings[0].price)).toBe(true);
    expect(isFinite(stored.holdings[0].shares)).toBe(true);
    expect(stored.holdings[0].hist).toEqual([]);
    expect(isFinite(api().c.net)).toBe(true);
  });
});

/**
 * 4. The quote symbol is free text on the edit sheet, and it is pasted straight
 *    into a URL. Unencoded it could add query parameters of its own — a second
 *    `token`, a different endpoint — or walk out of the API path entirely.
 */
describe('a hostile quote symbol', () => {
  const hostile = [
    'AAPL&token=stolen',
    'AAPL#fragment',
    '../../v7/finance/quote?symbols=AAPL',
    'AAPL?token=stolen&x=1',
    'AAPL /../..',
  ];

  it.each(hostile)('cannot forge a Finnhub request: %s', async (symbol) => {
    const calls = quoteAnswers();
    await finnhubProvider.getQuote(symbol, API_KEY);

    const url = new URL(calls[0]);
    expect(url.origin + url.pathname).toBe('https://finnhub.io/api/v1/quote');
    expect(url.searchParams.getAll('token')).toEqual([API_KEY]);
    expect(url.searchParams.get('symbol')).toBe(symbol);
    expect(url.searchParams.getAll('symbols')).toEqual([]);
  });

  it.each(hostile)('cannot leave the Yahoo chart endpoint: %s', async (symbol) => {
    const calls = quoteAnswers();
    await yahooProvider.getQuote(symbol);

    const url = new URL(calls[0]);
    expect(url.origin).toBe('https://query1.finance.yahoo.com');
    expect(url.pathname.startsWith('/v8/finance/chart/')).toBe(true);
    expect(decodeURIComponent(url.pathname.slice('/v8/finance/chart/'.length))).toBe(symbol);
    expect([...url.searchParams.keys()].sort()).toEqual(['interval', 'range']);
  });
});

/**
 * 5. The quote providers are third parties — one of them an undocumented
 *    endpoint. Their answers are input like any other: a price of "1e999", a
 *    NaN, a negative number or a hundred thousand history points must not reach
 *    the portfolio.
 */
describe('a hostile provider response', () => {
  it.each([
    ['a string that is not a number', 'free money'],
    ['infinity', 1e999],
    ['zero', 0],
    ['a negative price', -42],
    ['null', null],
    ['an object', { toString: 'nope' }],
  ])('is refused rather than stored: %s', (_label, price) => {
    expect(() =>
      parseYahoo('NVDA', { chart: { result: [{ meta: { regularMarketPrice: price as number } }] } })
    ).toThrow(/No price/);
  });

  it('cannot grow a holding without bound or add fields of its own', () => {
    const h: Holding = {
      id: 'h1',
      sym: 'NVDA',
      name: 'NVIDIA',
      shares: 10,
      avg: 100,
      price: 150,
      prev: 148,
      sector: 'Technology',
      color: '#fff',
      about: '',
      updated: '2026-03-16',
      hist: [{ d: '2026-03-16', p: 149 }],
    };
    const before = Object.keys(h).sort();

    const history = Array.from({ length: MAX_HIST * 4 }, (_, i) => ({
      d: new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10),
      p: i + 1,
    }));
    applyQuote(h, {
      symbol: 'NVDA',
      price: 172.32,
      previousClose: 167.56,
      history,
      // a provider that returns more than the contract promises
      ...({ id: 'other', shares: 999999, evil: 'payload' } as object),
    });

    expect(Object.keys(h).sort()).toEqual(before);
    expect(h.shares).toBe(10);
    expect(h.id).toBe('h1');
    expect(h.hist).toHaveLength(MAX_HIST);
    h.hist.forEach((p) => expect(isFinite(p.p)).toBe(true));
  });

  it('does not let a bad payload crash the parse', () => {
    expect(() => parseYahoo('NVDA', {})).toThrow(/No price/);
    expect(() => parseYahoo('NVDA', { chart: { result: null } })).toThrow(/No price/);
    expect(() =>
      parseYahoo('NVDA', { chart: { error: { description: 'Not Found' } } })
    ).toThrow('Not Found');
    expect(
      parseYahoo('NVDA', {
        chart: {
          result: [
            {
              meta: { regularMarketPrice: 10 },
              timestamp: [1710633600, 1710720000],
              indicators: { quote: [{ close: [null, 11] }] },
            },
          ],
        },
      }).history
    ).toEqual([{ d: '2024-03-18', p: 11 }]);
  });
});
