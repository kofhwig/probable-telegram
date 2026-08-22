import { MAX_HIST, MAX_HISTORY, MAX_HOLDINGS, MAX_TX, blank, hydrate } from '../model';
import { comp } from '../compute';
import type { Holding } from '../types';

/**
 * `hydrate` is the only door into the app for data nobody wrote here: whatever
 * was in AsyncStorage, and whatever file someone was handed as an export. It is
 * the layer that has to make the screens' assumptions true — a holding whose
 * `price` is a string reached the renderer and threw `price.toFixed is not a
 * function`, and because the import is persisted before anything draws, that
 * throw came back on every launch.
 */
describe('hydrate', () => {
  it('keeps a well-formed portfolio intact', () => {
    const source = {
      ...blank(),
      name: 'Mara',
      cash: 1200.5,
      holdings: [
        {
          id: 'h1',
          sym: 'NVDA',
          name: 'NVIDIA Corp',
          shares: 10,
          avg: 100,
          price: 150,
          prev: 148,
          sector: 'Technology',
          color: '#fff',
          about: 'notes',
          updated: '2026-03-17',
          hist: [{ d: '2026-03-16', p: 149 }],
          quoteSymbol: 'NVDA',
        },
      ],
      onboarded: true,
    };
    expect(hydrate(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it('coerces numbers that arrived as strings', () => {
    const p = hydrate({
      cash: '1200.5',
      goal: '50000',
      realized: '12',
      holdings: [{ id: 'h1', sym: 'NVDA', shares: '10', avg: '100', price: '150', prev: '148' }],
    });
    expect(p.cash).toBe(1200.5);
    expect(p.goal).toBe(50000);
    expect(p.realized).toBe(12);
    expect(p.holdings[0]).toMatchObject({ shares: 10, avg: 100, price: 150, prev: 148 });
  });

  it.each([
    ['a string', 'not a portfolio'],
    ['a number', 42],
    ['null', null],
    ['an array', [1, 2, 3]],
    ['nothing', undefined],
  ])('falls back to a blank portfolio when handed %s', (_label, raw) => {
    const p = hydrate(raw);
    expect(p.holdings).toEqual([]);
    expect(p.cash).toBe(0);
    expect(p.settings.provider).toBe('yahoo');
  });

  it('gives every holding the shape the screens assume', () => {
    const p = hydrate({
      holdings: [
        {},
        null,
        'junk',
        { sym: 'ok', price: NaN, shares: Infinity, avg: 'abc', prev: 'abc', hist: 'not an array' },
        { sym: 'X', hist: [null, { d: 'nope', p: 1 }, { d: '2026-03-16', p: '12.5' }] },
      ],
    });

    p.holdings.forEach((h: Holding) => {
      expect(typeof h.id).toBe('string');
      expect(h.id.length).toBeGreaterThan(0);
      expect(typeof h.sym).toBe('string');
      expect(typeof h.name).toBe('string');
      expect(typeof h.color).toBe('string');
      expect(typeof h.sector).toBe('string');
      expect(typeof h.about).toBe('string');
      [h.shares, h.avg, h.price].forEach((n) => expect(isFinite(n)).toBe(true));
      expect(h.prev === null || isFinite(h.prev)).toBe(true);
      expect(Array.isArray(h.hist)).toBe(true);
      h.hist.forEach((pt) => {
        expect(pt.d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(isFinite(pt.p)).toBe(true);
      });
      // the two calls that used to throw on a malformed file
      expect(() => h.price.toFixed(2)).not.toThrow();
      expect(() => h.sym.slice(0, 4)).not.toThrow();
    });

    expect(p.holdings[4].hist).toEqual([{ d: '2026-03-16', p: 12.5 }]);
  });

  it('drops junk entries from the log and the value history', () => {
    const p = hydrate({
      holdings: [],
      tx: [null, 'junk', { id: 't1', type: 'buy', amount: '-100', date: '2026-03-01' }, { type: 'wat' }],
      history: [{ d: '2026-03-01', v: '100' }, { d: 'nope', v: 1 }, null],
    });
    expect(p.tx).toHaveLength(4);
    expect(p.tx[2]).toMatchObject({ id: 't1', type: 'buy', amount: -100 });
    // an unknown type falls back to the neutral one rather than reaching TX_STYLE
    expect(p.tx[3].type).toBe('price');
    expect(p.history).toEqual([{ d: '2026-03-01', v: 100 }]);
  });

  it('keeps only the settings it knows, and only the values they can take', () => {
    const p = hydrate({
      holdings: [],
      settings: { liveQuotes: 'yes', provider: 'evil-provider', lastQuoteSync: 1, other: true },
    });
    expect(p.settings.provider).toBe('yahoo');
    expect(p.settings.liveQuotes).toBe(true);
    expect(p.settings).not.toHaveProperty('other');
    expect(p.settings).not.toHaveProperty('lastQuoteSync');
  });

  it('drops fields it does not know about', () => {
    const p = hydrate({ holdings: [{ sym: 'X', evil: 'payload' }], evil: 'payload', v: 1 });
    expect(p).not.toHaveProperty('evil');
    expect(p.holdings[0]).not.toHaveProperty('evil');
  });

  it('caps every series so one file cannot grow the store without bound', () => {
    const many = (n: number, make: (i: number) => unknown) => Array.from({ length: n }, (_, i) => make(i));
    const p = hydrate({
      holdings: many(MAX_HOLDINGS + 50, (i) => ({
        sym: 'S' + i,
        hist: many(MAX_HIST + 500, (j) => ({ d: '2026-03-17', p: j })),
      })),
      tx: many(MAX_TX + 50, (i) => ({ type: 'buy', amount: i, date: '2026-03-17' })),
      history: many(MAX_HISTORY + 50, (i) => ({ d: '2026-03-17', v: i })),
    });
    expect(p.holdings).toHaveLength(MAX_HOLDINGS);
    expect(p.holdings[0].hist).toHaveLength(MAX_HIST);
    expect(p.tx).toHaveLength(MAX_TX);
    expect(p.history).toHaveLength(MAX_HISTORY);
  });

  it('leaves the maths finite whatever it was handed', () => {
    const c = comp(
      hydrate({
        cash: 'abc',
        holdings: [{ sym: 'A', shares: 'x', price: 'y', avg: null }, { sym: 'B', shares: 2, price: 3 }],
      })
    );
    [c.net, c.invested, c.dayAbs, c.dayPct, c.unreal, c.total, c.cashWeight, c.progress].forEach((n) =>
      expect(isFinite(n)).toBe(true)
    );
  });
});
