import { comp } from '../compute';
import { today } from '../format';
import { applyBuy, applySell, blank, hydrate, isClosed, logTx, pushPrice, snapshot } from '../model';
import { sampleData } from '../sample';
import type { Holding, Portfolio } from '../types';

function holding(over: Partial<Holding> = {}): Holding {
  return {
    id: 'h1',
    sym: 'AAA',
    name: 'Alpha',
    shares: 10,
    avg: 100,
    price: 110,
    prev: 100,
    sector: 'Technology',
    color: '#fff',
    about: '',
    updated: today(),
    hist: [],
    ...over,
  };
}

describe('applyBuy', () => {
  it('rolls the fee into average cost and takes it out of cash', () => {
    const S: Portfolio = { ...blank(), cash: 5000 };
    const h = holding({ shares: 10, avg: 100 });
    applyBuy(S, h, 10, 120, 5);
    expect(h.shares).toBe(20);
    // (10*100 + 10*120 + 5) / 20
    expect(h.avg).toBeCloseTo(110.25);
    expect(S.cash).toBeCloseTo(5000 - 1205);
  });

  it('prices a first purchase at what was paid', () => {
    const S: Portfolio = { ...blank() };
    const h = holding({ shares: 0, avg: 0 });
    applyBuy(S, h, 4, 50, 0);
    expect(h.avg).toBe(50);
  });
});

describe('applySell', () => {
  it('books the gain against average cost, net of fees', () => {
    const S: Portfolio = { ...blank(), cash: 0, realized: 0 };
    const h = holding({ shares: 10, avg: 100 });
    applySell(S, h, 4, 130, 2);
    expect(h.shares).toBe(6);
    expect(S.cash).toBeCloseTo(4 * 130 - 2);
    expect(S.realized).toBeCloseTo(4 * 30 - 2);
  });

  it('books a loss when sold below cost', () => {
    const S: Portfolio = { ...blank() };
    applySell(S, holding({ shares: 10, avg: 100 }), 10, 80, 0);
    expect(S.realized).toBeCloseTo(-200);
  });

  it('leaves a fully sold position closed', () => {
    const h = holding({ shares: 10 });
    applySell(blank(), h, 10, 100, 0);
    expect(isClosed(h)).toBe(true);
  });
});

describe('pushPrice', () => {
  it('overwrites the same day instead of stacking points', () => {
    const h = holding({ hist: [] });
    pushPrice(h, 100);
    pushPrice(h, 105);
    expect(h.hist).toHaveLength(1);
    expect(h.hist[0].p).toBe(105);
  });

  it('appends when the day changes', () => {
    const h = holding({ hist: [{ d: '2026-03-16', p: 100 }] });
    pushPrice(h, 105);
    expect(h.hist).toHaveLength(2);
  });

  it('keeps at most 800 points', () => {
    const h = holding({
      hist: Array.from({ length: 900 }, (_, i) => ({ d: `d${i}`, p: i })),
    });
    pushPrice(h, 1);
    expect(h.hist.length).toBeLessThanOrEqual(800);
  });
});

describe('snapshot', () => {
  it('writes one point per day and updates it in place', () => {
    const S: Portfolio = { ...blank(), cash: 100 };
    snapshot(S);
    S.cash = 200;
    snapshot(S);
    expect(S.history).toHaveLength(1);
    expect(S.history[0].v).toBe(200);
    expect(S.history[0].d).toBe(today());
  });
});

describe('logTx', () => {
  it('puts the newest entry first and caps the log', () => {
    const S = blank();
    for (let i = 0; i < 505; i++) logTx(S, { type: 'deposit', amount: i, note: String(i) });
    expect(S.tx).toHaveLength(500);
    expect(S.tx[0].note).toBe('504');
  });
});

describe('hydrate', () => {
  it('accepts an export from the HTML version, which had no settings', () => {
    const legacy = {
      v: 1,
      name: 'Mara',
      currency: 'EUR',
      goal: 250000,
      cash: 100,
      realized: 0,
      holdings: [{ id: 'x', sym: 'AAA', name: 'Alpha', shares: 1, avg: 1, price: 2, prev: 1, sector: 'Other', color: '#fff', about: '', updated: '2026-03-16' }],
      tx: [],
      history: [],
      created: '2026-01-01',
      onboarded: true,
    };
    const S = hydrate(legacy);
    expect(S.currency).toBe('EUR');
    expect(S.settings.provider).toBe('yahoo');
    expect(S.settings.liveQuotes).toBe(true);
    expect(S.holdings[0].hist).toEqual([]);
    expect(comp(S).net).toBe(102);
  });

  it('survives junk without throwing', () => {
    expect(hydrate(null).holdings).toEqual([]);
    expect(hydrate({}).goal).toBe(100000);
  });

  it('round-trips a real portfolio through JSON', () => {
    const S = sampleData();
    const back = hydrate(JSON.parse(JSON.stringify(S)));
    expect(comp(back).net).toBeCloseTo(comp(S).net);
    expect(back.holdings).toHaveLength(S.holdings.length);
  });
});

describe('sampleData', () => {
  it('ends its history exactly at today’s net worth', () => {
    const S = sampleData();
    const c = comp(S);
    expect(S.history[S.history.length - 1].v).toBe(Math.round(c.net));
    expect(S.history[S.history.length - 1].d).toBe(today());
  });

  it('is deterministic', () => {
    expect(sampleData().history.map((p) => p.v)).toEqual(sampleData().history.map((p) => p.v));
  });
});
