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

const browser = await pwChromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: [...sparticuz.args, '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  headless: true,
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/stublibs' },
});

const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(20000);
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? route.continue() : route.abort();
});
try { await page.routeWebSocket('wss://**/*', (ws) => ws.close()); } catch {}

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });

const result = await page.evaluate(async () => {
  const out = {};
  const mod = await import('/src/lib/postMedia.ts');

  // ── 1. compressImage: large photo → smaller JPEG ──
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2400; canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 2400, 1600);
    grad.addColorStop(0, '#ff0000'); grad.addColorStop(0.5, '#00ff00'); grad.addColorStop(1, '#0000ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2400, 1600);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255 | 0},${Math.random() * 255 | 0},${Math.random() * 255 | 0},0.9)`;
      ctx.beginPath(); ctx.arc(Math.random() * 2400, Math.random() * 1600, 10 + Math.random() * 60, 0, Math.PI * 2); ctx.fill();
    }
    const pngBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const original = new File([pngBlob], 'big-photo.png', { type: 'image/png' });
    out.originalSize = original.size;

    const optimized = await mod.compressImage(original);
    out.optimizedSize = optimized.size;
    out.optimizedType = optimized.type;
    out.optimizedName = optimized.name;

    const bmp = await createImageBitmap(optimized);
    out.optimizedW = bmp.width; out.optimizedH = bmp.height;
    bmp.close();
  } catch (e) { out.compressError = String(e); }

  // ── 2. compressImage: small file returned untouched ──
  try {
    const small = new File([new Uint8Array(1024)], 'tiny.png', { type: 'image/png' });
    const r = await mod.compressImage(small);
    out.smallUntouched = r === small;
  } catch (e) { out.smallError = String(e); }

  // ── 3. compressImage: GIF untouched ──
  try {
    const gif = new File([new Uint8Array(3000000)], 'anim.gif', { type: 'image/gif' });
    const r = await mod.compressImage(gif);
    out.gifUntouched = r === gif;
  } catch (e) { out.gifError = String(e); }

  // ── 4. captureVideoPoster: generate a webm, capture frame, verify pixel ──
  try {
    const stream = document.createElement('canvas');
    stream.width = 640; stream.height = 360;
    stream.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(stream); // DOM-attached so the compositor paints frames
    const sctx = stream.getContext('2d');
    let frame = 0;
    const draw = () => {
      sctx.fillStyle = '#d32f2f'; // solid red background
      sctx.fillRect(0, 0, 640, 360);
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(200 + (frame % 100), 120, 80, 80); // moving white square
      frame++;
    };
    let running = true;
    const loop = () => { if (!running) return; draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    await new Promise((r) => setTimeout(r, 700)); // let it paint before recording
    const capture = stream.captureStream(30);
    let recorder = null;
    try {
      recorder = new MediaRecorder(capture, { mimeType: 'video/webm' });
    } catch {
      recorder = new MediaRecorder(capture);
    }
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => { recorder.onstop = res; });
    recorder.start();
    await new Promise((r) => setTimeout(r, 1500));
    recorder.stop();
    running = false;
    await stopped;
    stream.remove();
    const videoBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    out.videoMime = recorder.mimeType;
    out.videoSize = videoBlob.size;
    const videoFile = new File([videoBlob], 'test-video.webm', { type: recorder.mimeType || 'video/webm' });

    const posterBlob = await mod.captureVideoPoster(videoFile, 0.5);
    if (!posterBlob) {
      out.posterError = 'capture returned null';
    } else {
      out.posterSize = posterBlob.size;
      out.posterType = posterBlob.type;
      // sample the pixel color of the poster — should be red-ish, not black
      const url = URL.createObjectURL(posterBlob);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ictx = c.getContext('2d');
      ictx.drawImage(img, 0, 0);
      const px = ictx.getImageData(Math.floor(c.width * 0.15), Math.floor(c.height * 0.15), 1, 1).data;
      out.posterPixel = [px[0], px[1], px[2]];
      out.posterDim = [c.width, c.height];
      URL.revokeObjectURL(url);
    }
  } catch (e) { out.posterError = String(e); }

  // ── 5. validation still rejects unsupported types ──
  try {
    const bad = new File([new Uint8Array(100)], 'doc.pdf', { type: 'application/pdf' });
    const err = await mod.validatePostMedia(bad);
    out.badTypeRejected = typeof err === 'string';
  } catch (e) { out.badTypeError = String(e); }

  return out;
});

const r = result;
// 1. compression
check('compressImage: produces a JPEG', r.optimizedType === 'image/jpeg', r.optimizedType);
check('compressImage: ≤ 1.5 MB', r.optimizedSize <= 1.5 * 1024 * 1024, `orig=${(r.originalSize / 1048576).toFixed(2)}MB → opt=${(r.optimizedSize / 1048576).toFixed(2)}MB`);
check('compressImage: scaled to ≤ 1600px', r.optimizedW <= 1600 && r.optimizedH <= 1600, `${r.optimizedW}x${r.optimizedH}`);
check('compressImage: tiny file untouched', r.smallUntouched === true);
check('compressImage: GIF untouched', r.gifUntouched === true);
// 4. video poster
if (r.posterError) {
  check('captureVideoPoster: captured frame', false, r.posterError);
} else {
  check('captureVideoPoster: produces JPEG', r.posterType === 'image/jpeg', r.posterType);
  check('captureVideoPoster: poster has content (red-ish pixel)', r.posterPixel && r.posterPixel[0] > 150 && r.posterPixel[1] < 120, `pixel=${r.posterPixel}`);
  check('captureVideoPoster: poster is a real frame', r.posterSize > 1000, `${r.posterSize} bytes, ${r.posterDim}`);
}
// 5. validation
check('validatePostMedia: rejects unsupported type', r.badTypeRejected === true);

await browser.close();
console.log(`\n==== ${results.length - failures}/${results.length} passed ====`);
process.exit(failures ? 1 : 0);
