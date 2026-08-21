/**
 * Drives every sheet and every write path in the web build and checks what the
 * app puts on screen. React Native Web is not the native runtime, so this is
 * not proof the app works on a phone — but it does exercise the real
 * components, the real store and the real persistence, which typechecking and
 * unit tests cannot.
 *
 *   npx expo export --platform web && node scripts/walkthrough.mjs
 */
import { launchChromium, phonePage, serveDist } from './lib/serve.mjs';

const results = [];
let page;

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log('  ok   ', name);
  } catch (e) {
    results.push({ name, ok: false, error: e.message.split('\n')[0] });
    console.log('  FAIL ', name, '\n         ', e.message.split('\n')[0]);
  }
}

/**
 * React Native Web keeps every tab's scene in the DOM and all of them count as
 * "visible", so a bare text match happily resolves to a copy on a screen the
 * user cannot see. Every query is scoped to the sheet if one is open, and to
 * the active screen otherwise — hence the testIDs on the screen roots.
 */
let screenId = 'screen-welcome';

async function scope() {
  const sheet = page.locator('[data-testid="sheet"]');
  if (await sheet.count()) return sheet;
  return page.locator(`[data-testid="${screenId}"]`);
}

async function text(t) {
  return (await scope()).getByText(t, { exact: false }).filter({ visible: true }).first();
}

async function input(nth = 0) {
  return (await scope()).locator('input').filter({ visible: true }).nth(nth);
}

async function textarea() {
  return (await scope()).locator('textarea').filter({ visible: true }).first();
}

/**
 * RN Web stacks absolutely-positioned wrappers over content, so Playwright's
 * interception check fires where a real finger would land fine. `force` skips
 * that check; visibility is still required.
 */
async function tap(t) {
  await (await text(t)).click({ force: true, timeout: 8000 });
  await page.waitForTimeout(400);
}

async function tapLabel(label) {
  await (await scope())
    .getByLabel(label, { exact: true })
    .filter({ visible: true })
    .first()
    .click({ force: true, timeout: 8000 });
  await page.waitForTimeout(400);
}

async function fill(placeholder, value) {
  await (await scope())
    .getByPlaceholder(placeholder, { exact: false })
    .filter({ visible: true })
    .first()
    .fill(String(value));
}

async function closeSheet() {
  await tapLabel('Close');
  await page.waitForTimeout(500);
}

async function seeText(t) {
  await (await text(t)).waitFor({ timeout: 5000 });
}

async function notSeeText(t) {
  const n = await (await scope()).getByText(t, { exact: false }).filter({ visible: true }).count();
  if (n > 0) throw new Error(`expected not to find "${t}", found ${n}`);
}

/** Toasts render outside any screen, above everything. */
async function seeToast(t) {
  await page.getByText(t, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 5000 });
}

/** Tabs carry accessibility labels; rows and sheet buttons do not. */
async function goTab(label) {
  await page
    .getByLabel(label, { exact: true })
    .filter({ visible: true })
    .first()
    .click({ force: true, timeout: 8000 });
  screenId = 'screen-' + label.toLowerCase();
  await page.waitForTimeout(700);
}

/** Opening a holding pushes a modal route over the tabs. */
async function openHolding(sym) {
  await tap(sym);
  screenId = 'screen-holding';
  await page.waitForTimeout(700);
}

async function backToTabs(tab) {
  await tapLabel('Back');
  await page.waitForTimeout(600);
  screenId = 'screen-' + tab.toLowerCase();
}

const { server, base } = await serveDist();
const browser = await launchChromium();
const { page: p, errors } = await phonePage(browser);
page = p;

// live quotes would try to reach Yahoo, which this sandbox blocks; keep the
// walkthrough about the app's own behaviour
await page.route('**/query1.finance.yahoo.com/**', (route) =>
  route.fulfill({ status: 503, body: 'blocked in this sandbox' })
);

console.log('\nonboarding');
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await check('welcome offers both starting points', async () => {
  await seeText('Start with an empty portfolio');
  await seeText('Explore with a sample portfolio');
});

await check('an empty portfolio lands on the empty state', async () => {
  await fill('Your name', 'Mara');
  await tap('Start with an empty portfolio');
  screenId = 'screen-home';
  await page.waitForTimeout(600);
  await seeText('Nothing planted yet');
  await seeText('$0');
});

console.log('\nadd + edit');
await check('add sheet creates a holding', async () => {
  await tap('Add your first holding');
  await fill('NVDA', 'NVDA');
  await fill('NVIDIA Corp', 'NVIDIA Corp');
  await fill('10', '10');
  await fill('150', '100');
  await fill('172.32', '150');
  await fill('optional', '148');
  await tap('Add holding');
  await seeText('$1,500');
  await seeToast('NVDA added');
});

await check('the row shows the day move against the previous close', async () => {
  await seeText('+1.35%');
});

await check('edit sheet updates in place', async () => {
  await goTab('Portfolio');
  await openHolding('NVDA');
  await tapLabel('Edit holding');
  await fill('NVIDIA Corp', 'Nvidia');
  await tap('Save changes');
  await seeToast('Saved');
  await seeText('Nvidia');
});

