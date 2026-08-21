import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useToast } from '../components/Toast';
import { comp } from '../domain/compute';
import { money, money2, price as fmtPrice, qty, today, uid } from '../domain/format';
import {
  applyBuy,
  applySell,
  blank,
  hydrate,
  isClosed,
  logTx,
  pushPrice,
  snapshot,
} from '../domain/model';
import { sampleData } from '../domain/sample';
import type { Computed, Holding, Portfolio, QuoteProviderId, TxType } from '../domain/types';
import { getApiKey } from '../quotes/apiKey';
import { refreshQuotes, type RefreshResult } from '../quotes/refresh';
import { clearPortfolio, flushSave, loadPortfolio, savePortfolio } from './storage';

export interface HoldingInput {
  sym: string;
  name: string;
  shares: number;
  avg: number;
  price: number;
  prev: number | null;
  sector: string;
  color: string;
  about: string;
  quoteSymbol?: string;
}

interface PortfolioValue {
  S: Portfolio;
  c: Computed;
  ready: boolean;
  refreshing: boolean;
  start(mode: 'empty' | 'sample', name: string, currency: string): void;
  saveHolding(input: HoldingInput, id?: string): void;
  trade(id: string, side: 'buy' | 'sell', q: number, p: number, fee: number): void;
  cash(mode: 'deposit' | 'withdraw' | 'set', amount: number, note: string): void;
  logActivity(kind: TxType, amount: number, date: string, note: string, sym: string): void;
  savePrices(next: Record<string, number>): void;
  setGoal(goal: number): void;
  saveSettings(next: { name?: string; currency?: string; goal?: number; liveQuotes?: boolean; provider?: QuoteProviderId }): void;
  deleteHolding(id: string): void;
  deleteTx(id: string): void;
  importJSON(text: string): boolean;
  exportJSON(): string;
  reset(): void;
  refresh(opts?: { silent?: boolean }): Promise<RefreshResult | null>;
}

const Ctx = createContext<PortfolioValue | null>(null);

export function usePortfolio(): PortfolioValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePortfolio must be used inside PortfolioProvider');
  return v;
}

