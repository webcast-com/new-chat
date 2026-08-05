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

// 1. App boots (public feed) with no JS errors from the new comment code
{
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(20000);
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('App boots (public feed) — no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  await browser.close();
}

// 2. Deep-link hash handling is inert on boot (no crash with #comment- hash)
{
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(20000);
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/#comment-00000000-0000-0000-0000-000000000000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('Deep-link hash boots cleanly (no crash)', relevant.length === 0, relevant.slice(0, 3).join(' | '));
  await browser.close();
}

// 3. CommentSection renders in isolation (mount via a scratch route on the dev
//    server's module graph is not possible, so verify the module compiles and
//    the thread helper behaves in-browser)
{
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(20000);
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
  });
  try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(async () => {
    const mod = await import('/src/lib/commentThreads.ts');
    const c = (id, parent_id = null, minutesAgo = 0) => ({
      id, post_id: 'p1', user_id: 'u1', content: `c-${id}`, parent_id,
      created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    });
    const tree = mod.buildCommentTree([c('root', null, 5), c('r1', 'root', 4), c('r2', 'root', 2), c('top', null, 1)]);
    const root = tree.find(n => n.comment.id === 'root');
    return {
      topLevel: tree.length,
      replies: root ? root.replies.length : -1,
      count: mod.countReplies(tree),
      sorted: tree.map(n => n.comment.id).join(','),
    };
  });
  check('In-browser thread tree builds correctly', result.topLevel === 2 && result.replies === 2 && result.count === 2 && result.sorted === 'top,root', JSON.stringify(result));
  await browser.close();
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
