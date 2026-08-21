import type { IconName } from './Icon';
import type { TxType } from '../domain/types';
import { oklch, white } from '../theme/oklch';

/** Icon, label and accent for each kind of logged entry. */
export const TX_STYLE: Record<TxType, { icon: IconName; label: string; bg: string; color: string }> = {
  buy: { icon: 'plus', label: 'Bought', bg: oklch(0.84, 0.1, 350, 0.16), color: oklch(0.86, 0.1, 350) },
  sell: { icon: 'minus', label: 'Sold', bg: oklch(0.74, 0.14, 24, 0.16), color: oklch(0.78, 0.14, 24) },
  dividend: { icon: 'coins', label: 'Dividend', bg: oklch(0.84, 0.09, 85, 0.16), color: oklch(0.85, 0.09, 85) },
  deposit: { icon: 'arrowDown', label: 'Deposit', bg: oklch(0.86, 0.12, 165, 0.15), color: oklch(0.86, 0.12, 165) },
  withdraw: { icon: 'arrowUp', label: 'Withdrawal', bg: white(0.07), color: oklch(0.8, 0.04, 350) },
  price: { icon: 'refresh', label: 'Price update', bg: white(0.07), color: oklch(0.8, 0.04, 350) },
};
