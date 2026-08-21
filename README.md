# Bloom

A portfolio tracker you keep by hand. Add what you own, update prices when you like, and watch the
tree fill in.

Bloom started as a single-file HTML prototype (kept at [`reference/bloom.html`](reference/bloom.html)
for comparison). This repository is that prototype rebuilt as a real iOS and Android app with Expo
and React Native — same numbers, same screens, native chrome.

## Running it

```bash
npm install
npx expo start        # then open in Expo Go, or press i / a for a simulator
```

Building installable binaries needs EAS (no Android SDK or Xcode is required locally):

```bash
npx eas build --profile preview --platform android   # APK you can sideload
npx eas build --profile production --platform ios
```

## Checks

```bash
npm run typecheck     # tsc --noEmit
npm test              # jest — domain logic and quote parsing
npm run doctor        # expo-doctor
npx expo export --platform ios --platform android
```

`scripts/screenshot.mjs` exports the app for web, walks it at phone size and writes
`screenshots/*.png`. React Native Web only approximates the native result, so treat it as a smoke
test for blank screens and layout breakage, not for pixel fidelity.

`scripts/make-icons.mjs` regenerates the launcher icons and splash mark from SVG, so the artwork
stays in source rather than as opaque binaries.

## How it is put together

```
app/                    expo-router routes
  _layout.tsx           fonts, providers, onboarding gate, dark navigation theme
  welcome.tsx           onboarding
  (tabs)/               home · portfolio · bloom · activity · insights, with the raised lotus tab
  holding/[id].tsx      holding detail, as a modal route
src/
  domain/               types, formatting, portfolio maths, sample data — no React, no UI
  store/                AsyncStorage persistence and the portfolio context
  quotes/               provider interface, Yahoo and Finnhub adapters, refresh logic
  components/           icons, charts, the tree, petals, toasts, shared primitives
  sheets/               the sheet host and the twelve bottom sheets
  theme/                the prototype's oklch palette, converted for React Native
```

Everything numeric lives in `src/domain` and is ported unchanged from the prototype — the
diversification score, the alert thresholds, the average-cost and realised-P/L maths, even
`parseNum`'s handling of `1.234,56`. That layer is plain TypeScript and is where the tests point.

### Your data

Stays on the device, under the same `bloom:portfolio:v1` key and the same JSON shape the prototype
used, so **a portfolio exported from the HTML version imports straight into the app**. Settings →
Export or import gives you the JSON, a share sheet, and a file picker to load one back.

### Live prices

Off by default for nothing — it ships on, and you can turn it off in Settings.

- **Yahoo Finance** is the default and needs no API key. It is not a documented public API, so
  treat an occasional failure as ordinary.
- **Finnhub** works if you paste an API key; the key is stored in the device keychain, never in
  your export.

Prices refresh when you pull down on Home or Portfolio, when you tap *Fetch live prices* in the
prices sheet, and once when the app opens. A holding that cannot be quoted keeps whatever price you
typed, and the app stays fully usable with live prices off — hand-entered prices remain the source
of truth.

Crypto is quoted as a pair, so `BTC` is asked for as `BTC-USD`. Any holding can override what gets
requested with the **Quote symbol** field (`VOD.L`, `BTC-EUR`, and so on).

## Notes

- Motion respects the system "reduce motion" setting: the petals stop falling and the blossoms stop
  opening.
- The fake phone frame, the drawn status bar and the desktop background orbs from the prototype are
  gone. The operating system provides those now.
