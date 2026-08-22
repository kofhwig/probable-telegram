import { finnhubProvider } from '../finnhub';
import { QUOTE_TIMEOUT_MS, QuoteError } from '../provider';
import { yahooProvider } from '../yahoo';

/**
 * React Native's `fetch` has no timeout of its own. A socket that connects and
 * then goes quiet left the refresh promise unsettled forever, and with it the
 * pull-to-refresh spinner — `setRefreshing(false)` only runs once the awaited
 * call comes back.
 */

/** A request that never answers, but honours `signal` the way `fetch` does. */
function stalls(stage: 'headers' | 'body') {
  const fn = jest.fn((_url: string, init?: { signal?: AbortSignal }) => {
    const never = new Promise<never>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const e = new Error('Aborted');
        e.name = 'AbortError';
        reject(e);
      });
    });
    if (stage === 'headers') return never;
    return Promise.resolve({ ok: true, status: 200, json: () => never });
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

async function expectTimeout(run: () => Promise<unknown>) {
  const pending = run();
  const settled = pending.then(
    () => 'resolved',
    (e) => e
  );
  // nothing has come back on its own
  await Promise.resolve();
  jest.advanceTimersByTime(QUOTE_TIMEOUT_MS);
  const outcome = await settled;
  expect(outcome).toBeInstanceOf(QuoteError);
  expect((outcome as QuoteError).message).toMatch(/Timed out/);
}

describe('a provider that never answers', () => {
  it('gives up on Yahoo instead of hanging', async () => {
    stalls('headers');
    await expectTimeout(() => yahooProvider.getQuote('NVDA'));
  });

  it('gives up on Finnhub instead of hanging', async () => {
    stalls('headers');
    await expectTimeout(() => finnhubProvider.getQuote('NVDA', 'key'));
  });

  it('gives up when the headers arrive but the body never does', async () => {
    stalls('body');
    await expectTimeout(() => yahooProvider.getQuote('NVDA'));
  });
});

describe('a provider that answers in time', () => {
  it('leaves no timer armed behind it', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        chart: { result: [{ meta: { regularMarketPrice: 10, chartPreviousClose: 9 } }] },
      }),
    })) as unknown as typeof fetch;

    const before = jest.getTimerCount();
    const quote = await yahooProvider.getQuote('NVDA');

    expect(quote.price).toBe(10);
    expect(jest.getTimerCount()).toBe(before);
  });

  it('reports an unreadable body rather than throwing a parse error at the caller', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    })) as unknown as typeof fetch;

    await expect(yahooProvider.getQuote('NVDA')).rejects.toThrow(QuoteError);
    await expect(yahooProvider.getQuote('NVDA')).rejects.toThrow('Unreadable response');
  });
});
