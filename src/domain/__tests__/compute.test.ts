import { alerts, comp, diversification, makePath, rangeSeries, sectorRows } from '../compute';
import { today } from '../format';
import { blank } from '../model';
import type { Holding, Portfolio } from '../types';

function holding(over: Partial<Holding> = {}): Holding {
  return {
    id: over.id ?? 'h1',
    sym: over.sym ?? 'AAA',
    name: over.name ?? 'Alpha',
    shares: over.shares ?? 10,
    avg: over.avg ?? 100,
    price: over.price ?? 110,
    prev: over.prev ?? 100,
    sector: over.sector ?? 'Technology',
    color: over.color ?? '#fff',
    about: over.about ?? '',
    updated: over.updated ?? today(),
    hist: over.hist ?? [],
    quoteSymbol: over.quoteSymbol,
    // `prev` is meaningfully nullable, so an explicit null has to survive
    ...('prev' in over ? { prev: over.prev ?? null } : null),
  };
}

function portfolio(over: Partial<Portfolio> = {}): Portfolio {
  return { ...blank(), ...over };
}

describe('comp', () => {
  it('derives value, cost, P/L and the day move per holding', () => {
    const S = portfolio({ holdings: [holding({ shares: 10, avg: 100, price: 110, prev: 100 })] });
    const c = comp(S);
    const h = c.hs[0];
    expect(h.value).toBe(1100);
    expect(h.cost).toBe(1000);
    expect(h.pl).toBe(100);
    expect(h.plPct).toBeCloseTo(10);
    expect(h.dayAbs).toBeCloseTo(100);
    expect(h.dayPct).toBeCloseTo(10);
  });

  it('counts cash into net worth and weights', () => {
    const S = portfolio({ holdings: [holding({ shares: 10, avg: 100, price: 100, prev: 100 })], cash: 1000 });
    const c = comp(S);
    expect(c.invested).toBe(1000);
    expect(c.net).toBe(2000);
    expect(c.hs[0].weight).toBeCloseTo(50);
    expect(c.cashWeight).toBeCloseTo(50);
  });

  it('treats a missing previous close as no move, not a crash', () => {
    const S = portfolio({ holdings: [holding({ prev: null, price: 110 })] });
    const c = comp(S);
    expect(c.hs[0].dayAbs).toBe(0);
    expect(c.hs[0].dayPct).toBe(0);
  });

  it('adds realised P/L into the all-time total', () => {
    const S = portfolio({ holdings: [holding({ shares: 10, avg: 100, price: 110 })], realized: 250 });
    const c = comp(S);
    expect(c.unreal).toBe(100);
    expect(c.total).toBe(350);
  });

  it('caps goal progress at 100%', () => {
    const S = portfolio({ cash: 250000, goal: 100000 });
    expect(comp(S).progress).toBe(1);
  });

  it('reports zero rather than NaN on an empty portfolio', () => {
    const c = comp(portfolio());
    expect(c.net).toBe(0);
    expect(c.dayPct).toBe(0);
    expect(c.progress).toBe(0);
  });
});

describe('sectorRows', () => {
  it('groups by sector, largest first, with cash as its own row', () => {
    const S = portfolio({
      holdings: [
        holding({ id: 'a', sector: 'Technology', shares: 1, price: 100, prev: 100 }),
        holding({ id: 'b', sector: 'Technology', shares: 1, price: 200, prev: 200 }),
        holding({ id: 'c', sector: 'Energy', shares: 1, price: 100, prev: 100 }),
      ],
      cash: 100,
    });
    const rows = sectorRows(S, comp(S));
    expect(rows.map((r) => r.label)).toEqual(['Technology', 'Energy', 'Cash']);
    expect(rows[0].value).toBe(300);
    expect(rows[0].pct).toBeCloseTo(60);
  });
});

