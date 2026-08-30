import { chromium } from 'playwright';

const urls = [
  { path: '/login', auth: false },
  { path: '/dashboard', auth: true },
  { path: '/farms/new', auth: true },
  { path: '/officer/day', auth: true },
];

async function auditViewport(width, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  console.log(`\n=== VIEWPORT ${width} ${label} ===`);
  for (const u of urls) {
    if (u.auth) {
      await page.goto('http://localhost:3000/login');
      await page.evaluate(async () => {
        await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@agaate.local', password: 'LocalAdminPassword-ChangeMe-123' }), credentials: 'include' });
      });
    }
    await page.goto(`http://localhost:3000${u.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const scrollW = doc.scrollWidth;
      const clientW = doc.clientWidth;
      const hasHoriz = scrollW > clientW + 1;
      const offenders = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > window.innerWidth + 1 && r.width < 10000) {
          const cs = getComputedStyle(el);
          if (cs.display !== 'none') {
            offenders.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,80), w: Math.round(r.width), left: Math.round(r.left) });
          }
        }
      });
      return { scrollW, clientW, hasHoriz, url: location.pathname, offenders: offenders.slice(0,5) };
    });
    const visible = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a.btn, .btn')).slice(0,5).map(b=>{
        const r=b.getBoundingClientRect();
        return { text: (b.textContent||'').trim().slice(0,30), w: Math.round(r.width), h: Math.round(r.height), visible: r.width>0&&r.height>0 };
      });
      return btns;
    });
    console.log(`${u.path}: scrollW ${overflow.scrollW} clientW ${overflow.clientW} hasHoriz:${overflow.hasHoriz} offenders:${JSON.stringify(overflow.offenders)} btns:${JSON.stringify(visible)}`);
  }
  await browser.close();
}

await auditViewport(390, "iPhone12");
await auditViewport(425, "SmallMobile");
await auditViewport(768, "Tablet");
console.log("\nAUDIT_DONE");
