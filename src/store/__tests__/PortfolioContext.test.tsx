import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import yahooNvda from '../../quotes/__fixtures__/yahoo-nvda.json';
import { today } from '../../domain/format';
import { PortfolioProvider, usePortfolio, type HoldingInput } from '../PortfolioContext';

// jest hoists mock factories, so the spy has to carry the `mock` prefix
const mockToast = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => mockToast }));

type Api = ReturnType<typeof usePortfolio>;

/** Mounts the provider and hands back a live handle on the context value. */
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
  await run(() => api().start('empty', 'Mara', 'USD'));
  return api;
}

/** Actions are synchronous state updates behind a debounced save. */
async function run(fn: () => void) {
  await act(async () => {
    fn();
    jest.advanceTimersByTime(300);
  });
}

const NVDA: HoldingInput = {
  sym: 'NVDA',
  name: 'NVIDIA Corp',
  shares: 10,
  avg: 100,
  price: 150,
  prev: 148,
  sector: 'Technology',
  color: '#fff',
  about: '',
};

beforeEach(() => {
  mockToast.mockClear();
  // the boot refresh fires as soon as a holding exists; keep it inert by default
  global.fetch = jest.fn(async () => {
    throw new Error('offline');
  }) as unknown as typeof fetch;
});

describe('start', () => {
  it('onboards an empty portfolio and announces it', async () => {
    const api = await setup();
    expect(api().S.onboarded).toBe(true);
    expect(api().S.name).toBe('Mara');
    expect(api().S.holdings).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith('Welcome to Bloom');
  });

  it('loads the sample book', async () => {
    const api = await setup();
    await run(() => api().start('sample', '', 'EUR'));
    expect(api().S.holdings).toHaveLength(7);
    expect(api().S.currency).toBe('EUR');
    expect(api().c.net).toBeGreaterThan(0);
  });
});

describe('saveHolding', () => {
  it('adds a holding, records its price and snapshots net worth', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const h = api().S.holdings[0];
    expect(h.sym).toBe('NVDA');
    expect(h.hist).toEqual([{ d: today(), p: 150 }]);
    expect(api().c.net).toBe(1500);
    expect(api().S.history[api().S.history.length - 1].v).toBe(1500);
    expect(mockToast).toHaveBeenCalledWith('NVDA added');
  });

  it('edits in place without duplicating the position', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().saveHolding({ ...NVDA, name: 'Nvidia', price: 160 }, id));
    expect(api().S.holdings).toHaveLength(1);
    expect(api().S.holdings[0].name).toBe('Nvidia');
    expect(api().S.holdings[0].price).toBe(160);
    expect(mockToast).toHaveBeenCalledWith('Saved');
  });
});

describe('trade', () => {
  it('buys: weighted average cost absorbs the fee, cash pays for it', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().trade(id, 'buy', 10, 170, 5));

    const h = api().S.holdings[0];
    expect(h.shares).toBe(20);
    expect(h.avg).toBeCloseTo(135.25); // (10*100 + 1700 + 5) / 20
    expect(api().S.cash).toBeCloseTo(-1705);
    expect(api().S.tx[0]).toMatchObject({ type: 'buy', sym: 'NVDA', amount: -1705 });
    expect(mockToast).toHaveBeenCalledWith('Bought 10 NVDA');
  });

  it('sells: books realised P/L against average cost', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().trade(id, 'sell', 5, 180, 0));

    expect(api().S.holdings[0].shares).toBe(5);
    expect(api().S.realized).toBeCloseTo(400); // 5 * (180 - 100)
    expect(api().S.cash).toBeCloseTo(900);
    expect(api().c.total).toBeCloseTo(400 + 5 * (180 - 100));
  });

  it('closes a position sold down to nothing', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().trade(id, 'sell', 10, 180, 0));

    expect(api().S.holdings).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith('NVDA position closed');
  });
});

describe('cash', () => {
  it('deposits, withdraws and sets the balance, logging the first two', async () => {
    const api = await setup();
    await run(() => api().cash('deposit', 5000, 'From bank'));
    expect(api().S.cash).toBe(5000);
    expect(api().S.tx[0]).toMatchObject({ type: 'deposit', amount: 5000, note: 'From bank' });

    await run(() => api().cash('withdraw', 1000, ''));
    expect(api().S.cash).toBe(4000);
    expect(api().S.tx[0]).toMatchObject({ type: 'withdraw', amount: -1000, note: 'Taken out of cash' });

    await run(() => api().cash('set', 250, ''));
    expect(api().S.cash).toBe(250);
    expect(api().S.tx).toHaveLength(2); // setting a balance is not a transfer
  });
});

describe('logActivity', () => {
  it('lands a dividend in cash and in the log', async () => {
    const api = await setup();
    await run(() => api().logActivity('dividend', 284.1, '2026-03-16', '', 'VOO'));
    expect(api().S.cash).toBeCloseTo(284.1);
    expect(api().S.tx[0]).toMatchObject({ type: 'dividend', sym: 'VOO', note: 'Dividend received', date: '2026-03-16' });
  });

  it('signs a withdrawal negative', async () => {
    const api = await setup();
    await run(() => api().logActivity('withdraw', 100, today(), 'Rent', ''));
    expect(api().S.cash).toBe(-100);
    expect(api().S.tx[0].amount).toBe(-100);
  });
});

