import { oklch, white, black } from './oklch';

/** Palette lifted from the prototype's `:root` block, same oklch values. */
export const C = {
  pink: oklch(0.84, 0.1, 350),
  pinkSoft: oklch(0.86, 0.08, 350),
  pinkDim: oklch(0.74, 0.04, 350),
  mint: oklch(0.86, 0.12, 165),
  coral: oklch(0.76, 0.15, 24),
  gold: oklch(0.85, 0.09, 85),
  blue: oklch(0.8, 0.1, 250),
  violet: oklch(0.8, 0.11, 300),
  muted: oklch(0.7, 0.03, 330),
  dim: oklch(0.68, 0.03, 350),
  dimmer: oklch(0.6, 0.025, 340),
  text: '#ffffff',

  card: white(0.042),
  cardHi: white(0.075),
  line: white(0.075),
  lineHi: white(0.13),

  /** The screen gradient — `.screen` in the prototype. */
  bgTop: oklch(0.205, 0.034, 330),
  bgMid: oklch(0.145, 0.026, 322),
  bgBottom: oklch(0.12, 0.022, 320),
  /** Nav bar and sheet grounds. */
  navTop: oklch(0.16, 0.03, 324, 0.7),
  navBottom: oklch(0.13, 0.026, 322, 0.96),
  sheetTop: oklch(0.24, 0.04, 330),
  sheetBottom: oklch(0.145, 0.026, 322),
  overlayTop: oklch(0.2, 0.034, 330),
  overlayBottom: oklch(0.13, 0.024, 320),
  /** The hole in the middle of the allocation donut. */
  donutHole: oklch(0.165, 0.028, 324),

  scrim: 'rgba(8, 4, 10, 0.62)',
  toastBg: 'rgba(24, 12, 24, 0.94)',
  /** Text colour that sits on top of a pink fill. */
  onPink: '#2a0f1c',

  heroFrom: oklch(0.34, 0.08, 348, 0.55),
  heroTo: oklch(0.24, 0.05, 320, 0.35),
  bloomCardFrom: oklch(0.4, 0.1, 348, 0.4),
  bloomCardTo: oklch(0.26, 0.06, 330, 0.25),
  investedFrom: oklch(0.32, 0.07, 348, 0.45),
  investedTo: oklch(0.22, 0.045, 320, 0.3),

  btnPrimaryFrom: oklch(0.86, 0.1, 350),
  btnPrimaryTo: oklch(0.8, 0.12, 340),
  fabFrom: oklch(0.84, 0.11, 350),
  fabTo: oklch(0.74, 0.13, 338),
  danger: oklch(0.82, 0.14, 22),
  dangerBg: oklch(0.5, 0.15, 22, 0.18),
  dangerLine: oklch(0.7, 0.15, 22, 0.35),

  pillMintBg: oklch(0.84, 0.11, 165, 0.16),
  pillCoralBg: oklch(0.74, 0.15, 24, 0.16),
  pillGreyBg: white(0.07),

  shadow: black(0.45),
} as const;

/** Sector fills — `SECTOR_COLOR` in the prototype. */
export const SECTOR_COLOR: Record<string, string> = {
  Technology: oklch(0.8, 0.11, 300),
  'Index / ETF': oklch(0.8, 0.1, 250),
  Crypto: oklch(0.85, 0.09, 85),
  Commodities: oklch(0.78, 0.1, 60),
  Healthcare: oklch(0.84, 0.09, 210),
  Financials: oklch(0.82, 0.08, 140),
  Energy: oklch(0.76, 0.15, 24),
  Consumer: oklch(0.84, 0.1, 350),
  'Real estate': oklch(0.78, 0.09, 30),
  Bonds: oklch(0.74, 0.06, 260),
  Other: oklch(0.7, 0.03, 330),
  Cash: oklch(0.7, 0.03, 330),
};

/** Holding swatches — `PALETTE` in the prototype. */
export const PALETTE: [string, string][] = [
  ['pink', oklch(0.84, 0.1, 350)],
  ['mint', oklch(0.86, 0.12, 165)],
  ['blue', oklch(0.8, 0.1, 250)],
  ['violet', oklch(0.8, 0.11, 300)],
  ['gold', oklch(0.85, 0.09, 85)],
  ['coral', oklch(0.76, 0.15, 24)],
  ['sky', oklch(0.84, 0.09, 210)],
  ['sage', oklch(0.82, 0.08, 140)],
  ['muted', oklch(0.7, 0.03, 330)],
];

/** Insight-card accents, keyed by the prototype's hue numbers. */
export const HUE = {
  prune: { bgFrom: oklch(0.36, 0.09, 30, 0.32), line: oklch(0.7, 0.12, 30, 0.25), chip: oklch(0.75, 0.14, 30, 0.2), fg: oklch(0.84, 0.14, 30) },
  weight: { bgFrom: oklch(0.36, 0.09, 350, 0.32), line: oklch(0.7, 0.12, 350, 0.25), chip: oklch(0.75, 0.14, 350, 0.2), fg: oklch(0.84, 0.14, 350) },
  cash: { bgFrom: oklch(0.36, 0.09, 85, 0.32), line: oklch(0.7, 0.12, 85, 0.25), chip: oklch(0.75, 0.14, 85, 0.2), fg: oklch(0.84, 0.14, 85) },
  dry: { bgFrom: oklch(0.36, 0.09, 250, 0.32), line: oklch(0.7, 0.12, 250, 0.25), chip: oklch(0.75, 0.14, 250, 0.2), fg: oklch(0.84, 0.14, 250) },
  steady: { bgFrom: oklch(0.36, 0.09, 165, 0.32), line: oklch(0.7, 0.12, 165, 0.25), chip: oklch(0.75, 0.14, 165, 0.2), fg: oklch(0.84, 0.14, 165) },
} as const;

export type HueKey = keyof typeof HUE;

export const F = {
  serif: 'Newsreader_400Regular',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'Manrope_400Regular',
  sansMed: 'Manrope_500Medium',
  sansSemi: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  sansHeavy: 'Manrope_800ExtraBold',
  mono: 'JetBrainsMono_400Regular',
  monoSemi: 'JetBrainsMono_600SemiBold',
} as const;

export const R = {
  card: 22,
  row: 18,
  hero: 28,
  sheet: 30,
  chip: 13,
  pill: 999,
  btn: 16,
  field: 14,
} as const;

/** Tone → colour, mirroring the prototype's `.up` / `.down` / `.flat` classes. */
export function toneColor(tone: 'up' | 'down' | 'flat'): string {
  return tone === 'up' ? C.mint : tone === 'down' ? C.coral : C.dimmer;
}
