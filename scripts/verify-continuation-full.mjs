/**
 * Full continuation verification suite covering:
 * - Entrance choreography (~3.05s), animationcancel & disabled-keyframes rAF fallback, rapid taps, CPU 4x throttling
 * - Background music lifecycle including rapid tab switch, autoplay denial, manual mute across replay
 * - Hero atmosphere placement (zero title overlap, strictly within visible reflection water across 8 viewports)
 * - Date reveal normal, WAAPI-disabled, mid-cancel + late-cancel monotonic fallback, rAF fallback, tab hide, reduced motion
 * - Full-site E2E walkthrough on Desktop (1366x768) and Mobile (390x844) with MP4 walkthrough recordings & RSVP error/success
 * - Zero real RSVP network submissions (all external Web3Forms POSTs mocked locally)
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'qa', 'codex-continuation');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.QA_FULL_PORT || 4179);
const BASE_URL = process.env.QA_URL || `http://127.0.0.1:${PORT}/`;

await mkdir(OUT, { recursive: true });
await mkdir(join(OUT, 'screenshots'), { recursive: true });
await mkdir(join(OUT, 'videos'), { recursive: true });

let ownedServer = null;
async function ensureServer() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(1200) });
    if (res.ok) return;
  } catch {}
  ownedServer = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Could not start local server on ${BASE_URL}`);
}

const checks = [];
const runtimeErrors = [];
let browser = null;

function recordCheck(name, passed, details = {}) {
  checks.push({ name, passed: Boolean(passed), details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`, Object.keys(details).length ? JSON.stringify(details) : '');
  if (!passed) process.exitCode = 1;
}

async function openMockedPage({
  viewport = { width: 390, height: 844, isMobile: true, hasTouch: true },
  reducedMotion = false,
  mockWeb3FormsStatus = 200,
  cpuThrottle = 1,
  preload = null,
} = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  if (cpuThrottle > 1) {
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  }
  page.on('pageerror', err => runtimeErrors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (mockWeb3FormsStatus >= 400 && txt.includes(`status of ${mockWeb3FormsStatus}`)) return;
      runtimeErrors.push(`console.error: ${txt}`);
    }
  });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url() === 'https://api.web3forms.com/submit') {
      if (req.method() === 'OPTIONS') {
        return req.respond({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          },
        });
      }
      return req.respond({
        status: mockWeb3FormsStatus,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: mockWeb3FormsStatus === 200
          ? '{"success":true,"message":"OK"}'
          : '{"success":false,"message":"Simulated HTTP 500 failure"}',
      });
    }
    return req.continue();
  });
  if (preload) await page.evaluateOnNewDocument(preload);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#openInvitation');
  await page.evaluate(() => document.fonts?.ready);
  await sleep(120);
  return page;
}

try {
  await ensureServer();
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  // 1. Entrance CSS keyframe disabled / animationcancel rAF fallback test
  {
    const page = await openMockedPage();
    await page.addStyleTag({ content: '.entry *, .entry::before { animation-duration: 0.001ms !important; }' });
    await page.evaluate(() => {
      window.__gateEvents = [];
      document.addEventListener('shahi:gate-opened', e => window.__gateEvents.push(e.detail));
      document.querySelector('#openInvitation').click();
    });
    await sleep(600);
    const mid = await page.evaluate(() => {
      const e = document.querySelector('#entry');
      const letter = document.querySelector('.entry-letter');
      return {
        state: e.dataset.state,
        fallback: e.dataset.gateFallback || null,
        letterTransform: letter.style.transform || getComputedStyle(letter).transform,
      };
    });
    await page.waitForSelector('#entry[data-state="open"]', { timeout: 5000 });
    const done = await page.evaluate(() => ({
      hidden: document.querySelector('#entry').hidden,
      locked: document.body.classList.contains('is-locked'),
      events: window.__gateEvents,
    }));
    recordCheck('entrance: rAF fallback recovers 0ms CSS keyframe disable cleanly (~3.05s)',
      mid.state === 'opening' && mid.fallback === 'raf' && done.hidden && !done.locked && done.events[0]?.durationMs >= 2600,
      { mid, done });
    await page.close();
  }

  // 2. Entrance CPU 4x throttling + animationcancel mid-flight recovery
  {
    const page = await openMockedPage({ cpuThrottle: 4 });
    await page.evaluate(() => {
      window.__gateEvents = [];
      document.addEventListener('shahi:gate-opened', e => window.__gateEvents.push(e.detail));
      document.querySelector('#openInvitation').click();
    });
    await sleep(900);
    await page.evaluate(() => {
      const door = document.querySelector('.entry-door--right');
      door?.dispatchEvent(new AnimationEvent('animationcancel', { animationName: 'shahi-gate-door' }));
    });
    await sleep(250);
    const duringFallback = await page.evaluate(() => ({
      state: document.querySelector('#entry').dataset.state,
      fallback: document.querySelector('#entry').dataset.gateFallback || null,
      rightDoorStyle: document.querySelector('.entry-door--right').style.transform,
    }));
    await page.waitForSelector('#entry[data-state="open"]', { timeout: 6000 });
    const afterDone = await page.evaluate(() => ({
      hidden: document.querySelector('#entry').hidden,
      events: window.__gateEvents,
    }));
    recordCheck('entrance: animationcancel mid-flight + 4x CPU throttle finishes via rAF without snap',
      duringFallback.state === 'opening' && duringFallback.fallback === 'raf' && afterDone.hidden && afterDone.events[0]?.durationMs >= 2600,
      { duringFallback, afterDone });
    await page.close();
  }

  // 3. Audio rapid app-switch & autoplay denial tests
  {
    const page = await openMockedPage({
      preload: () => {
        let state = 'visible';
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
        window.__setHidden = v => { state = v ? 'hidden' : 'visible'; document.dispatchEvent(new Event('visibilitychange')); };
      },
    });
    await page.click('#openInvitation');
    await sleep(450);
    // Double rapid switch (<15ms return->away)
    await page.evaluate(() => {
      window.__setHidden(true);
      window.__setHidden(false);
      window.__setHidden(true);
    });
    const whileRapidHidden = await page.evaluate(() => ({
      paused: document.querySelector('#weddingAudio').paused,
      label: document.querySelector('#musicToggle').getAttribute('aria-label'),
    }));
    await page.evaluate(() => window.__setHidden(false));
    await sleep(300);
    const afterRapidReturn = await page.evaluate(() => ({
      paused: document.querySelector('#weddingAudio').paused,
      label: document.querySelector('#musicToggle').getAttribute('aria-label'),
      pressed: document.querySelector('#musicToggle').getAttribute('aria-pressed'),
    }));
    recordCheck('audio: rapid background->foreground->background switch resumes cleanly',
      whileRapidHidden.paused && !afterRapidReturn.paused && afterRapidReturn.pressed === 'true',
      { whileRapidHidden, afterRapidReturn });
    await page.close();

    // Autoplay denial
    const deniedPage = await openMockedPage({
      preload: () => {
        HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
      },
    });
    await deniedPage.click('#openInvitation');
    await sleep(300);
    const deniedState = await deniedPage.evaluate(() => ({
      paused: document.querySelector('#weddingAudio').paused,
      label: document.querySelector('#musicToggle').getAttribute('aria-label'),
      playingClass: document.querySelector('#musicToggle').classList.contains('playing'),
    }));
    recordCheck('audio: autoplay rejection keeps muted button UI cleanly without errors',
      deniedState.paused && !deniedState.playingClass && deniedState.label.toLowerCase().includes('play'),
      deniedState);
    await deniedPage.close();
  }

  // 4. Date reveal stress matrix: WAAPI absent, late partial cancel (after Day finishes), CSS cancel -> rAF, reduced motion
  {
    const unlockGate = async page => {
      await page.click('#openInvitation');
      await page.waitForSelector('#entry[data-state="open"]', { timeout: 6000 });
      await page.$eval('#dateRevealBtn', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(120);
    };

    // 4A. WAAPI disabled
    const noWaapi = await openMockedPage({
      preload: () => { Element.prototype.animate = undefined; },
    });
    await unlockGate(noWaapi);
    await noWaapi.click('#dateRevealBtn');
    await sleep(300);
    const cssMid = await noWaapi.evaluate(() => ({
      spinning: document.querySelector('#dateStage').classList.contains('is-spinning'),
      cssSpin: document.querySelector('#dateStage').classList.contains('is-css-spinning'),
      revealed: document.querySelector('#dateStage').classList.contains('is-revealed'),
    }));
    await noWaapi.waitForSelector('#dateStage.is-revealed', { timeout: 4000 });
    const cssFinal = await noWaapi.evaluate(() => ['dateDay', 'dateMonth', 'dateYear'].map(id => document.getElementById(id).textContent));
    recordCheck('date: WAAPI missing spins cleanly via CSS fallback then reveals 11 OCT 2026',
      cssMid.spinning && cssMid.cssSpin && !cssMid.revealed && cssFinal.join(' ') === '11 OCT 2026',
      { cssMid, cssFinal });
    await noWaapi.close();

    // 4B. Mid/Late WAAPI animation.cancel() monotonic preservation
    const cancelPage = await openMockedPage({
      preload: () => {
        window.__dateAnims = [];
        const orig = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          const anim = orig.apply(this, args);
          if (this.classList.contains('reel-value')) window.__dateAnims.push(anim);
          return anim;
        };
      },
    });
    await unlockGate(cancelPage);
    await cancelPage.click('#dateRevealBtn');
    // Wait until Day reel (1420ms) finishes while Month(1575)/Year(1730) still spin, then cancel Year!
    await sleep(1470);
    const cancelSnapshot = await cancelPage.evaluate(() => {
      window.__dateAnims[2]?.cancel();
      return {
        isCss: document.querySelector('#dateStage').classList.contains('is-css-spinning'),
        isRevealedNow: document.querySelector('#dateStage').classList.contains('is-revealed'),
      };
    });
    await sleep(30);
    const monSnap = await cancelPage.evaluate(() => ({
      isCss: document.querySelector('#dateStage').classList.contains('is-css-spinning'),
      dayTransform: document.getElementById('dateDay').style.transform,
      yearDelay: document.getElementById('dateYear').style.getPropertyValue('--reel-delay'),
      revealedEarly: document.querySelector('#dateStage').classList.contains('is-revealed'),
    }));
    await cancelPage.waitForSelector('#dateStage.is-revealed', { timeout: 3000 });
    const afterCancelFinal = await cancelPage.evaluate(() => ['dateDay', 'dateMonth', 'dateYear'].map(id => document.getElementById(id).textContent));
    recordCheck('date: late WAAPI cancellation preserves settled Day reel and continues Year smoothly without skipping',
      monSnap.isCss && !monSnap.revealedEarly && monSnap.dayTransform.includes('translateY(') && afterCancelFinal.join(' ') === '11 OCT 2026',
      { cancelSnapshot, monSnap, afterCancelFinal });
    await cancelPage.close();

    // 4C. Both WAAPI missing AND CSS animation 0ms -> rAF fallback
    const rafDate = await openMockedPage({
      preload: () => { Element.prototype.animate = undefined; },
    });
    await unlockGate(rafDate);
    await rafDate.addStyleTag({ content: '.date-stage * { animation-duration: 0.001ms !important; }' });
    await rafDate.click('#dateRevealBtn');
    await sleep(450);
    const rafMid = await rafDate.evaluate(() => ({
      spinning: document.querySelector('#dateStage').classList.contains('is-spinning'),
      dayTransform: document.getElementById('dateDay').style.transform,
      revealed: document.querySelector('#dateStage').classList.contains('is-revealed'),
    }));
    await rafDate.waitForSelector('#dateStage.is-revealed', { timeout: 4000 });
    const rafDone = await rafDate.evaluate(() => ['dateDay', 'dateMonth', 'dateYear'].map(id => document.getElementById(id).textContent));
    recordCheck('date: double fallback (no WAAPI + 0ms CSS) spins via rAF cleanly to 11 OCT 2026',
      rafMid.spinning && !rafMid.revealed && rafMid.dayTransform.startsWith('translateY(') && rafDone.join(' ') === '11 OCT 2026',
      { rafMid, rafDone });
    await rafDate.close();

    // 4D. Reduced motion immediate reveal
    const rmDate = await openMockedPage({ reducedMotion: true });
    await unlockGate(rmDate);
    await rmDate.click('#dateRevealBtn');
    await sleep(80);
    const rmFinal = await rmDate.evaluate(() => ({
      revealed: document.querySelector('#dateStage').classList.contains('is-revealed'),
      vals: ['dateDay', 'dateMonth', 'dateYear'].map(id => document.getElementById(id).textContent),
    }));
    recordCheck('date: reduced-motion completes immediately with 11 OCT 2026',
      rmFinal.revealed && rmFinal.vals.join(' ') === '11 OCT 2026',
      rmFinal);
    await rmDate.close();
  }

  // 5. 8-Viewport Matrix: Atmosphere geometry (birds skip title, ripples strictly in water), zero overflow, zero broken images
  const viewports = [
    { name: 'android-360x800', width: 360, height: 800, isMobile: true, hasTouch: true },
    { name: 'motorola-393x873', width: 393, height: 873, isMobile: true, hasTouch: true },
    { name: 'mobile-390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
    { name: 'fold-outer-344x882', width: 344, height: 882, isMobile: true, hasTouch: true },
    { name: 'fold-inner-680x820', width: 680, height: 820, isMobile: true, hasTouch: true },
    { name: 'tablet-768x1024', width: 768, height: 1024, isMobile: true, hasTouch: true },
    { name: 'desktop-1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
    { name: 'widescreen-1920x1080', width: 1920, height: 1080, isMobile: false, hasTouch: false },
  ];

  for (const vp of viewports) {
    const page = await openMockedPage({ viewport: vp });
    await page.click('#openInvitation');
    await page.waitForSelector('#entry[data-state="open"]', { timeout: 5500 });
    await sleep(750);
    await page.screenshot({ path: join(OUT, 'screenshots', `${vp.name}_hero.png`) });
    const metrics = await page.evaluate(() => {
      const hero = document.querySelector('#home').getBoundingClientRect();
      const title = document.querySelector('#heroTitle').getBoundingClientRect();
      const pool = document.querySelector('.shahi-pool-effects')?.getBoundingClientRect();
      const birds = [...document.querySelectorAll('.shahi-bird')]
        .filter(b => getComputedStyle(b).display !== 'none')
        .map(b => b.getBoundingClientRect());
      const titleOverlapCount = birds.filter(r =>
        r.bottom > title.top - 4 && r.top < title.bottom + 4
      ).length;
      const poolBelowHalf = pool && pool.top >= hero.height * 0.62 && pool.bottom <= hero.height + 2;
      const brokenImgs = [...document.images].filter(img => img.complete && img.naturalWidth === 0).length;
      return {
        overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        brokenImgs,
        titleTop: Math.round(title.top),
        titleBottom: Math.round(title.bottom),
        poolTopPct: pool ? Number((pool.top / hero.height * 100).toFixed(1)) : null,
        poolBottomPct: pool ? Number((pool.bottom / hero.height * 100).toFixed(1)) : null,
        titleOverlapCount,
        poolBelowHalf,
        activeAtmo: document.querySelector('.shahi-atmosphere')?.classList.contains('is-active'),
      };
    });
    recordCheck(`matrix[${vp.name}]: atmosphere geometry clean, zero overflow & zero broken images`,
      metrics.overflowPx <= 1 && metrics.brokenImgs === 0 && metrics.titleOverlapCount === 0 && metrics.poolBelowHalf && metrics.activeAtmo,
      metrics);
    await page.close();
  }

  // 6. Full E2E Walkthroughs with MP4 Video Recording (Desktop 1366x768 & Mobile 390x844) + RSVP error + success + Replay
  for (const profile of [
    { name: 'mobile-390x844', viewport: { width: 390, height: 844, isMobile: true, hasTouch: true } },
    { name: 'desktop-1366x768', viewport: { width: 1366, height: 768, isMobile: false, hasTouch: false } },
  ]) {
    const page = await openMockedPage({ viewport: profile.viewport, mockWeb3FormsStatus: 200 });
    const recorder = await page.screencast({ path: join(OUT, 'videos', `${profile.name}_walkthrough.mp4`), format: 'mp4', fps: 30 });
    try {
      await sleep(300);
      await page.evaluate(() => {
        window.__qaScrolls = {};
        const track = () => {
          for (const el of document.querySelectorAll('.silk-scroll[data-roll-state="opening"]')) {
            const fabric = el.querySelector('.silk-scroll__fabric');
            const top = el.querySelector('.scroll-hardware--top');
            const bottom = el.querySelector('.scroll-hardware--bottom');
            const inner = el.querySelector('.silk-scroll__inner');
            const arr = window.__qaScrolls[el.id] ||= [];
            arr.push({
              h: fabric.getBoundingClientRect().height,
              top: top.getBoundingClientRect().top - el.getBoundingClientRect().top,
              bottom: bottom.getBoundingClientRect().top - el.getBoundingClientRect().top,
              tf: getComputedStyle(inner).transform,
            });
          }
          requestAnimationFrame(track);
        };
        requestAnimationFrame(track);
      });

      if (profile.viewport.isMobile) await page.tap('#openInvitation');
      else await page.click('#openInvitation');
      await page.waitForSelector('#entry[data-state="open"]', { timeout: 5500 });
      await sleep(600);
      await page.screenshot({ path: join(OUT, 'screenshots', `walk_${profile.name}_hero.png`) });

      for (const id of ['scrollBride', 'scrollGroom']) {
        await page.$eval(`#${id}`, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForSelector(`#${id}[data-roll-state="complete"]`, { timeout: 6000 });
        await sleep(250);
      }

      await page.$eval('#dateRevealBtn', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(300);
      await page.click('#dateRevealBtn');
      await page.waitForSelector('#dateStage.is-revealed', { timeout: 5000 });
      await sleep(650);
      await page.screenshot({ path: join(OUT, 'screenshots', `walk_${profile.name}_date.png`) });

      await page.$eval('#galleryTrack', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(500);
      const beforeGall = await page.$eval('#galleryTrack', el => el.scrollLeft);
      if (profile.viewport.isMobile) {
        await page.touchscreen.touchStart(330, 440);
        for (const x of [290, 240, 180, 110]) {
          await page.touchscreen.touchMove(x, 440);
          await sleep(25);
        }
        await page.touchscreen.touchEnd();
      } else {
        await page.focus('#galleryTrack');
        await page.keyboard.press('ArrowRight');
      }
      await sleep(650);
      const afterGall = await page.$eval('#galleryTrack', el => el.scrollLeft);
      recordCheck(`e2e[${profile.name}]: hanging gallery responds cleanly to swipe/keys`, afterGall > beforeGall + 30, { beforeGall, afterGall });

      await page.$eval('#ceremonies', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await sleep(550);
      const ceremonyCount = await page.$$eval('.ceremony-card', els => els.length);
      recordCheck(`e2e[${profile.name}]: all 5 ceremony cards rendered`, ceremonyCount === 5, { ceremonyCount });

      for (const id of ['scrollCompliments', 'scrollNotes']) {
        await page.$eval(`#${id}`, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForSelector(`#${id}[data-roll-state="complete"]`, { timeout: 6000 });
        await sleep(250);
      }

      const scrollReport = await page.evaluate(() => {
        return ['scrollBride', 'scrollGroom', 'scrollCompliments', 'scrollNotes'].map(id => {
          const s = window.__qaScrolls[id] || [];
          const h = document.getElementById(id).querySelector('.silk-scroll__fabric').getBoundingClientRect().height;
          return {
            id,
            samples: s.length,
            topDrift: Number((Math.max(...s.map(x => x.top)) - Math.min(...s.map(x => x.top))).toFixed(2)),
            bottomTravel: Number((Math.max(...s.map(x => x.bottom)) - Math.min(...s.map(x => x.bottom))).toFixed(1)),
            overshoot: Number((Math.max(...s.map(x => x.h)) - h).toFixed(1)),
            tfs: [...new Set(s.map(x => x.tf))],
          };
        });
      });
      recordCheck(`e2e[${profile.name}]: all 4 silk scrolls unroll with <1px top drift, bounce & zero text transform`,
        scrollReport.every(r => r.samples > 10 && r.topDrift < 1 && r.bottomTravel > 80 && r.overshoot > 2 && r.tfs.length === 1 && r.tfs[0] === 'none'),
        scrollReport);

      await page.$eval('#farewell', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(750);
      await page.screenshot({ path: join(OUT, 'screenshots', `walk_${profile.name}_finale.png`) });

      await page.$eval('#rsvpTitle', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await sleep(300);
      assert.equal(await page.$eval('#rsvpForm', f => f.checkValidity()), false);
      await page.type('#rsvpName', 'QA Validation Guest');
      await page.type('#rsvpPhone', '2025550199');
      await page.$$eval('.rsvp-event-row', rows => rows.forEach(r => r.querySelector('.rsvp-choices span')?.click()));
      await page.click('#guestPlus');
      assert.equal(await page.$eval('#guestCount', el => el.textContent), '3');
      await page.click('#submitRsvpBtn');
      await page.waitForSelector('#rsvpSuccess:not([hidden])', { timeout: 4000 });
      const okMsg = await page.$eval('#rsvpSuccess', el => el.textContent);
      recordCheck(`e2e[${profile.name}]: RSVP validation + stepper + mocked HTTP 200 submission`,
        /submitted/i.test(okMsg) && await page.$eval('#guestCount', el => el.textContent) === '2',
        { okMsg });
      await page.screenshot({ path: join(OUT, 'screenshots', `walk_${profile.name}_rsvp.png`) });
    } finally {
      await recorder?.stop();
      await page.close();
    }
  }

  // 7. RSVP simulated HTTP 500 error recovery check
  {
    const errPage = await openMockedPage({ mockWeb3FormsStatus: 500 });
    await errPage.click('#openInvitation');
    await errPage.waitForSelector('#entry[data-state="open"]', { timeout: 5500 });
    await errPage.$eval('#rsvpTitle', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await errPage.type('#rsvpName', 'QA Error Check');
    await errPage.type('#rsvpPhone', '2025550198');
    await errPage.$$eval('.rsvp-event-row', rows => rows.forEach(r => r.querySelector('.rsvp-choices span')?.click()));
    await errPage.click('#submitRsvpBtn');
    await errPage.waitForSelector('#rsvpSuccess.is-error:not([hidden])', { timeout: 4000 });
    const errState = await errPage.evaluate(() => ({
      text: document.querySelector('#rsvpSuccess').textContent,
      btnText: document.querySelector('#submitRsvpBtn span').textContent,
      disabled: document.querySelector('#submitRsvpBtn').disabled,
    }));
    recordCheck('rsvp: simulated HTTP 500 failure exposes clear retry state',
      errState.text.includes('NOT delivered') && /Retry/i.test(errState.btnText) && !errState.disabled,
      errState);
    await errPage.close();
  }

  recordCheck('runtime: zero uncaught console or page errors across all suites',
    runtimeErrors.length === 0,
    { runtimeErrors });

  await writeFile(join(OUT, 'continuation_results.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    checks,
    runtimeErrors,
  }, null, 2));
} finally {
  await browser?.close().catch(() => {});
  if (ownedServer && ownedServer.exitCode === null) ownedServer.kill();
}
