/**
 * Shared plumbing for the browser scripts: serve `dist/` and launch the
 * Chromium this environment provides.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIST = join(ROOT, 'dist');

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

/** Static server for the web export, with the single-page fallback expo-router needs. */
export async function serveDist() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/index.html is missing — run `npx expo export --platform web` first');
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = join(DIST, decodeURIComponent(url.pathname));
    if (!existsSync(file) || !extname(file)) file = join(DIST, 'index.html');
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://localhost:${server.address().port}` };
}

/** The bundled Playwright build is often absent here; PLAYWRIGHT_CHROMIUM_PATH points at the local one. */
export function launchChromium() {
  return chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
  );
}

/** A phone-shaped page that records anything the app throws. */
export async function phonePage(browser) {
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
    if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) errors.push(m.text());
  });
  return { ctx, page, errors };
}
