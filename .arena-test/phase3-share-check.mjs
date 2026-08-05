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

// 1. App boots with no JS errors; ShareButton module serves the in-app menu items
{
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);
  const relevant = errs.filter((e) => !/Failed to fetch|network/i.test(e));
  check('App boots — no JS errors', relevant.length === 0, relevant.slice(0, 3).join(' | '));

  const src = await page.evaluate(async () => {
    const res = await fetch('/src/components/ShareButton.tsx');
    return await res.text();
  });
  check('ShareButton serves "Repost to feed"', src.includes('Repost to feed'));
  check('ShareButton serves "Send in a chat"', src.includes('Send in a chat'));
  check('ShareButton serves "Send to a group"', src.includes('Send to a group'));
  check('ShareButton records target_type', src.includes('target_type'));
  await page.__browser.close();
}

// 2. SharedPostCard renders a post quote (mounted directly with a fake post)
{
  const page = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByText("Today's Free Bets", { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
  const out = await page.evaluate(async () => {
    const diag = {};
    try {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: reactDomClient } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const createRoot = reactDomClient.createRoot;
      const { default: SharedPostCard } = await import('/src/components/SharedPostCard.tsx');

      const mount = (props) => new Promise((resolve) => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const root = createRoot(el);
        root.render(React.createElement(SharedPostCard, props));
        setTimeout(() => resolve({ root, el }), 300);
      });

      const fakeProfile = { id: 'u1', username: 'jane', full_name: 'Jane', bio: '', avatar_url: '', county: null, constituency: null, location: null, age: null, work: null, education: null, gender: null, created_at: '', updated_at: '' };
      const fakePost = {
        id: 'p-original', user_id: 'u1', content: 'The original post content', image_url: 'https://img.test/thumb.jpg',
        media_type: 'image', likes_count: 0, comments_count: 0, shares_count: 0, created_at: new Date().toISOString(),
        profiles: fakeProfile,
      };

      const withPost = await mount({ post: fakePost });
      diag.withPostText = withPost.el.innerText;
      // LazyImage uses an IntersectionObserver — bring it into view so the img loads
      withPost.el.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 800));
      diag.withPostImg = withPost.el.querySelector('img')?.src || null;
      diag.mediaContainer = withPost.el.querySelector('.h-14') !== null;
      withPost.root.unmount();

      const withIdOnly = await mount({ postId: 'p-original' });
      await new Promise((r) => setTimeout(r, 900)); // fetch fails (network blocked) → renders null
      diag.idOnlyEmpty = withIdOnly.el.innerText.trim() === '';
      withIdOnly.root.unmount();
    } catch (e) {
      diag.error = String(e);
    }
    return diag;
  });
  if (out.error) {
    check('SharedPostCard renders a post quote', false, out.error);
  } else {
    check('SharedPostCard renders author + content', /Post by @jane/.test(out.withPostText) && /The original post content/.test(out.withPostText), out.withPostText.slice(0, 90).replace(/\n/g, ' | '));
    check('SharedPostCard shows thumbnail', out.withPostImg === 'https://img.test/thumb.jpg' || out.mediaContainer === true, `img=${out.withPostImg}, container=${out.mediaContainer}`);
    check('SharedPostCard fetch-fail renders nothing (no crash)', out.idOnlyEmpty === true);
  }
  await page.__browser.close();
}

console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
