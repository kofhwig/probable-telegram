export const SECTORS = [
  'Technology',
  'Index / ETF',
  'Crypto',
  'Commodities',
  'Healthcare',
  'Financials',
  'Energy',
  'Consumer',
  'Real estate',
  'Bonds',
  'Other',
];

export const CURRENCIES: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF ',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  BRL: 'R$',
  SEK: 'kr ',
};

export const RANGES: [string, number][] = [
  ['1W', 7],
  ['1M', 30],
  ['3M', 91],
  ['1Y', 365],
  ['All', 0],
];

export const STORE_KEY = 'bloom:portfolio:v1';
