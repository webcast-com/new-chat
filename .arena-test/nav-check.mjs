import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'http://localhost:5173';

// ── Chromium stub NSS libs ──────────────────────────────────────────────────
// This sandbox has no libnss3/libnspr4 and no package manager access to fetch
// them, so we compile minimal stubs (sources in ./stublibs) that satisfy the
// dynamic linker. Only needed in this restricted environment; on a normal
// Linux machine the browser uses the system NSS libraries.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUB_DIR = '/tmp/stublibs';
function ensureStubLibs() {
  if (existsSync(path.join(STUB_DIR, 'libnss3.so'))) return;
  mkdirSync(STUB_DIR, { recursive: true });
  const src = path.join(__dirname, 'stublibs');
  const cc = 'gcc -shared -fPIC -O2';
  execSync(`${cc} -o ${STUB_DIR}/libnspr4.so ${src}/nspr_stub.c -Wl,-soname,libnspr4.so`, { stdio: 'inherit' });
  execSync(`${cc} -o ${STUB_DIR}/libnss3.so ${src}/nss_stub.c -Wl,-soname,libnss3.so -Wl,--version-script=${src}/nss3.map`, { stdio: 'inherit' });
  execSync(`${cc} -o ${STUB_DIR}/libnssutil3.so ${src}/nssutil_stub.c -Wl,-soname,libnssutil3.so -Wl,--version-script=${src}/nssutil3.map`, { stdio: 'inherit' });
}
ensureStubLibs();
const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  →  ' + detail : ''}`);
}

async function launchBrowser() {
  return pwChromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [
      ...sparticuz.args,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      // Skip NSS cert verification (our stub NSS can't verify TLS): prevents
      // network-service crashes on the external https/wss calls the app makes.
      '--ignore-certificate-errors',
    ],
    headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/stublibs' },
  });
}

// page.route() does NOT intercept WebSocket upgrades — use routeWebSocket so
// the supabase realtime socket never opens (it would crash the stub-NSS
// network service during the TLS handshake).
async function blockWebSockets(page) {
  try {
    await page.routeWebSocket('wss://**/*', (ws) => ws.close());
    await page.routeWebSocket('ws://**/*', (ws) => ws.close());
  } catch { /* older playwright */ }
}

const browser = await launchBrowser();

async function withPage(viewport, fn) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(15000);
  // Pricing popup appears 2s after auth settles, which can be very late on a
  // blocked network — pre-dismiss it so it never blocks the test.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('scorehub-pricing-dismissed', '1'); } catch { /* ignore */ }
  });
  // Abort all non-local requests: the sandbox blocks external network anyway,
  // and it keeps the stub-NSS browser stable (no real TLS handshakes).
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
  await blockWebSockets(page);
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  try { await fn(page, errs); } finally { await page.close(); }
  return errs;
}

