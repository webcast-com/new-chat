import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';

const BASE = 'http://localhost:5173';
const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  →  ' + detail : ''}`);
};

async function launchBrowser() {
  return pwChromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args, '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
    headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/stublibs' },
  });
}

async function newPage() {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.__browser = browser;
  page.setDefaultTimeout(15000);
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}
  return page;
}

// ── Game regression (guest): mounts, shows Player 1, profile modal works ──
{
  const page = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const play = page.getByText('Play', { exact: true }).first();
  await play.waitFor({ state: 'visible', timeout: 30000 });
  await play.click().catch(() => {});
  await page.waitForTimeout(2500);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  check('Game mounts (guest)', /Snakes|Ladders|Slitherer|Online Play/i.test(bodyText));
  check('Guest fallback "Player 1" still shown', /Player 1/.test(bodyText));

  // open profile modal → "+ New Player" visible for guests
  const profileBtn = page.locator('button:has-text("Player 1")').first();
  await profileBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  const modalText = await page.locator('body').innerText().catch(() => '');
  check('Guest profile modal has "+ New Player"', /\+ New Player/.test(modalText));
  check('Profile modal shows level/rank', /Lv\.\d|Level \d/.test(modalText));
  await page.__browser.close();
}

// ── No page errors during game flow ──
{
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const play = page.getByText('Play', { exact: true }).first();
  await play.waitFor({ state: 'visible', timeout: 30000 });
  await play.click().catch(() => {});
  await page.waitForTimeout(2000);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('Game flow: no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  await page.__browser.close();
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
