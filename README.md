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
npm test              # jest — domain logic, the store's actions, quote parsing
npm run doctor        # expo-doctor
npx expo export --platform ios --platform android

npx expo export --platform web
node scripts/walkthrough.mjs   # drives every sheet and every write path
node scripts/screenshot.mjs    # captures each screen
```

`scripts/walkthrough.mjs` starts from an empty portfolio and works through the app the way a person
would: add a holding, buy, sell, deposit, withdraw, log a dividend, update prices, move the goal,
switch currency, export, import, reload, delete, start over — checking what lands on screen at each
step and failing on any runtime error. It found the bug where *Start over* cleared your data but
left you on Home.

`scripts/screenshot.mjs` writes `screenshots/*.png` for a quick look. Both run against React Native
Web, which only approximates the native runtime — they catch broken behaviour and blank screens,
not pixel fidelity, and they are no substitute for running it on a phone.

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
`parseNum`'s handling of `1.234,56`. That layer is plain TypeScript, and it plus `src/store` is
where the tests point.

One deliberate fork: on web the sheets render in a plain panel rather than
`@gorhom/bottom-sheet`, which presents fine under React Native Web but will not dismiss there. The
sheet contents and the shell are identical; only the container differs, and only off-device.

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
