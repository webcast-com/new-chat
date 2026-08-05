import { chromium as pwChromium } from 'playwright-core';
import sparticuz from '@sparticuz/chromium';
import { readFileSync } from 'node:fs';

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

// 1. Migration content
{
  const src = readFileSync('supabase/migrations/20260805000600_phase8_hardening.sql', 'utf8');
  check('Migration: messages/shares/comments indexes', src.includes('messages_sender_idx') && src.includes('messages_recipient_idx') && src.includes('shares_post_created_idx') && src.includes('comments_parent_idx'));
  check('Migration: reply notification trigger', src.includes('notify_comment_reply') && src.includes("'comment_reply'"));
  check('Migration: broadcast notification trigger', src.includes('notify_group_broadcast') && src.includes("'group_broadcast'"));
  check('Migration: member-added notification trigger', src.includes('notify_group_member_added') && src.includes("'group_invite'"));
  check('Migration: owner leave guard', src.includes('Members can leave groups') && src.includes('owner_id = auth.uid()'));
}

// 2. Edge fn no longer double-notifies
{
  const src = readFileSync('supabase/functions/group-broadcast/index.ts', 'utf8');
  check('Edge fn: DB trigger handles notifications', src.includes('DB trigger') && !src.includes('Broadcast sent to'));
}

// 3. App boots; bell serves new kinds; PostCard serves real report
{
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('App boots — no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  const app = await page.evaluate(async () => (await fetch('/src/App.tsx')).text());
  const postCard = await page.evaluate(async () => (await fetch('/src/components/PostCard.tsx')).text());
  const groups = await page.evaluate(async () => (await fetch('/src/components/Groups.tsx')).text());

  check('Bell includes group events + messages', app.includes('group_broadcast') && app.includes('group_invite') && app.includes('messaged you'));
  check('Bell emoji map covers new kinds', /['\"]📢['\"]/.test(app) && /['\"]👥['\"]/.test(app));
  check('PostCard: real moderation report', postCard.includes('moderation_reports') && postCard.includes('target_type'));
  check('Groups: dark mode variants', (groups.match(/dark:/g) || []).length >= 15, `${(groups.match(/dark:/g) || []).length} dark: classes`);
  await page.__browser.close();
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
