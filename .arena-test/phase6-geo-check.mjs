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
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.__browser = browser;
  page.setDefaultTimeout(20000);
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}
  return page;
}

// 1. App boots; modules serve Phase 6 features
{
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('App boots — no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  const geo = await page.evaluate(async () => (await fetch('/src/lib/geo.ts')).text());
  const profile = await page.evaluate(async () => (await fetch('/src/components/UserProfile.tsx')).text());
  const discovery = await page.evaluate(async () => (await fetch('/src/components/PeopleDiscovery.tsx')).text());
  const createPost = await page.evaluate(async () => (await fetch('/src/components/CreatePost.tsx')).text());

  check('geo.ts: haversine distance', geo.includes('distanceKm') && geo.includes('Math.asin'));
  check('geo.ts: county centroids', geo.includes('Nairobi City') && geo.includes('-1.29'));
  check('UserProfile: Detect my location button', profile.includes('Detect my location'));
  check('PeopleDiscovery: Near me (25 km) scope', discovery.includes('Near me (25 km)') && discovery.includes('distanceKm'));
  check('CreatePost: Around me option', createPost.includes('Around me (25 km)') && createPost.includes('near_me'));
  await page.__browser.close();
}

// 2. Geo math correctness (in-browser)
{
  const page = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  const out = await page.evaluate(async () => {
    const geo = await import('/src/lib/geo.ts');
    const r = {};
    // Nairobi → Mombasa ≈ 480 km
    r.nairobiMombasa = geo.distanceKm({ lat: -1.29, lng: 36.82 }, { lat: -4.05, lng: 39.66 });
    // Same point = 0
    r.samePoint = geo.distanceKm({ lat: -1.29, lng: 36.82 }, { lat: -1.29, lng: 36.82 });
    // detect county from Nairobi coords
    const detected = geo.detectCountyFromCoords(-1.29, 36.82);
    r.detectedCounty = detected?.county;
    r.detectDistance = detected?.distanceKm;
    // invalid point
    r.invalid = geo.isValidKenyaPoint({ lat: 45, lng: -100 });
    r.valid = geo.isValidKenyaPoint({ lat: -1.29, lng: 36.82 });
    r.formatNear = geo.formatDistanceKm(0.4);
    r.formatFar = geo.formatDistanceKm(123.4);
    return r;
  });
  check('distanceKm: Nairobi→Mombasa ≈ 480 km', out.nairobiMombasa > 400 && out.nairobiMombasa < 560, `${out.nairobiMombasa.toFixed(0)} km`);
  check('distanceKm: same point = 0', out.samePoint === 0);
  check('detectCountyFromCoords: Nairobi → Nairobi City', out.detectedCounty === 'Nairobi City', out.detectedCounty);
  check('detect: within 150 km', out.detectDistance < 150, `${out.detectDistance?.toFixed(0)} km`);
  check('isValidKenyaPoint: rejects far coords', out.invalid === false && out.valid === true);
  check('formatDistanceKm: near/far', out.formatNear === '400 m away' && out.formatFar === '123 km away', `${out.formatNear} | ${out.formatFar}`);
  await page.__browser.close();
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
