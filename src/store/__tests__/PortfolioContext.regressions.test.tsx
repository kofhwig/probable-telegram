import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import yahooNvda from '../../quotes/__fixtures__/yahoo-nvda.json';
import { STORE_KEY } from '../../domain/constants';
import { PortfolioProvider, usePortfolio, type HoldingInput } from '../PortfolioContext';

const mockToast = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => mockToast }));

type Api = ReturnType<typeof usePortfolio>;

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
const AAPL: HoldingInput = { ...NVDA, sym: 'AAPL', name: 'Apple Inc' };

/** Every quote request answers with the recorded NVDA chart. */
function quotesAnswer() {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => yahooNvda,
  })) as unknown as typeof fetch;
}

/** Quote requests hang until `release()` is called, so edits can race them. */
function quotesHeld() {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  global.fetch = jest.fn(async () => {
    await gate;
    return { ok: true, status: 200, json: async () => yahooNvda };
  }) as unknown as typeof fetch;
  return () => release();
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
  await run(() => api().start('empty', 'Mara', 'USD'));
  await run(() => api().saveHolding(NVDA));
  mockToast.mockClear();
  return api;
}

async function run(fn: () => void) {
  await act(async () => {
    fn();
    jest.advanceTimersByTime(300);
  });
}

/** Lets pending promises settle and the 220ms save debounce fire. */
async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

beforeEach(() => {
  mockToast.mockClear();
  AsyncStorage.clear();
  quotesAnswer();
});

/**
 * The add sheet refreshes quotes in the same handler that saves the holding.
 * When the save only happened inside a `setS` updater, the refresh read the
 * portfolio from before the save and wrote that copy back — losing the holding
 * that had just been added, on disk as well as on screen.
 */
describe('an action and a refresh fired from the same handler', () => {
  it('keeps a holding added moments before the refresh', async () => {
    const api = await setup();

    await act(async () => {
      api().saveHolding(AAPL);
      api().refresh({ silent: true });
      jest.advanceTimersByTime(400);
    });
    await settle();

    expect(api().S.holdings.map((h) => h.sym).sort()).toEqual(['AAPL', 'NVDA']);
    const saved = JSON.parse((await AsyncStorage.getItem(STORE_KEY)) as string);
    expect(saved.holdings.map((h: { sym: string }) => h.sym).sort()).toEqual(['AAPL', 'NVDA']);
  });

  it('keeps an edit made moments before the refresh', async () => {
    const api = await setup();
    const id = api().S.holdings[0].id;

    await act(async () => {
      api().saveHolding({ ...NVDA, name: 'Renamed', shares: 99 }, id);
      api().refresh({ silent: true });
      jest.advanceTimersByTime(400);
    });
    await settle();

    expect(api().S.holdings[0].name).toBe('Renamed');
    expect(api().S.holdings[0].shares).toBe(99);
    // and the quote still landed
    expect(api().S.holdings[0].price).toBe(172.32);
  });
});

describe('an edit made while quotes are in flight', () => {
  it('survives the quotes landing', async () => {
    const api = await setup();
    const release = quotesHeld();

    let pending: Promise<unknown> | null = null;
    await act(async () => {
      pending = api().refresh({ silent: true });
    });
    await run(() => api().cash('deposit', 500, 'while fetching'));
    await run(() => api().saveHolding(AAPL));

    await act(async () => {
      release();
      await pending;
      jest.advanceTimersByTime(400);
    });
    await settle();

    expect(api().S.cash).toBe(500);
    expect(api().S.holdings.map((h) => h.sym).sort()).toEqual(['AAPL', 'NVDA']);
    expect(api().S.holdings.find((h) => h.sym === 'NVDA')?.price).toBe(172.32);
  });

  it('does not resurrect a holding deleted while they were in flight', async () => {
    const api = await setup();
    const release = quotesHeld();

    let pending: Promise<unknown> | null = null;
    await act(async () => {
      pending = api().refresh({ silent: true });
    });
    await run(() => api().deleteHolding(api().S.holdings[0].id));

    await act(async () => {
      release();
      await pending;
      jest.advanceTimersByTime(400);
    });
    await settle();

    expect(api().S.holdings).toHaveLength(0);
  });
});

/**
 * `commit` used to save, toast and update its ref from inside a `setS` updater.
 * Updaters have to be pure — React is free to run them again — so the effects
 * belong outside it.
 */
describe('commit', () => {
  it('announces and persists an action exactly once', async () => {
    const api = await setup();

    await run(() => api().cash('deposit', 250, ''));

    expect(mockToast).toHaveBeenCalledTimes(1);
    const saved = JSON.parse((await AsyncStorage.getItem(STORE_KEY)) as string);
    expect(saved.cash).toBe(250);
    expect(saved.tx.filter((t: { type: string }) => t.type === 'deposit')).toHaveLength(1);
  });

  it('applies two actions from the same handler in order', async () => {
    const api = await setup();

    await act(async () => {
      api().cash('deposit', 100, '');
      api().cash('deposit', 40, '');
      jest.advanceTimersByTime(300);
    });

    expect(api().S.cash).toBe(140);
    expect(api().S.tx.filter((t) => t.type === 'deposit')).toHaveLength(2);
  });
});

/** Settings used to strip everything but digits and dots, reading "1.000,50" as 1. */
describe('the goal', () => {
  it.each([
    ['1.000,50', 1000.5],
    ['1,000.50', 1000.5],
    ['$250 000', 250000],
    ['750000', 750000],
  ])('reads %s as %d', async (typed, expected) => {
    const api = await setup();
    await run(() => api().saveSettings({ goal: typed }));
    expect(api().S.goal).toBe(expected);
  });

  it('ignores a goal that is not a number, or is zero or negative', async () => {
    const api = await setup();
    const before = api().S.goal;
    for (const bad of ['', 'soon', '0', '-100']) {
      await run(() => api().saveSettings({ goal: bad }));
      expect(api().S.goal).toBe(before);
    }
    await run(() => api().setGoal('nope'));
    expect(api().S.goal).toBe(before);
  });
});
