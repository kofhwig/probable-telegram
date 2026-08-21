export type TxType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdraw' | 'price';

export type Tone = 'up' | 'down' | 'flat';

export interface PricePoint {
  d: string;
  p: number;
}

export interface HistoryPoint {
  d: string;
  v: number;
}

export interface Holding {
  id: string;
  sym: string;
  name: string;
  shares: number;
  avg: number;
  price: number;
  /** Previous close. `null` means "no prior mark", so today's change is zero. */
  prev: number | null;
  sector: string;
  color: string;
  about: string;
  updated: string;
  hist: PricePoint[];
  /**
   * Symbol to ask the quote provider for, when it differs from the display
   * ticker (crypto needs `BTC-USD`, London listings need `VOD.L`).
   */
  quoteSymbol?: string;
}

export interface Tx {
  id: string;
  type: TxType;
  sym: string;
  note: string;
  amount: number;
  date: string;
}

export type QuoteProviderId = 'yahoo' | 'finnhub';

export interface Settings {
  liveQuotes: boolean;
  provider: QuoteProviderId;
  /** ISO timestamp of the last successful refresh, for the settings sheet. */
  lastQuoteSync?: string;
}

export interface Portfolio {
  v: number;
  name: string;
  currency: string;
  goal: number;
  cash: number;
  realized: number;
  holdings: Holding[];
  tx: Tx[];
  history: HistoryPoint[];
  created: string;
  onboarded?: boolean;
  settings: Settings;
}

/** A holding with the derived numbers `comp()` attaches. */
export interface ComputedHolding extends Holding {
  value: number;
  cost: number;
  pl: number;
  plPct: number;
  dayAbs: number;
  dayPct: number;
  weight: number;
}

export interface Computed {
  hs: ComputedHolding[];
  invested: number;
  net: number;
  dayAbs: number;
  dayPct: number;
  unreal: number;
  total: number;
  cashWeight: number;
  progress: number;
}

export interface SectorRow {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export interface Alert {
  icon: string;
  tone: Tone | '';
  title: string;
  body: string;
}