describe('savePrices', () => {
  it('moves the previous close to the price being replaced', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().savePrices({ [id]: 165 }));

    const h = api().S.holdings[0];
    expect(h.price).toBe(165);
    expect(h.prev).toBe(150);
    expect(api().c.hs[0].dayPct).toBeCloseTo(10);
    expect(mockToast).toHaveBeenCalledWith('1 price updated');
  });

  it('says so when nothing actually changed', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().savePrices({ [id]: 150 }));
    expect(mockToast).toHaveBeenCalledWith('Nothing changed');
  });
});

describe('goal and settings', () => {
  it('sets the goal and recomputes progress', async () => {
    const api = await setup();
    await run(() => api().cash('deposit', 5000, ''));
    await run(() => api().setGoal(10000));
    expect(api().S.goal).toBe(10000);
    expect(api().c.progress).toBeCloseTo(0.5);
  });

  it('saves settings and leaves a bad goal alone', async () => {
    const api = await setup();
    await run(() => api().saveSettings({ name: 'Ada', currency: 'EUR', goal: NaN, liveQuotes: false }));
    expect(api().S.name).toBe('Ada');
    expect(api().S.currency).toBe('EUR');
    expect(api().S.settings.liveQuotes).toBe(false);
    expect(api().S.goal).toBe(100000); // unchanged
  });
});

describe('deletes', () => {
  it('removes a holding', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    const id = api().S.holdings[0].id;
    await run(() => api().deleteHolding(id));
    expect(api().S.holdings).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith('NVDA removed');
  });

  it('removes a log entry without touching cash', async () => {
    const api = await setup();
    await run(() => api().cash('deposit', 500, ''));
    const txId = api().S.tx[0].id;
    await run(() => api().deleteTx(txId));
    expect(api().S.tx).toHaveLength(0);
    expect(api().S.cash).toBe(500);
  });
});

describe('reset', () => {
  it('clears the book and sends you back to onboarding', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    await run(() => api().cash('deposit', 900, ''));
    await run(() => api().reset());

    expect(api().S.holdings).toHaveLength(0);
    expect(api().S.tx).toHaveLength(0);
    expect(api().S.cash).toBe(0);
    // the welcome screen is gated on this flag
    expect(api().S.onboarded).toBe(false);
    expect(mockToast).toHaveBeenCalledWith('Cleared. Starting fresh.');
  });
});

describe('export and import', () => {
  it('round-trips a portfolio', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    await run(() => api().cash('deposit', 900, ''));
    const json = api().exportJSON();

    await run(() => api().reset());
    expect(api().S.holdings).toHaveLength(0);

    let ok = false;
    await run(() => {
      ok = api().importJSON(json);
    });
    expect(ok).toBe(true);
    expect(api().S.holdings).toHaveLength(1);
    expect(api().S.cash).toBe(900);
    expect(api().S.onboarded).toBe(true);
  });

  it('rejects anything that is not a Bloom export', async () => {
    const api = await setup();
    let ok = true;
    await run(() => {
      ok = api().importJSON('{"nope":1}');
    });
    expect(ok).toBe(false);
    let ok2 = true;
    await run(() => {
      ok2 = api().importJSON('not json at all');
    });
    expect(ok2).toBe(false);
  });
});

describe('refresh', () => {
  function respondWith(body: unknown) {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
    })) as unknown as typeof fetch;
  }

  it('writes the provider price and previous close', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    respondWith(yahooNvda);

    await act(async () => {
      await api().refresh();
    });

    const h = api().S.holdings[0];
    expect(h.price).toBe(172.32);
    expect(h.prev).toBe(167.56);
    expect(h.updated).toBe(today());
    expect(api().S.settings.lastQuoteSync).toBeTruthy();
    expect(mockToast).toHaveBeenCalledWith('1 price refreshed');
  });

  it('leaves hand-entered prices alone when the provider cannot be reached', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    let result: Awaited<ReturnType<Api['refresh']>> = null;
    await act(async () => {
      result = await api().refresh();
    });

    expect(api().S.holdings[0].price).toBe(150);
    expect(result).toMatchObject({ updated: 0 });
    expect(result!.failures[0]).toMatchObject({ sym: 'NVDA', message: 'No connection' });
    expect(mockToast).toHaveBeenCalledWith('Could not reach quotes — prices unchanged');
  });

  it('does nothing when live quotes are switched off', async () => {
    const api = await setup();
    await run(() => api().saveHolding(NVDA));
    await run(() => api().saveSettings({ liveQuotes: false }));
    respondWith(yahooNvda);

    let result: Awaited<ReturnType<Api['refresh']>> = 'unset' as never;
    await act(async () => {
      result = await api().refresh();
    });
    expect(result).toBeNull();
    expect(api().S.holdings[0].price).toBe(150);
  });
});
