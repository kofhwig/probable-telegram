/**
 * Visual smoke check: serve the web export, walk the app at phone size and
 * capture each screen. React Native Web is an approximation of the native
 * result — this catches blank screens and layout breakage, not pixel fidelity.
 *
 *   npx expo export --platform web && node scripts/screenshot.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shots = join(root, 'screenshots');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = join(dist, decodeURIComponent(url.pathname));
  // expo-router exports a single-page shell; unknown routes fall back to it
  if (!existsSync(file) || !extname(file)) file = join(dist, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://localhost:${port}`;

await mkdir(shots, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
);
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

async function shot(name) {
  await page.waitForTimeout(1400);
  await page.screenshot({ path: join(shots, `${name}.png`) });
  console.log('shot', name);
}

await page.goto(base, { waitUntil: 'networkidle' });
await shot('01-welcome');

// take the sample portfolio so every screen has something to draw
await page.getByText('Explore with a sample portfolio').click();
await shot('02-home');

for (const [tab, name] of [
  ['Portfolio', '03-portfolio'],
  ['Bloom', '04-bloom'],
  ['Activity', '05-activity'],
  ['Insights', '06-insights'],
]) {
  await page.getByLabel(tab, { exact: true }).click();
  await shot(name);
}

// a holding, then a sheet
await page.getByLabel('Home', { exact: true }).click();
await page.waitForTimeout(600);
await page.getByText('NVDA', { exact: true }).first().click();
await shot('07-holding');

await page.goBack();
await page.waitForTimeout(600);
await page.getByLabel('Alerts').click();
await shot('08-alerts-sheet');

await browser.close();
server.close();

if (errors.length) {
  console.log('\nRuntime errors:');
  [...new Set(errors)].slice(0, 20).forEach((e) => console.log(' -', e));
  process.exitCode = 1;
} else {
  console.log('\nNo runtime errors.');
}