describe('diversification', () => {
  it('flags an empty or single-name book', () => {
    expect(diversification(portfolio(), comp(portfolio())).label).toBe('Nothing planted');
    const one = portfolio({ holdings: [holding()] });
    expect(diversification(one, comp(one)).label).toBe('Single position');
  });

  it('scores a wide even spread higher than a concentrated one', () => {
    const spread = portfolio({
      holdings: ['Technology', 'Energy', 'Healthcare', 'Bonds', 'Consumer', 'Financials'].map((sector, i) =>
        holding({ id: `h${i}`, sym: `S${i}`, sector, shares: 1, price: 100, prev: 100 })
      ),
    });
    const heavy = portfolio({
      holdings: [
        holding({ id: 'big', shares: 90, price: 100, prev: 100 }),
        holding({ id: 'small', sym: 'BBB', shares: 10, price: 100, prev: 100 }),
      ],
    });
    expect(diversification(spread, comp(spread)).score).toBeGreaterThan(
      diversification(heavy, comp(heavy)).score
    );
  });

  it('marks down a book where one sector dominates', () => {
    const oneSector = portfolio({
      holdings: Array.from({ length: 6 }, (_, i) =>
        holding({ id: `h${i}`, sym: `S${i}`, sector: 'Technology', shares: 1, price: 100, prev: 100 })
      ),
    });
    const c = oneSector;
    expect(diversification(c, comp(c)).score).toBeLessThan(60);
  });
});

describe('rangeSeries', () => {
  const S = portfolio({
    history: [
      { d: '2026-01-01', v: 100 },
      { d: '2026-03-10', v: 200 },
      { d: '2026-03-16', v: 300 },
    ],
  });

  it('returns everything when the range is All', () => {
    expect(rangeSeries(S, 0)).toHaveLength(3);
  });

  it('windows to the requested number of days', () => {
    expect(rangeSeries(S, 7).map((p) => p.v)).toEqual([200, 300]);
  });

  it('falls back to the last two points rather than a single dot', () => {
    expect(rangeSeries(S, 1)).toHaveLength(2);
  });
});

describe('makePath', () => {
  it('spans the full width and stays inside the padded height', () => {
    const p = makePath([1, 2, 3], 100, 50);
    expect(p.pts[0].x).toBe(0);
    expect(p.pts[2].x).toBe(100);
    expect(p.pts.every((pt) => pt.y >= 5 && pt.y <= 45)).toBe(true);
    expect(p.up).toBe(true);
  });

  it('survives a flat series without dividing by zero', () => {
    const p = makePath([5, 5, 5], 100, 50);
    expect(p.pts.every((pt) => isFinite(pt.y))).toBe(true);
  });
});

describe('alerts', () => {
  it('raises a mover past 3%', () => {
    const S = portfolio({ holdings: [holding({ price: 110, prev: 100 })] });
    expect(alerts(S).some((a) => a.title.includes('moved'))).toBe(true);
  });

  it('stays quiet on a small move in a balanced book', () => {
    const S = portfolio({
      holdings: ['Technology', 'Energy', 'Bonds'].map((sector, i) =>
        holding({ id: `h${i}`, sym: `S${i}`, sector, shares: 1, price: 100.5, prev: 100 })
      ),
    });
    expect(alerts(S)).toHaveLength(0);
  });

  it('warns when one position is over 35% of the book', () => {
    const S = portfolio({
      holdings: [
        holding({ id: 'a', shares: 9, price: 100, prev: 100 }),
        holding({ id: 'b', sym: 'BBB', shares: 1, price: 100, prev: 100 }),
      ],
    });
    expect(alerts(S).some((a) => a.title.includes('% of the portfolio'))).toBe(true);
  });

  it('notices stale prices', () => {
    const S = portfolio({ holdings: [holding({ updated: '2026-02-01', price: 100, prev: 100 })] });
    expect(alerts(S).some((a) => a.title.includes('over a week old'))).toBe(true);
  });

  it('celebrates crossing the goal', () => {
    const S = portfolio({ cash: 200000, goal: 100000 });
    expect(alerts(S).some((a) => a.title === 'Full bloom')).toBe(true);
  });
});
