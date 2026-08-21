/**
 * Renders Bloom's app icons from SVG with the headless Chromium that ships in
 * this environment, so the artwork stays in source rather than as opaque PNGs.
 *
 *   node scripts/make-icons.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'assets');

// oklch -> sRGB, the same conversion the app uses at runtime
function gamma(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function oklch(l, c, h) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const to = (v) => Math.max(0, Math.min(255, Math.round(gamma(v) * 255)));
  const r = to(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = to(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const bl = to(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

const PINK = oklch(0.84, 0.1, 350);
const PINK_DEEP = oklch(0.72, 0.13, 342);
const INK = oklch(0.145, 0.026, 322);
const INK_TOP = oklch(0.26, 0.05, 332);

const PETAL_SMALL = 'M12 19.8C9.2 16.6 8.9 12 11 8.6a1.2 1.2 0 0 1 2 0c2.1 3.4 1.8 8-1 11.2Z';
const PETAL_LARGE = 'M12 19.8C8 16 7.6 9.6 10.7 5.1a1.6 1.6 0 0 1 2.6 0C16.4 9.6 16 16 12 19.8Z';

/** The lotus mark, scaled to fill `size` at `scale` of the canvas. */
function lotus(fill, scale) {
  return `
    <g transform="translate(50 50) scale(${scale}) translate(-12 -13)">
      <g fill="url(#petal)">
        <path d="${PETAL_SMALL}" transform="rotate(-76 12 19.8)"/>
        <path d="${PETAL_SMALL}" transform="rotate(76 12 19.8)"/>
        <path d="${PETAL_LARGE}" transform="rotate(-38 12 19.8)"/>
        <path d="${PETAL_LARGE}" transform="rotate(38 12 19.8)"/>
        <path d="${PETAL_LARGE}"/>
      </g>
    </g>
    <defs>
      <linearGradient id="petal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${fill[0]}"/>
        <stop offset="100%" stop-color="${fill[1]}"/>
      </linearGradient>
    </defs>`;
}

function page(svg, size, background) {
  return `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${background}">
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${svg}</svg>
  </body></html>`;
}

const TARGETS = [
  {
    file: 'icon.png',
    size: 1024,
    background: 'transparent',
    svg: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${INK_TOP}"/><stop offset="100%" stop-color="${INK}"/>
          </linearGradient></defs>
          <rect width="100" height="100" fill="url(#bg)"/>
          <circle cx="50" cy="46" r="30" fill="${PINK}" opacity="0.12"/>
          ${lotus([`#ffffff`, PINK], 2.6)}`,
  },
  {
    // Android masks this to a circle/squircle, so the mark sits in the safe centre
    file: 'android-icon-foreground.png',
    size: 1024,
    background: 'transparent',
    svg: lotus([`#ffffff`, PINK], 1.9),
  },
  {
    file: 'android-icon-background.png',
    size: 1024,
    background: 'transparent',
    svg: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${INK_TOP}"/><stop offset="100%" stop-color="${INK}"/>
          </linearGradient></defs><rect width="100" height="100" fill="url(#bg)"/>`,
  },
  {
    file: 'android-icon-monochrome.png',
    size: 1024,
    background: 'transparent',
    svg: lotus(['#ffffff', '#ffffff'], 1.9),
  },
  {
    file: 'splash-icon.png',
    size: 512,
    background: 'transparent',
    svg: lotus([`#ffffff`, PINK_DEEP], 2.9),
  },
  {
    file: 'favicon.png',
    size: 96,
    background: 'transparent',
    svg: `<rect width="100" height="100" rx="22" fill="${INK}"/>${lotus(['#ffffff', PINK], 2.4)}`,
  },
];

// this environment ships its own Chromium; fall back to it when the bundled
// build for the installed Playwright is not present
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
);
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
mkdirSync(out, { recursive: true });

for (const t of TARGETS) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: t.size, height: t.size });
  await p.setContent(page(t.svg, t.size, t.background));
  await p.screenshot({ path: resolve(out, t.file), omitBackground: true });
  await p.close();
  console.log('wrote', t.file, `${t.size}×${t.size}`);
}

await browser.close();