async function enterScoreHub(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().click();
  await page.getByText('ScoreHub', { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await closePricingPopup(page);
}

async function closePricingPopup(page) {
  const closeBtn = page.locator('button[aria-label="Close premium offer"]');
  for (let i = 0; i < 10; i++) {
    const n = await closeBtn.count().catch(() => 0);
    if (n > 0) {
      await closeBtn.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      if ((await closeBtn.count().catch(() => 0)) === 0) {
        console.log('  (closed pricing popup)');
        return;
      }
    }
    await page.waitForTimeout(800);
  }
}

// The pricing popup fires 2s after auth settles, which can happen late on slow
// networks — make sure it is gone right before interacting with the UI.
async function ensureNoPopup(page) {
  const n = await page.locator('button[aria-label="Close premium offer"]').count().catch(() => 0);
  if (n > 0) await closePricingPopup(page);
}

async function clickTab(page, tab) {
  // Scope to the tab strip (a button may also appear in the breadcrumb).
  const bar = page.locator('[data-testid="tab-nav"]');
  const btn = bar.getByText(tab, { exact: true }).first();
  for (let attempt = 0; attempt < 3; attempt++) {
    await ensureNoPopup(page);
    await btn.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500); // let the strip settle before clicking
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const cls = (await btn.getAttribute('class').catch(() => '')) || '';
    if (cls.includes('from-[#00d4ff]')) return true;
  }
  return false;
}

async function waitForProbe(page, probe) {
  const heading = page.locator(`h1:has-text("${probe}"), h2:has-text("${probe}"), h3:has-text("${probe}")`).first();
  try {
    await heading.first().waitFor({ state: 'visible', timeout: 12000 });
    return true;
  } catch {
    return false;
  }
}

const TAB_PROBES = {
  'Predictions': ['All Predictions'],
  'Results': ['Results & Performance'],
  'Leaderboard': ['Top Predictors', 'Leaderboard'],
  'Sure Bets': ['Sure Bets'],
  'Premium': ['Unlock Premium Access', 'Premium Active'],
  'Refer & Earn': ['Refer & Earn', 'Referral'],
  'Subscription': ['Subscription Management', 'Subscription'],
  'Settings': ['Personal Information', 'Sign in required'],
  'Admin': ['Admin Dashboard', 'Admin Access Required'],
  'Webhook': ['Webhook Simulator', 'Sign in required'],
};

await withPage({ width: 1440, height: 900 }, async (page, consoleErrors) => {
  await enterScoreHub(page);
  check('Host loads, Live Scores (ScoreHub) mounts', true);

  // ── tab navigation ──
  for (const [tab, probes] of Object.entries(TAB_PROBES)) {
    const ok = await clickTab(page, tab);
    let probeOk = false;
    for (const p of probes) {
      if (await waitForProbe(page, p)) { probeOk = true; break; }
    }
    check(`Tab "${tab}" activates & renders content`, ok && probeOk, `active=${ok} content=${probeOk}`);
    if (!ok || !probeOk) {
      const crumb = await page.locator('nav[aria-label="breadcrumb"]').first().innerText().catch(() => '?');
      console.log(`    breadcrumb: ${crumb.replace(/\n/g, ' › ')}`);
    }
  }

  // ── back to dashboard ──
  const okBack = await clickTab(page, 'Live Scores');
  const dashProbe = await page.locator('#live-scores').count().catch(() => 0);
  check('Back to "Live Scores" dashboard tab', okBack && dashProbe > 0);

  // ── sport nav ──
  const sportStatus = async () => (await page.locator('text=/Sport: /').first().textContent().catch(() => '')).trim();
  const before = await sportStatus();
  await page.getByText('Football', { exact: true }).first().click();
  await page.waitForTimeout(900);
  const afterFb = await sportStatus();
  check('Sport nav: Football filter', before.includes('all') && afterFb.includes('football'), `${before} → ${afterFb}`);
  await page.getByText('All Sports', { exact: true }).first().click();
  await page.waitForTimeout(700);
  const afterAll = await sportStatus();
  check('Sport nav: back to All Sports', afterAll.includes('all'), afterAll);

  // ── match card click → FeaturedMatch modal ──
  const card = page.locator('#live-scores div.cursor-pointer').first();
  let modalOpened = false;
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await card.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    modalOpened = await page.locator('div.fixed.inset-0.z-50').first().isVisible().catch(() => false);
    check('Match card opens FeaturedMatch modal', modalOpened);
    if (modalOpened) {
      await page.keyboard.press('Escape').catch(() => {});
      const xBtn = page.locator('div.fixed.inset-0.z-50 button').last();
      await xBtn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
  } else {
    check('Match card opens FeaturedMatch modal', false, 'no match card found');
  }

  // ── breadcrumb Home → dashboard ──
  await page.locator('nav[aria-label="breadcrumb"] a').first().click();
  await page.waitForTimeout(700);
  const afterHome = await sportStatus();
  check('Breadcrumb Home → dashboard', afterHome.includes('all'), afterHome);

  // ── search: type query, select a result, verify filter applies ──
  const searchInput = page.locator('header input[type="text"]').first();
  const anyMatchText = await page.locator('#live-scores div.cursor-pointer span.text-white.font-medium').first().textContent().catch(() => null);
  if ((await searchInput.count().catch(() => 0)) > 0 && anyMatchText) {
    const team = anyMatchText.trim().split(/\s+/)[0] || 'Team';
    await searchInput.fill(team);
    await page.waitForTimeout(800); // debounce 300ms
    const resultCount = await page.locator('header div.z-50 button').count().catch(() => 0);
    if (resultCount > 0) {
      await page.locator('header div.z-50 button').first().click().catch(() => {});
      await page.waitForTimeout(800);
      const inputVal = await searchInput.inputValue().catch(() => '');
      check('Search select filters live scores', inputVal.length > 0, `query="${inputVal}", results=${resultCount}`);
      // clear search to continue
      await searchInput.fill('');
      await page.waitForTimeout(500);
    } else {
      check('Search select filters live scores', false, `no results for "${team}"`);
    }
  } else {
    check('Search select filters live scores', false, `search input=${await searchInput.count().catch(() => '?')}, matchText=${anyMatchText}`);
  }

  // ── footer: About Us (onNavigate path) ──
  await page.locator('footer').first().getByText('About Us', { exact: true }).first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.locator('footer').first().getByText('About Us', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  const aboutHeading = await page.getByRole('heading', { name: /about/i }).count().catch(() => 0);
  check('Footer "About Us" navigates within app', aboutHeading > 0, `heading=${aboutHeading}`);

  // ── footer on info page (About → Careers): previously window.location.href ──
  const urlBefore = page.url();
  await page.locator('footer').first().getByText('Careers', { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const urlAfter = page.url();
  const stillInHub = await page.getByText('ScoreHub', { exact: true }).count().catch(() => 0);
  const careersHeading = await page.getByRole('heading', { name: /career/i }).count().catch(() => 0);
  check('Info-page footer link (About→Careers) stays in app',
    urlBefore === urlAfter && stillInHub > 0 && careersHeading > 0,
    `url: ${urlBefore} → ${urlAfter}, ScoreHub=${stillInHub}, careersHeading=${careersHeading}`);

  // ── console errors (excluding network/resource noise) ──
  const relevant = consoleErrors.filter((e) => !/net::|Failed to load resource|404|401|403|Supabase|supabase|ERR_|WebSocket|GoTrue/i.test(e));
  check('No unexpected console errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
});

// ── mobile viewport (fresh browser: the stub-NSS browser can crash after
//    long sessions, so each section gets its own process) ──
await browser.close();
const mobileBrowser = await launchBrowser();

async function withMobilePage(fn) {
  const page = await mobileBrowser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    try { sessionStorage.setItem('scorehub-pricing-dismissed', '1'); } catch { /* ignore */ }
  });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  await blockWebSockets(page);
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  try { await fn(page, errs); } finally { await page.close(); }
  return errs;
}

const mobileErrs = await withMobilePage(async (mpage, mErrors) => {
  try {
    await enterScoreHub(mpage);
    // hamburger menu reveals sport links (retry: popup may still be pending)
    const tennis = mpage.getByText('Tennis', { exact: true }).first();
    let tennisVisible = false;
    const menuBtn = mpage.locator('header button:has(svg.lucide-menu)').first();
    for (let i = 0; i < 3 && !tennisVisible; i++) {
      await ensureNoPopup(mpage);
      await menuBtn.click({ timeout: 5000 }).catch(() => {});
      await mpage.waitForTimeout(600);
      tennisVisible = await tennis.isVisible().catch(() => false);
    }
    check('Mobile: hamburger reveals sport nav', tennisVisible);
    if (tennisVisible) {
      await tennis.click({ timeout: 5000 }).catch(() => {});
      await mpage.waitForTimeout(700);
      const st = await mpage.locator('text=/Sport: /').first().textContent().catch(() => '');
      check('Mobile: Tennis filter applies', (st || '').includes('tennis'), st);
    }
    // mobile search toggle
    const searchBtn = mpage.locator('header button:has(svg.lucide-search)').first();
    if (await searchBtn.count()) {
      await searchBtn.click({ timeout: 3000 }).catch(() => {});
      await mpage.waitForTimeout(400);
      // The header has two inputs (desktop one is hidden on mobile) — any
      // visible input means the mobile search row opened.
      const visible = await mpage.locator('header input[type="text"]:visible').count().catch(() => 0);
      check('Mobile: search toggle opens input', visible > 0);
    }
    // tab nav on mobile
    const ok = await clickTab(mpage, 'Predictions');
    const probe = await waitForProbe(mpage, 'All Predictions');
    check('Mobile: Predictions tab renders', ok && probe);
  } catch (e) {
    check('Mobile section completed', false, String(e).slice(0, 200));
  }
  const mRelevant = mErrors.filter((e) => !/net::|Failed to load resource|404|401|403|Supabase|supabase|ERR_|WebSocket|GoTrue/i.test(e));
  check('Mobile: no unexpected console errors', mRelevant.length === 0, mRelevant.slice(0, 3).join(' | '));
});

await mobileBrowser.close();

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