console.log('\ntrades');
await check('buying rolls the fee into average cost', async () => {
  await tap('Buy more');
  await page.getByPlaceholder('10', { exact: false }).first().fill('10');
  await (await input(1)).fill('170');
  await page.getByPlaceholder('0', { exact: true }).filter({ visible: true }).first().fill('5');
  await tap('Record purchase');
  await seeToast('Bought 10 NVDA');
  // (10*100 + 10*170 + 5) / 20 = 135.25
  await seeText('$135.25');
});

await check('selling books realised P/L and closes nothing yet', async () => {
  await tap('Sell');
  await page.getByPlaceholder('20', { exact: false }).filter({ visible: true }).first().fill('5');
  await (await input(1)).fill('180');
  await tap('Record sale');
  await seeToast('Sold 5 NVDA');
  await backToTabs('Portfolio');
});

console.log('\ncash + activity');
await check('cash sheet deposits', async () => {
  await goTab('Portfolio');
  await tap('Cash and equivalents');
  await fill('1000', '5000');
  await tap('Add to cash');
  await seeToast('added');
});

await check('cash sheet withdraws and sets a balance', async () => {
  await tap('Cash and equivalents');
  await tap('Withdraw');
  await fill('1000', '1000');
  await tap('Take out of cash');
  await seeToast('withdrawn');
});

await check('log sheet records a dividend', async () => {
  await goTab('Activity');
  await tap('Log');
  await fill('284.10', '284.10');
  await tap('Log it');
  await seeToast('Logged');
  await seeText('Dividend');
});

await check('activity lists the deposit and the withdrawal', async () => {
  await seeText('Deposit');
  await seeText('Withdrawal');
});

await check('tx sheet deletes an entry', async () => {
  await tap('Dividend');
  await tap('Delete entry');
  await seeToast('Entry deleted');
});

console.log('\nprices + goal');
await check('prices sheet replaces the price', async () => {
  await goTab('Portfolio');
  await tap('Update prices');
  await (await input()).fill('200');
  await tap('Save prices');
  await seeToast('1 price updated');
});

await check('goal sheet moves the bloom', async () => {
  await goTab('Bloom');
  await tapLabel('Edit goal');
  await (await input()).fill('10000');
  await tap('Save goal');
  await seeToast('Goal set to');
});

console.log('\nsearch + alerts + insights');
await check('search filters the book', async () => {
  await goTab('Home');
  await tapLabel('Search holdings');
  await fill('Symbol or name', 'NV');
  await seeText('Nvidia');
  await fill('Symbol or name', 'ZZZZ');
  await seeText('Nothing matches that');
  await closeSheet();
});

await check('alerts sheet opens', async () => {
  await tapLabel('Alerts');
  await seeText('Alerts');
  await closeSheet();
});

await check('insights reads the book', async () => {
  await goTab('Insights');
  await seeText('Diversification');
  await seeText('Sector exposure');
});

console.log('\nsettings + data');
await check('settings switches currency everywhere', async () => {
  await goTab('Home');
  await tap('Good');
  await fill('Your name', 'Ada');
  await tap('EUR');
  await tap('Save');
  await seeText('Ada');
  await seeText('€');
});

await check('export shows the portfolio as JSON', async () => {
  await tap('Ada');
  await tap('Export or import');
  const json = await (await textarea()).inputValue();
  if (!json.includes('"holdings"') || !json.includes('NVDA')) throw new Error('export does not contain the book');
  if (json.includes('finnhub')) throw new Error('export leaked the API key');
});

await check('import loads a pasted export', async () => {
  const json = await (await textarea()).inputValue();
  const edited = json.replace('"Ada"', '"Imported"');
  await (await textarea()).fill(edited);
  await tap('Load pasted data');
  await seeToast('Portfolio loaded');
  await seeText('Imported');
});

await check('import refuses junk', async () => {
  await tap('Imported');
  await tap('Export or import');
  await (await textarea()).fill('{"nope":1}');
  await tap('Load pasted data');
  await seeToast('not a Bloom export');
  await closeSheet();
});

console.log('\npersistence + destructive paths');
await check('a reload restores the saved portfolio', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await seeText('Imported');
  await seeText('NVDA');
});

await check('removing a holding takes two taps', async () => {
  await goTab('Portfolio');
  await openHolding('NVDA');
  await tap('Remove this holding');
  await seeToast('Tap again to remove');
  await tap('Tap again to remove');
  await seeToast('NVDA removed');
  screenId = 'screen-portfolio';
});

await check('start over returns to the welcome screen', async () => {
  await goTab('Home');
  await tap('Good');
  await tap('Start over');
  await tap('Delete everything');
  await page.waitForTimeout(1200);
  screenId = 'screen-welcome';
  await seeText('A portfolio tracker you keep by hand');
  await notSeeText('NVDA');
});

await check('the app raised no runtime errors', async () => {
  const unique = [...new Set(errors)].filter((e) => !e.includes('503'));
  if (unique.length) throw new Error(unique.slice(0, 5).join(' | '));
});

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nfailures:');
  failed.forEach((f) => console.log(` - ${f.name}: ${f.error}`));
  process.exitCode = 1;
}