/** Portfolios are plain JSON, so a round trip is a safe structural clone. */
function clone(S: Portfolio): Portfolio {
  return JSON.parse(JSON.stringify(S)) as Portfolio;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [S, setS] = useState<Portfolio>(() => blank());
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const latest = useRef(S);
  latest.current = S;

  useEffect(() => {
    let alive = true;
    loadPortfolio().then((loaded) => {
      if (!alive) return;
      if (loaded) {
        snapshot(loaded);
        setS(loaded);
        savePortfolio(loaded);
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Flush the debounced save when the app leaves the foreground. */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') flushSave(latest.current);
    });
    return () => sub.remove();
  }, []);

  /**
   * Every mutation goes through here: mutate a clone, re-snapshot today's value,
   * persist, and optionally toast — the prototype's `commit()`.
   */
  const commit = useCallback(
    (fn: (draft: Portfolio) => string | void, opts?: { snapshot?: boolean }) => {
      setS((prev) => {
        const draft = clone(prev);
        const msg = fn(draft);
        if (opts?.snapshot !== false) snapshot(draft);
        savePortfolio(draft, () => toast('Changes are not being saved on this device'));
        if (msg) toast(msg);
        latest.current = draft;
        return draft;
      });
    },
    [toast]
  );

  const start = useCallback(
    (mode: 'empty' | 'sample', name: string, currency: string) => {
      commit((draft) => {
        const next = mode === 'sample' ? sampleData() : blank();
        next.currency = currency || 'USD';
        if (name) next.name = name;
        next.onboarded = true;
        Object.assign(draft, next);
        return mode === 'sample'
          ? 'Sample portfolio loaded — change anything you like'
          : 'Welcome to Bloom';
      });
    },
    [commit]
  );

  const saveHolding = useCallback(
    (input: HoldingInput, id?: string) => {
      commit((draft) => {
        if (id) {
          const h = draft.holdings.find((x) => x.id === id);
          if (!h) return;
          Object.assign(h, input);
          pushPrice(h, input.price);
          h.updated = today();
          return 'Saved';
        }
        const h: Holding = { id: uid(), hist: [], updated: today(), ...input };
        pushPrice(h, input.price);
        draft.holdings.push(h);
        return input.sym + ' added';
      });
    },
    [commit]
  );

  const trade = useCallback(
    (id: string, side: 'buy' | 'sell', q: number, p: number, fee: number) => {
      commit((draft) => {
        const h = draft.holdings.find((x) => x.id === id);
        if (!h) return;
        const cur = draft.currency;
        const gross = q * p;
        const feeNote = fee ? ' · ' + money2(cur, fee) + ' fees' : '';
        if (side === 'buy') {
          applyBuy(draft, h, q, p, fee);
          logTx(draft, {
            type: 'buy',
            sym: h.sym,
            amount: -(gross + fee),
            note: qty(q) + ' at ' + fmtPrice(cur, p) + feeNote,
          });
        } else {
          applySell(draft, h, q, p, fee);
          logTx(draft, {
            type: 'sell',
            sym: h.sym,
            amount: gross - fee,
            note: qty(q) + ' at ' + fmtPrice(cur, p) + feeNote,
          });
        }
        h.prev = h.prev == null ? h.price : h.prev;
        h.price = p;
        h.updated = today();
        pushPrice(h, p);
        let msg = side === 'buy' ? 'Bought ' + qty(q) + ' ' + h.sym : 'Sold ' + qty(q) + ' ' + h.sym;
        if (isClosed(h)) {
          draft.holdings = draft.holdings.filter((x) => x.id !== h.id);
          msg = h.sym + ' position closed';
        }
        return msg;
      });
    },
    [commit]
  );

  const cash = useCallback(
    (mode: 'deposit' | 'withdraw' | 'set', amount: number, note: string) => {
      commit((draft) => {
        const cur = draft.currency;
        if (mode === 'set') {
          draft.cash = amount;
          return 'Cash set to ' + money2(cur, amount);
        }
        if (mode === 'deposit') {
          draft.cash += amount;
          logTx(draft, { type: 'deposit', amount, note: note || 'Added to cash' });
          return money2(cur, amount) + ' added';
        }
        draft.cash -= amount;
        logTx(draft, { type: 'withdraw', amount: -amount, note: note || 'Taken out of cash' });
        return money2(cur, amount) + ' withdrawn';
      });
    },
    [commit]
  );

  const logActivity = useCallback(
    (kind: TxType, amount: number, date: string, note: string, sym: string) => {
      commit((draft) => {
        const signedAmt = kind === 'withdraw' ? -amount : amount;
        draft.cash += signedAmt;
        logTx(draft, {
          type: kind,
          sym: kind === 'dividend' ? sym : '',
          amount: signedAmt,
          date,
          note:
            note ||
            (kind === 'dividend'
              ? 'Dividend received'
              : kind === 'deposit'
                ? 'Added to cash'
                : 'Taken out of cash'),
        });
        return 'Logged';
      });
    },
    [commit]
  );

  const savePrices = useCallback(
    (next: Record<string, number>) => {
      commit((draft) => {
        let n = 0;
        draft.holdings.forEach((h) => {
          const p = next[h.id];
          if (p == null || isNaN(p) || p < 0 || Math.abs(p - h.price) < 1e-9) return;
          h.prev = h.price;
          h.price = p;
          h.updated = today();
          pushPrice(h, p);
          n++;
        });
        return n ? n + ' price' + (n > 1 ? 's' : '') + ' updated' : 'Nothing changed';
      });
    },
    [commit]
  );

  const setGoal = useCallback(
    (goal: number) => {
      commit((draft) => {
        draft.goal = goal;
        return 'Goal set to ' + money(draft.currency, goal);
      });
    },
    [commit]
  );

  const saveSettings = useCallback<PortfolioValue['saveSettings']>(
    (next) => {
      commit((draft) => {
        if (next.name !== undefined) draft.name = next.name;
        if (next.currency) draft.currency = next.currency;
        if (next.goal !== undefined && !isNaN(next.goal) && next.goal > 0) draft.goal = next.goal;
        if (next.liveQuotes !== undefined) draft.settings.liveQuotes = next.liveQuotes;
        if (next.provider) draft.settings.provider = next.provider;
        return 'Saved';
      });
    },
    [commit]
  );

  const deleteHolding = useCallback(
    (id: string) => {
      commit((draft) => {
        const h = draft.holdings.find((x) => x.id === id);
        draft.holdings = draft.holdings.filter((x) => x.id !== id);
        return (h ? h.sym : 'Holding') + ' removed';
      });
    },
    [commit]
  );

  const deleteTx = useCallback(
    (id: string) => {
      commit(
        (draft) => {
          draft.tx = draft.tx.filter((t) => t.id !== id);
          return 'Entry deleted';
        },
        { snapshot: false }
      );
    },
    [commit]
  );

  const importJSON = useCallback(
    (text: string) => {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.holdings)) throw new Error('shape');
        commit((draft) => {
          const next = hydrate(parsed);
          next.onboarded = true;
          Object.assign(draft, next);
          return 'Portfolio loaded';
        });
        return true;
      } catch {
        return false;
      }
    },
    [commit]
  );

  const exportJSON = useCallback(() => JSON.stringify(latest.current), []);

  const reset = useCallback(() => {
    clearPortfolio();
    commit((draft) => {
      Object.assign(draft, blank());
      return 'Cleared. Starting fresh.';
    });
  }, [commit]);

  const refresh = useCallback<PortfolioValue['refresh']>(
    async (opts) => {
      const current = latest.current;
      if (!current.settings.liveQuotes || !current.holdings.length) return null;
      setRefreshing(true);
      try {
        const draft = clone(current);
        const key = await getApiKey();
        const result = await refreshQuotes(draft, key);
        if (result.updated) {
          snapshot(draft);
          savePortfolio(draft);
          latest.current = draft;
          setS(draft);
        }
        if (!opts?.silent) {
          if (result.failures.length && !result.updated) {
            toast('Could not reach quotes — prices unchanged');
          } else if (result.failures.length) {
            toast(
              `${result.updated} updated · ${result.failures.map((f) => f.sym).join(', ')} failed`
            );
          } else if (result.updated) {
            toast(result.updated + ' price' + (result.updated > 1 ? 's' : '') + ' refreshed');
          }
        }
        return result;
      } finally {
        setRefreshing(false);
      }
    },
    [toast]
  );

  /** One quiet refresh when the app is opened, if live quotes are on. */
  const bootRefreshed = useRef(false);
  useEffect(() => {
    if (!ready || bootRefreshed.current) return;
    if (!S.onboarded || !S.settings.liveQuotes || !S.holdings.length) return;
    bootRefreshed.current = true;
    refresh({ silent: true });
  }, [ready, S.onboarded, S.settings.liveQuotes, S.holdings.length, refresh]);

  const c = useMemo(() => comp(S), [S]);

  const value = useMemo<PortfolioValue>(
    () => ({
      S,
      c,
      ready,
      refreshing,
      start,
      saveHolding,
      trade,
      cash,
      logActivity,
      savePrices,
      setGoal,
      saveSettings,
      deleteHolding,
      deleteTx,
      importJSON,
      exportJSON,
      reset,
      refresh,
    }),
    [
      S,
      c,
      ready,
      refreshing,
      start,
      saveHolding,
      trade,
      cash,
      logActivity,
      savePrices,
      setGoal,
      saveSettings,
      deleteHolding,
      deleteTx,
      importJSON,
      exportJSON,
      reset,
      refresh,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
