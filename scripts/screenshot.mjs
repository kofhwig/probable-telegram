/**
 * Visual smoke check: serve the web export, walk the app at phone size and
 * capture each screen. React Native Web is an approximation of the native
 * result — this catches blank screens and layout breakage, not pixel fidelity.
 * For behaviour, see scripts/walkthrough.mjs.
 *
 *   npx expo export --platform web && node scripts/screenshot.mjs
 */
import { launchChromium, phonePage, serveDist, ROOT } from './lib/serve.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const shots = join(ROOT, 'screenshots');
const { server, base } = await serveDist();
const browser = await launchChromium();
const { page, errors } = await phonePage(browser);
await page.route('**/query1.finance.yahoo.com/**', (route) =>
  route.fulfill({ status: 503, body: 'blocked in this sandbox' })
);

await mkdir(shots, { recursive: true });
async function shot(name) {
  await page.waitForTimeout(1400);
  await page.screenshot({ path: join(shots, `${name}.png`) });
  console.log('shot', name);
}

await page.goto(base, { waitUntil: 'networkidle' });
await shot('01-welcome');

// take the sample portfolio so every screen has something to draw
await page.getByText('Explore with a sample portfolio').first().click({ force: true });
await shot('02-home');

for (const [tab, name] of [
  ['Portfolio', '03-portfolio'],
  ['Bloom', '04-bloom'],
  ['Activity', '05-activity'],
  ['Insights', '06-insights'],
]) {
  await page.getByLabel(tab, { exact: true }).filter({ visible: true }).first().click({ force: true });
  await shot(name);
}

// a holding, then a sheet
await page.getByLabel('Home', { exact: true }).filter({ visible: true }).first().click({ force: true });
await page.waitForTimeout(600);
await page.getByText('NVDA', { exact: true }).filter({ visible: true }).first().click({ force: true });
await shot('07-holding');

await page.goBack();
await page.waitForTimeout(600);
await page.getByLabel('Alerts').filter({ visible: true }).first().click({ force: true });
await shot('08-alerts-sheet');

await browser.close();
server.close();

const real = [...new Set(errors)].filter((e) => !e.includes('503'));
if (real.length) {
  console.log('\nRuntime errors:');
  real.slice(0, 20).forEach((e) => console.log(' -', e));
  process.exitCode = 1;
} else {
  console.log('\nNo runtime errors.');
}
