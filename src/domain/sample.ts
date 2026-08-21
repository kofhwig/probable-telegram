import { PALETTE } from '../theme/tokens';
import { today, uid } from './format';
import { blank } from './model';
import type { Portfolio } from './types';

/** Deterministic LCG so the sample portfolio looks the same every time. */
function rngf(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Seed = [string, string, number, number, number, number, string, string, string, string];

/** Mara Okafor's book — the prototype's `sampleData()`, unchanged. */
export function sampleData(): Portfolio {
  const s = blank();
  s.name = 'Mara Okafor';
  s.goal = 500000;
  s.cash = 18900;

  const seed: Seed[] = [
    ['NVDA', 'NVIDIA Corp', 280, 71.2, 172.32, 167.56, 'Technology', 'mint', 'GPUs and accelerated computing. Largest and fastest-growing position.', 'NVDA'],
    ['AAPL', 'Apple Inc', 196, 152.3, 210.2, 208.28, 'Technology', 'pink', 'Consumer hardware plus a high-margin services flywheel.', 'AAPL'],
    ['VOO', 'Vanguard S&P 500', 112, 449.3, 557.14, 554.48, 'Index / ETF', 'blue', 'Broad exposure to the 500 largest US companies at near-zero cost.', 'VOO'],
    ['MSFT', 'Microsoft', 68, 318.6, 497.06, 491.12, 'Technology', 'violet', 'Cloud, productivity software and a deep AI partnership.', 'MSFT'],
    ['BTC', 'Bitcoin', 0.55, 37620, 70727, 71906, 'Crypto', 'gold', 'The largest digital asset by market cap. Sized as a satellite position.', 'BTC-USD'],
    ['TSLA', 'Tesla', 78, 330.0, 290.38, 297.25, 'Technology', 'coral', 'EVs, storage and autonomy bets. The only position underwater.', 'TSLA'],
    ['GLD', 'Gold ETF', 82, 206.1, 224.63, 223.94, 'Commodities', 'sage', 'A non-correlated hedge. Ballast for the canopy.', 'GLD'],
  ];

  s.holdings = seed.map((r) => ({
    id: uid(),
    sym: r[0],
    name: r[1],
    shares: r[2],
    avg: r[3],
    price: r[4],
    prev: r[5],
    sector: r[6],
    color: (PALETTE.find((p) => p[0] === r[7]) || PALETTE[0])[1],
    about: r[8],
    quoteSymbol: r[9],
    updated: today(),
    hist: [],
  }));

  const net = s.holdings.reduce((a, h) => a + h.shares * h.price, 0) + s.cash;

  // 14 months of daily history, ending exactly at today's net worth
  const rnd = rngf(20240);
  const N = 420;
  const start = net / 1.46;
  const step = (net - start) / (N - 1);
  const base = Date.parse(today()) - (N - 1) * 86400000;
  let drift = 0;
  for (let i = 0; i < N; i++) {
    drift = drift * 0.86 + (rnd() - 0.5) * net * 0.028;
    const v = i === N - 1 ? net : Math.max(net * 0.25, start + step * i + drift);
    s.history.push({ d: new Date(base + i * 86400000).toISOString().slice(0, 10), v: Math.round(v) });
  }

  s.holdings.forEach((h, k) => {
    const r2 = rngf(400 + k * 31);
    const M = 120;
    const st = h.avg;
    const sp = (h.price - st) / (M - 1);
    let dr = 0;
    const b = Date.parse(today()) - (M - 1) * 86400000;
    for (let i = 0; i < M; i++) {
      dr = dr * 0.85 + (r2() - 0.5) * h.price * 0.035;
      const p = i === M - 1 ? h.price : Math.max(h.price * 0.3, st + sp * i + dr);
      h.hist.push({ d: new Date(b + i * 86400000).toISOString().slice(0, 10), p: +p.toFixed(4) });
    }
  });

  const tx: [string, string, string, number, number][] = [
    ['dividend', 'VOO', 'Quarterly distribution', 284.1, 1],
    ['buy', 'NVDA', '20 shares at ', -3402.0, 3],
    ['dividend', 'AAPL', 'Quarterly distribution', 96.4, 6],
    ['sell', 'TSLA', '8 shares', 2380.0, 9],
    ['deposit', '', 'Transfer from bank', 5000.0, 11],
    ['buy', 'BTC', '0.017 at 69,400', -1200.0, 15],
  ];
  s.tx = tx.map((t) => ({
    id: uid(),
    type: t[0] as Portfolio['tx'][number]['type'],
    sym: t[1],
    note: t[2],
    amount: t[3],
    date: new Date(Date.parse(today()) - t[4] * 86400000).toISOString().slice(0, 10),
  }));
  s.realized = 2380 - 8 * 330;
  return s;
}
