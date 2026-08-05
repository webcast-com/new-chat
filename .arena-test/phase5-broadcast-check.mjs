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

// 1. App boots; Groups module serves broadcast features
{
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('App boots — no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  const src = await page.evaluate(async () => (await fetch('/src/components/Groups.tsx')).text());
  check('Groups has broadcast composer', src.includes('sendBroadcast') && src.includes('Send broadcast'));
  check('Groups has broadcast rendering', /kind === ['"]broadcast['"]/.test(src) && src.includes('Megaphone'));
  check('Groups has broadcast mute toggle', src.includes('toggleBroadcastMute') && src.includes('broadcast_muted'));
  check('Groups calls group-broadcast edge fn', /invoke\(['"]group-broadcast['"]/.test(src));
  await page.__browser.close();
}

// 2. Edge function exists with role checks + push loop
{
  const fs = await import('node:fs');
  const path = 'supabase/functions/group-broadcast/index.ts';
  const src = fs.readFileSync(path, 'utf8');
  check('Edge fn: owner/admin gate', src.includes('Only group owners and admins can broadcast') && /\[['"]owner['"],\s*['"]admin['"]\]/.test(src));
  check('Edge fn: inserts broadcast kind', src.includes('kind: "broadcast"') && src.includes('broadcast_by'));
  check('Edge fn: pushes to non-muted members', src.includes('broadcast_muted') && src.includes('push_subscriptions') && src.includes('sendWebPush'));
  check('Edge fn: VAPID optional (graceful)', src.includes('vapidPublicKey && vapidPrivateKey'));
}

// 3. Migration covers schema + RLS
{
  const fs = await import('node:fs');
  const src = fs.readFileSync('supabase/migrations/20260805000400_phase5_group_broadcast.sql', 'utf8');
  check('Migration: kind column', src.includes("kind text not null default 'message'") && src.includes("check (kind in ('message', 'broadcast'))"));
  check('Migration: broadcast_by', src.includes('broadcast_by uuid'));
  check('Migration: broadcast_muted', src.includes('broadcast_muted boolean not null default false'));
  check('Migration: RLS restricts broadcasts', src.includes("kind <> 'broadcast'") && src.includes("role in ('owner', 'admin')"));
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
