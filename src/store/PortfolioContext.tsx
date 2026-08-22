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
import { money, money2, parseNum, price as fmtPrice, qty, today, uid } from '../domain/format';
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
import { applyQuote, fetchQuotes, type RefreshResult } from '../quotes/refresh';
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
  /** Accepts what the user typed; parsed with `parseNum` like every other amount. */
  setGoal(goal: number | string): void;
  saveSettings(next: {
    name?: string;
    currency?: string;
    goal?: number | string;
    liveQuotes?: boolean;
    provider?: QuoteProviderId;
  }): void;
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
  /**
   * The live portfolio, readable synchronously. Every writer updates it in the
   * same tick it calls `setS`, so an action and a refresh fired from the same
   * handler cannot read each other's stale copy.
   */
  const latest = useRef(S);

  useEffect(() => {
    let alive = true;
    loadPortfolio().then((loaded) => {
      if (!alive) return;
      if (loaded) {
        snapshot(loaded);
        latest.current = loaded;
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
   *
   * The draft is built here rather than inside the `setS` updater. React may run
   * an updater during a later render, which made the saving, the toast and the
   * `latest` write happen after the handler had moved on: a refresh started in
   * the same handler read the pre-edit portfolio and wrote it back over the edit.
   */
  const commit = useCallback(
    (fn: (draft: Portfolio) => string | void, opts?: { snapshot?: boolean }) => {
      const draft = clone(latest.current);
      const msg = fn(draft);
      if (opts?.snapshot !== false) snapshot(draft);
      latest.current = draft;
      setS(draft);
      savePortfolio(draft, () => toast('Changes are not being saved on this device'));
      if (msg) toast(msg);
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

  const setGoal = useCallback<PortfolioValue['setGoal']>(
    (goal) => {
      const g = parseNum(goal);
      if (isNaN(g) || g <= 0) return;
      commit((draft) => {
        draft.goal = g;
        return 'Goal set to ' + money(draft.currency, g);
      });
    },
    [commit]
  );

  const saveSettings = useCallback<PortfolioValue['saveSettings']>(
    (next) => {
      commit((draft) => {
        if (next.name !== undefined) draft.name = next.name;
        if (next.currency) draft.currency = next.currency;
        // One parser for every amount the user can type, so "1.000,50" means the
        // same in Settings as it does in the goal sheet.
        if (next.goal !== undefined) {
          const g = parseNum(next.goal);
          if (!isNaN(g) && g > 0) draft.goal = g;
        }
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
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('shape');
        }
        if (!Array.isArray(parsed.holdings)) throw new Error('shape');
        // `hydrate` keeps only the fields below and coerces each one, so a file
        // that is JSON but not a portfolio cannot reach the screens or the disk.
        const next = hydrate(parsed);
        next.onboarded = true;
        commit((draft) => {
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
      // `blank()` has no `onboarded` key, so assigning it cannot clear one that
      // is already true — without this, starting over wipes the data but leaves
      // you sitting on Home instead of back at the welcome screen.
      draft.onboarded = false;
      return 'Cleared. Starting fresh.';
    });
  }, [commit]);

  const refresh = useCallback<PortfolioValue['refresh']>(
    async (opts) => {
      const current = latest.current;
      if (!current.settings.liveQuotes || !current.holdings.length) return null;
      setRefreshing(true);
      try {
        const key = await getApiKey();
        const { quotes, failures } = await fetchQuotes(current, key);

        // Quotes land on the portfolio as it is now, not as it was when the
        // request went out — a holding added or edited meanwhile survives, and
        // one deleted meanwhile stays deleted.
        let updated = 0;
        if (quotes.length) {
          commit((draft) => {
            quotes.forEach(({ id, quote }) => {
              const h = draft.holdings.find((x) => x.id === id);
              if (!h) return;
              applyQuote(h, quote);
              updated++;
            });
            if (updated) draft.settings.lastQuoteSync = new Date().toISOString();
          });
        }

        const result: RefreshResult = { updated, failures };
        if (!opts?.silent) {
          if (failures.length && !updated) {
            toast('Could not reach quotes — prices unchanged');
          } else if (failures.length) {
            toast(`${updated} updated · ${failures.map((f) => f.sym).join(', ')} failed`);
          } else if (updated) {
            toast(updated + ' price' + (updated > 1 ? 's' : '') + ' refreshed');
          }
        }
        return result;
      } finally {
        setRefreshing(false);
      }
    },
    [commit, toast]
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
