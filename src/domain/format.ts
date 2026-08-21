import { CURRENCIES } from './constants';
import type { Tone } from './types';

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function daysAgo(d: string): number {
  return Math.round((Date.parse(today()) - Date.parse(d)) / 86400000);
}

export function sym(currency: string): string {
  return CURRENCIES[currency] || '$';
}

export function money(currency: string, n: number, dp?: number): string {
  const neg = n < 0;
  const a = Math.abs(n);
  const s = a.toLocaleString('en-US', {
    minimumFractionDigits: dp || 0,
    maximumFractionDigits: dp === undefined ? 0 : dp,
  });
  return (neg ? '-' : '') + sym(currency) + s;
}

/** Cents shown only below 100 — the prototype's `money2`. */
export function money2(currency: string, n: number): string {
  return money(currency, n, Math.abs(n) < 100 ? 2 : 0);
}

/** Prices keep cents until they get large — the prototype's `price`. */
export function price(currency: string, n: number): string {
  return money(currency, n, Math.abs(n) >= 10000 ? 0 : 2);
}

export function signed(currency: string, n: number): string {
  return (n >= 0 ? '+' : '−') + money(currency, Math.abs(n));
}

export function pct(n: number): string {
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
}

export function qty(n: number): string {
  return n.toLocaleString('en-US', {
    maximumFractionDigits: n < 1 ? 6 : n < 100 ? 4 : 2,
  });
}

export function toneOf(n: number): Tone {
  return n > 0.0001 ? 'up' : n < -0.0001 ? 'down' : 'flat';
}

export function dayLabel(d: string): string {
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function monthLabel(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Accepts what a person actually types: `1,234.56`, `1.234,56`, `1 234`, `$99`.
 * Ported verbatim from the prototype so entry behaves identically.
 */
export function parseNum(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v)
    .trim()
    .replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const lastC = s.lastIndexOf(',');
  const lastD = s.lastIndexOf('.');
  if (lastC > -1 && lastD > -1) {
    if (lastC > lastD) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastC > -1) {
    const after = s.length - lastC - 1;
    const before = s.slice(0, lastC).replace('-', '').length;
    if (after === 3 && before <= 3 && s.indexOf(',') === lastC) s = s.replace(',', '');
    else s = s.replace(/,/g, '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

export function greeting(): string {
  const hr = new Date().getHours();
  const g = hr < 5 ? 'Late night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  return (
    g +
    ' · ' +
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  );
}
