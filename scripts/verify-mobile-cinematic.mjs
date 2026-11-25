/**
 * Browser evidence harness for the mobile cinematic entrance repair.
 *
 * This script never edits production source and never submits RSVP data. It
 * exercises the real page in Chrome, records time-based intermediate frames,
 * and writes its evidence to qa/mobile-cinematic/.
 *
 * Usage:
 *   node scripts/verify-mobile-cinematic.mjs
 *   node scripts/verify-mobile-cinematic.mjs --no-video
 *   node scripts/verify-mobile-cinematic.mjs --headed --keep-frames
 *
 * Optional environment:
 *   QA_URL=http://localhost:3000
 *   QA_PORT=4173
 *   CHROME_PATH=C:\path\to\chrome.exe
 *   QA_ATMOSPHERE_SELECTOR="#home .shahi-atmosphere"
 */

import puppeteer from 'puppeteer-core';
import { spawn, execFile } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'qa', 'mobile-cinematic');
const ARGS = new Set(process.argv.slice(2));
const VIDEO_ENABLED = !ARGS.has('--no-video');
const KEEP_FRAMES = ARGS.has('--keep-frames');
const HEADED = ARGS.has('--headed');
const FRAME_INTERVAL_MS = 70;
const MAX_GATE_WAIT_MS = 6500;
const PHONE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const TALL_PHONE_VIEWPORT = { width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const WIDE_VIEWPORT = { width: 768, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const ATMOSPHERE_SELECTOR = process.env.QA_ATMOSPHERE_SELECTOR || '#home .shahi-atmosphere';

const summary = {
  generatedAt: new Date().toISOString(),
  harness: 'scripts/verify-mobile-cinematic.mjs',
  productionFilesModified: false,
  rsvpSubmitted: false,
  physicalDeviceTestPerformed: false,
  url: null,
  server: null,
  browser: null,
  deviceEnvironment: null,
  scenarios: {},
  checks: [],
  runtime: {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    blockedExternalSubmissions: [],
  },
  evidence: [],
};

let ownedServer = null;
let browser = null;

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));

function addCheck(name, passed, details = {}, severity = 'error') {
  const check = { name, passed: Boolean(passed), severity, details };
  summary.checks.push(check);
  const glyph = check.passed ? 'PASS' : severity === 'warning' ? 'WARN' : 'FAIL';
  console.log(`[${glyph}] ${name}`);
  return check.passed;
}

function addEvidence(path) {
  summary.evidence.push(path.replaceAll('\\', '/'));
}

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`No Chrome-family executable found. Checked: ${candidates.join(', ')}`);
}

async function probeUrl(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
    return response.ok && /text\/html/i.test(response.headers.get('content-type') || '');
  } catch {
    return false;
  }
}

async function chooseServer() {
  const explicit = process.env.QA_URL;
  const candidates = explicit
    ? [explicit]
    : [
      'http://127.0.0.1:3089',
      'http://localhost:3089',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ];
  for (const candidate of candidates) {
    if (await probeUrl(candidate)) {
      return { url: candidate, owned: false, mode: 'existing' };
    }
  }
  if (explicit) throw new Error(`QA_URL is not reachable: ${explicit}`);

  const port = Number(process.env.QA_PORT || 4173);
  const url = `http://127.0.0.1:${port}`;
  const logs = [];
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', chunk => logs.push(String(chunk)));
  child.stderr.on('data', chunk => logs.push(String(chunk)));
  ownedServer = child;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await probeUrl(url)) return { url, owned: true, mode: 'dedicated', logs };
    if (child.exitCode !== null) {
      throw new Error(`Dedicated server exited early (${child.exitCode}).\n${logs.join('')}`);
    }
    await sleep(150);
  }
  throw new Error(`Dedicated server did not become ready at ${url}.\n${logs.join('')}`);
}

async function inspectAdb() {
  const commonAdb = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe')
    : null;
  try {
    let adbPath = process.env.ADB_PATH || null;
    if (!adbPath && commonAdb && await exists(commonAdb)) adbPath = commonAdb;
    if (!adbPath) {
      const { stdout: whereOutput } = await execFileAsync('where.exe', ['adb'], { windowsHide: true });
      adbPath = whereOutput.split(/\r?\n/).find(Boolean)?.trim();
    }
    if (!adbPath) return { available: false, devices: [], note: 'adb not found on PATH' };
    const { stdout } = await execFileAsync(adbPath, ['devices', '-l'], { windowsHide: true });
    const devices = stdout.split(/\r?\n/)
      .slice(1)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*'));
    return {
      available: true,
      adbPath,
      devices,
      note: devices.length
        ? 'Devices were listed read-only; this harness still ran in desktop Chrome emulation.'
        : 'No connected adb device was reported; this harness ran in desktop Chrome emulation.',
    };
  } catch (error) {
    return { available: false, devices: [], note: `adb unavailable: ${error.message}` };
  }
}

async function prepareOutput() {
  await mkdir(OUT, { recursive: true });
  for (const directory of [
    'baseline',
    'forced-fallback',
    'reduced',
    'replay',
    'fold-resize',
    'visibility',
    'regressions',
  ]) {
    await rm(join(OUT, directory), { recursive: true, force: true });
    await mkdir(join(OUT, directory), { recursive: true });
  }
}

async function attachRuntimeCollectors(page, scenarioName) {
  const local = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    blockedExternalSubmissions: [],
  };
  const push = (bucket, item) => {
    local[bucket].push(item);
    summary.runtime[bucket].push(item);
  };

  page.on('console', message => {
    if (message.type() !== 'error') return;
    push('consoleErrors', { scenario: scenarioName, text: message.text(), url: page.url() });
  });
  page.on('pageerror', error => {
    push('pageErrors', { scenario: scenarioName, message: error.message, stack: error.stack || null });
  });
  page.on('requestfailed', request => {
    push('requestFailures', {
      scenario: scenarioName,
      url: request.url(),
      method: request.method(),
      reason: request.failure()?.errorText || 'unknown',
    });
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    push('httpErrors', {
      scenario: scenarioName,
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    });
  });

  await page.setRequestInterception(true);
  page.on('request', request => {
    let externalSubmission = false;
    try {
      const parsed = new URL(request.url());
      externalSubmission = /(^|\.)w3forms\.com$|(^|\.)web3forms\.com$/i.test(parsed.hostname)
        && request.method() !== 'GET';
    } catch {
      externalSubmission = false;
    }
    if (externalSubmission) {
      const item = { scenario: scenarioName, url: request.url(), method: request.method() };
      push('blockedExternalSubmissions', item);
      request.abort('blockedbyclient').catch(() => {});
      return;
    }
    request.continue().catch(() => {});
  });
  return local;
}

async function installPreload(page, { forceFallback = false, mockVisibility = false } = {}) {
  await page.evaluateOnNewDocument(({ forced, visibilityMock }) => {
    window.__qaGateEvents = [];
    window.__qaAudioEvents = [];
    window.__qaVisibilityEvents = [];
    window.__qaForcedFallback = forced;
    const before = {
      waapi: typeof Element.prototype.animate === 'function',
      complexClip: Boolean(window.CSS?.supports?.('clip-path', 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0)')),
    };

    if (forced) {
      try {
        Object.defineProperty(Element.prototype, 'animate', {
          configurable: true,
          writable: true,
          value: undefined,
        });
      } catch {
        try { delete Element.prototype.animate; } catch { /* best effort */ }
      }
      if (window.CSS?.supports) {
        const originalSupports = window.CSS.supports.bind(window.CSS);
        try {
          window.CSS.supports = (...argumentsList) => {
            const text = argumentsList.map(value => String(value)).join(' ').toLowerCase();
            if (text.includes('clip-path') || text.includes('polygon(evenodd')) return false;
            return originalSupports(...argumentsList);
          };
        } catch { /* best effort; capability snapshot below exposes failure */ }
      }
    }

    window.__qaCapabilities = {
      before,
      after: {
        waapi: typeof Element.prototype.animate === 'function',
        complexClip: Boolean(window.CSS?.supports?.('clip-path', 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0)')),
      },
    };

    if (visibilityMock) {
      let state = 'visible';
      const getHidden = () => state === 'hidden';
      const getState = () => state;
      for (const target of [document, Document.prototype]) {
        try { Object.defineProperty(target, 'hidden', { configurable: true, get: getHidden }); } catch { /* ignored */ }
        try { Object.defineProperty(target, 'visibilityState', { configurable: true, get: getState }); } catch { /* ignored */ }
      }
      window.__qaSetVisibility = nextState => {
        state = nextState === 'hidden' ? 'hidden' : 'visible';
        window.__qaVisibilityEvents.push({ state, time: performance.now() });
        document.dispatchEvent(new Event('visibilitychange'));
      };
    }

    document.addEventListener('shahi:gate-opened', event => {
      window.__qaGateEvents.push({
        time: performance.now(),
        detail: event.detail ? JSON.parse(JSON.stringify(event.detail)) : null,
      });
    });
    document.addEventListener('DOMContentLoaded', () => {
      const audio = document.querySelector('#weddingAudio');
      if (!audio) return;
      for (const type of ['play', 'playing', 'pause', 'ended', 'error', 'waiting', 'canplay']) {
        audio.addEventListener(type, () => {
          window.__qaAudioEvents.push({
            type,
            time: performance.now(),
            currentTime: audio.currentTime,
            paused: audio.paused,
            error: audio.error?.message || null,
          });
        });
      }
    });
  }, { forced: forceFallback, visibilityMock: mockVisibility });
}

async function createPage(scenarioName, {
  viewport = PHONE_VIEWPORT,
  forceFallback = false,
  reduced = false,
  mockVisibility = false,
} = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (reduced) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  await installPreload(page, { forceFallback, mockVisibility });
  const runtime = await attachRuntimeCollectors(page, scenarioName);
  return { page, runtime };
}

async function gotoReady(page) {
  const started = Date.now();
  await page.goto(summary.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#entry');
  await page.waitForSelector('#openInvitation');
  await page.evaluate(async () => {
    await document.fonts?.ready;
    const images = [...document.images];
    await Promise.race([
      Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise(resolveImage => {
          image.addEventListener('load', resolveImage, { once: true });
          image.addEventListener('error', resolveImage, { once: true });
        }))),
      new Promise(resolveTimeout => setTimeout(resolveTimeout, 3500)),
    ]);
  });
  await sleep(120);
  return Date.now() - started;
}

async function readMetrics(page) {
  return page.evaluate(atmosphereSelector => {
    const rect = element => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        x: Number(bounds.x.toFixed(3)),
        y: Number(bounds.y.toFixed(3)),
        width: Number(bounds.width.toFixed(3)),
        height: Number(bounds.height.toFixed(3)),
        right: Number(bounds.right.toFixed(3)),
        bottom: Number(bounds.bottom.toFixed(3)),
      };
    };
    const transformVector = element => {
      if (!element) return null;
      const value = getComputedStyle(element).transform;
      if (!value || value === 'none') return { css: 'none', values: [1, 0, 0, 1, 0, 0] };
      try {
        const matrix = new DOMMatrixReadOnly(value);
        return {
          css: value,
          values: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map(number => Number(number.toFixed(5))),
        };
      } catch {
        return { css: value, values: null };
      }
    };
    const styleSnapshot = element => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        clipPath: style.clipPath,
        transform: transformVector(element),
        animationName: style.animationName,
        animationPlayState: style.animationPlayState,
      };
    };
    const entry = document.querySelector('#entry');
    const door = document.querySelector('.entry-door--right');
    const letter = document.querySelector('.entry-letter');
    const seam = document.querySelector('.entry-seam');
    const audio = document.querySelector('#weddingAudio');
    const music = document.querySelector('#musicToggle');
    const atmosphere = document.querySelector(atmosphereSelector);
    const atmosphereAnimated = atmosphere
      ? [...atmosphere.querySelectorAll('.shahi-bird, .shahi-bird svg, .shahi-pool-ripple')].slice(0, 8).map(element => ({
        className: element.getAttribute('class') || element.tagName,
        animationName: getComputedStyle(element).animationName,
        animationPlayState: getComputedStyle(element).animationPlayState,
      }))
      : [];
    return {
      time: performance.now(),
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      visibilityState: document.visibilityState,
      hidden: document.hidden,
      entry: {
        exists: Boolean(entry),
        hiddenAttribute: Boolean(entry?.hidden),
        ariaHidden: entry?.getAttribute('aria-hidden') || null,
        state: entry?.dataset.state || null,
        gateMotion: entry?.dataset.gateMotion || null,
        gateLayout: entry?.dataset.gateLayout || null,
        gatePaused: Boolean(entry?.hasAttribute('data-gate-paused')),
        rect: rect(entry),
        style: styleSnapshot(entry),
      },
      rightDoor: { rect: rect(door), style: styleSnapshot(door) },
      letter: { rect: rect(letter), style: styleSnapshot(letter) },
      seam: { rect: rect(seam), style: styleSnapshot(seam) },
      body: {
        locked: document.body.classList.contains('is-locked'),
        opened: document.body.classList.contains('opened'),
        openingGate: document.body.classList.contains('opening-gate'),
      },
      mainInert: Boolean(document.querySelector('#mainContent')?.inert),
      audio: audio ? {
        paused: audio.paused,
        ended: audio.ended,
        currentTime: Number(audio.currentTime.toFixed(4)),
        readyState: audio.readyState,
        networkState: audio.networkState,
        error: audio.error?.message || null,
      } : null,
      music: music ? {
        visible: rect(music)?.width > 0 && rect(music)?.height > 0 && getComputedStyle(music).visibility !== 'hidden',
        className: music.className,
        ariaLabel: music.getAttribute('aria-label'),
      } : null,
      atmosphere: atmosphere ? {
        exists: true,
        active: atmosphere.classList.contains('is-active'),
        style: styleSnapshot(atmosphere),
        animated: atmosphereAnimated,
      } : { exists: false, active: false, animated: [] },
      overflow: {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      },
      capabilities: window.__qaCapabilities || null,
      gateEvents: window.__qaGateEvents || [],
      audioEvents: window.__qaAudioEvents || [],
      visibilityEvents: window.__qaVisibilityEvents || [],
    };
  }, ATMOSPHERE_SELECTOR);
}

async function trustedTouchTap(page, selector) {
  const handle = await page.waitForSelector(selector, { visible: true });
  const box = await handle.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error(`Cannot touch ${selector}: it has no visible bounding box.`);
  }
  await page.evaluate(targetSelector => {
    window.__qaTrustedActivation = null;
    const target = document.querySelector(targetSelector);
    target?.addEventListener('click', event => {
      window.__qaTrustedActivation = {
        time: performance.now(),
        isTrusted: event.isTrusted,
        type: event.type,
      };
    }, { capture: true, once: true });
  }, selector);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => Boolean(window.__qaTrustedActivation), { timeout: 1500 });
  return page.evaluate(() => window.__qaTrustedActivation);
}

function vectorDistance(before, after) {
  const a = before?.values;
  const b = after?.values;
  if (!a || !b || a.length !== b.length) return null;
  return Math.max(...a.map((value, index) => Math.abs(value - b[index])));
}

async function screenshot(page, path, trackEvidence = true) {
  await page.screenshot({ path, captureBeyondViewport: false });
  if (trackEvidence) addEvidence(path.slice(ROOT.length + 1));
}

async function compileVideo(framesDirectory, outputPath) {
  if (!VIDEO_ENABLED) return { created: false, reason: '--no-video' };
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-framerate', String(Math.round(1000 / FRAME_INTERVAL_MS)),
      '-start_number', '0',
      '-i', join(framesDirectory, 'frame_%04d.png'),
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '20',
      outputPath,
    ], { windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    addEvidence(outputPath.slice(ROOT.length + 1));
    return { created: true, path: outputPath.slice(ROOT.length + 1).replaceAll('\\', '/') };
  } catch (error) {
    return { created: false, reason: error.message };
  }
}

async function recordGateTimeline(name, {
  forceFallback = false,
  reduced = false,
  video = true,
} = {}) {
  const directory = join(OUT, name);
  const framesDirectory = join(directory, 'frames');
  await mkdir(framesDirectory, { recursive: true });
  const { page, runtime } = await createPage(name, { forceFallback, reduced });
  const result = {
    name,
    forceFallback,
    reduced,
    loadMs: null,
    timeline: [],
    progressFrames: [],
    activation: null,
    event: null,
    runtime,
    video: null,
  };
  try {
    result.loadMs = await gotoReady(page);
    const closedPath = join(framesDirectory, 'frame_0000.png');
    const closedMetrics = await readMetrics(page);
    closedMetrics.elapsedMs = 0;
    await screenshot(page, closedPath, KEEP_FRAMES);
    result.timeline.push({ ...closedMetrics, frame: closedPath.slice(ROOT.length + 1).replaceAll('\\', '/') });

    result.activation = await trustedTouchTap(page, '#openInvitation');
    const start = result.activation.time;

    let frameIndex = 1;
    let finished = false;
    const wallStart = Date.now();
    while (!finished && Date.now() - wallStart < MAX_GATE_WAIT_MS) {
      const iterationStart = Date.now();
      const metrics = await readMetrics(page);
      metrics.elapsedMs = Number((metrics.time - start).toFixed(2));
      const framePath = join(framesDirectory, `frame_${String(frameIndex).padStart(4, '0')}.png`);
      await screenshot(page, framePath, KEEP_FRAMES);
      result.timeline.push({ ...metrics, frame: framePath.slice(ROOT.length + 1).replaceAll('\\', '/') });
      frameIndex += 1;
      finished = metrics.entry.hiddenAttribute
        && metrics.entry.state === 'open'
        && metrics.gateEvents.length > 0;
      if (!finished) await sleep(Math.max(5, FRAME_INTERVAL_MS - (Date.now() - iterationStart)));
    }

    const finalMetrics = result.timeline.at(-1);
    result.event = finalMetrics?.gateEvents?.at(-1) || null;
    const declaredDuration = Number(result.event?.detail?.durationMs);
    const measuredDuration = Number(finalMetrics?.elapsedMs || 0);
    const duration = Number.isFinite(declaredDuration) && declaredDuration >= 0
      ? declaredDuration
      : measuredDuration;
    const progressTargets = [0, 0.25, 0.5, 0.75, 1];
    for (const ratio of progressTargets) {
      const targetMs = duration * ratio;
      const source = ratio === 0
        ? result.timeline[0]
        : ratio === 1
          ? result.timeline.at(-1)
          : result.timeline.reduce((closest, item) => (
            Math.abs(item.elapsedMs - targetMs) < Math.abs(closest.elapsedMs - targetMs) ? item : closest
          ), result.timeline[1] || result.timeline[0]);
      const percent = String(Math.round(ratio * 100)).padStart(3, '0');
      const targetPath = join(directory, `progress_${percent}.png`);
      await copyFile(join(ROOT, source.frame), targetPath);
      addEvidence(targetPath.slice(ROOT.length + 1));
      result.progressFrames.push({
        percent: ratio * 100,
        targetMs: Number(targetMs.toFixed(2)),
        actualMs: source.elapsedMs,
        path: targetPath.slice(ROOT.length + 1).replaceAll('\\', '/'),
        metrics: source,
      });
    }

    result.video = video
      ? await compileVideo(framesDirectory, join(directory, 'mobile-cinematic.mp4'))
      : { created: false, reason: 'scenario video disabled' };
    if (video && VIDEO_ENABLED) {
      addCheck(`${name}: MP4 evidence generated`, result.video.created, result.video);
    }

    addCheck(`${name}: timeline used a trusted touchscreen activation`, result.activation?.isTrusted === true, {
      activation: result.activation,
    });

    const openingSamples = result.timeline.filter(item => item.entry.state === 'opening');
    addCheck(`${name}: gate completed`, Boolean(finalMetrics?.entry.hiddenAttribute && finalMetrics?.entry.state === 'open'), {
      measuredDuration,
      event: result.event,
    });
    if (reduced) {
      addCheck(`${name}: reduced route is intentional`, result.event?.detail?.motion === 'reduced', {
        detail: result.event?.detail || null,
      });
      addCheck(`${name}: reduced route completes promptly`, measuredDuration < 600, { measuredDuration });
    } else {
      addCheck(`${name}: cinematic route selected`, openingSamples.length > 0
        && openingSamples.every(item => item.entry.gateMotion === 'cinematic')
        && result.event?.detail?.motion === 'cinematic', {
        motions: [...new Set(openingSamples.map(item => item.entry.gateMotion))],
        event: result.event,
      });
      const transformDistances = openingSamples.slice(1).map((item, index) => vectorDistance(
        openingSamples[index].rightDoor.style?.transform,
        item.rightDoor.style?.transform,
      )).filter(value => value !== null);
      addCheck(`${name}: right curtain has measured intermediate motion`, transformDistances.some(value => value > 0.002), {
        maximumTransformStep: transformDistances.length ? Math.max(...transformDistances) : null,
      });
      addCheck(`${name}: seam exists during choreography`, openingSamples.some(item => item.seam.rect?.width > 0 && item.seam.rect?.height > 0), {
        seamSamples: openingSamples.map(item => item.seam.rect).filter(Boolean).slice(0, 5),
      });
    }
    addCheck(`${name}: main content unlock state`, finalMetrics?.mainInert === false && finalMetrics?.body.locked === false, {
      mainInert: finalMetrics?.mainInert,
      body: finalMetrics?.body,
    });
    return result;
  } finally {
    await page.close();
    if (!KEEP_FRAMES && result.video?.created) await rm(framesDirectory, { recursive: true, force: true });
  }
}

async function waitForGateEvents(page, count, timeout = MAX_GATE_WAIT_MS) {
  await page.waitForFunction(expected => (window.__qaGateEvents || []).length >= expected, { timeout }, count);
  return page.evaluate(() => window.__qaGateEvents || []);
}

async function runReplayScenario() {
  const name = 'replay';
  const directory = join(OUT, name);
  const { page, runtime } = await createPage(name);
  const result = { runtime, events: [], reset: null, reopened: null };
  try {
    await gotoReady(page);
    await page.click('#openInvitation');
    await waitForGateEvents(page, 1);
    await screenshot(page, join(directory, 'opened_once.png'));
    await page.evaluate(() => document.querySelector('#replayInvitation')?.click());
    await page.waitForFunction(() => {
      const entry = document.querySelector('#entry');
      return entry && !entry.hidden && document.body.classList.contains('is-locked');
    });
    result.reset = await readMetrics(page);
    await screenshot(page, join(directory, 'replayed_closed.png'));
    await page.click('#openInvitation');
    result.events = await waitForGateEvents(page, 2);
    result.reopened = await readMetrics(page);
    await screenshot(page, join(directory, 'reopened.png'));
    addCheck('replay: closed state restored', !result.reset.entry.hiddenAttribute
      && result.reset.body.locked
      && result.reset.mainInert
      && (!result.reset.entry.state || result.reset.entry.state === 'closed'), {
      reset: result.reset.entry,
      body: result.reset.body,
    });
    addCheck('replay: cinematic route works twice', result.events.length === 2
      && result.events.every(event => event.detail?.motion === 'cinematic'), { events: result.events });
    addCheck('replay: completion retains motion metadata', result.reopened.entry.gateMotion === 'cinematic', {
      gateMotion: result.reopened.entry.gateMotion,
    });
    return result;
  } finally {
    await page.close();
  }
}

async function runFoldResizeScenario() {
  const name = 'fold-resize';
  const directory = join(OUT, name);
  const { page, runtime } = await createPage(name, { viewport: PHONE_VIEWPORT });
  const result = { runtime, before: null, after: null, completed: null, replayWide: null };
  try {
    await gotoReady(page);
    await page.click('#openInvitation');
    await page.waitForSelector('#entry[data-state="opening"][data-gate-motion="cinematic"]', { timeout: 1800 });
    await sleep(320);
    result.before = await readMetrics(page);
    await screenshot(page, join(directory, 'before_resize_390.png'));
    await page.setViewport(WIDE_VIEWPORT);
    await sleep(120);
    result.after = await readMetrics(page);
    await screenshot(page, join(directory, 'during_resize_768.png'));
    await waitForGateEvents(page, 1);
    result.completed = await readMetrics(page);
    await screenshot(page, join(directory, 'completed_after_resize.png'));

    await page.evaluate(() => document.querySelector('#replayInvitation')?.click());
    await page.waitForFunction(() => !document.querySelector('#entry')?.hidden);
    await page.click('#openInvitation');
    await page.waitForSelector('#entry[data-state="opening"][data-gate-motion="cinematic"]', { timeout: 1800 });
    await sleep(120);
    result.replayWide = await readMetrics(page);
    await screenshot(page, join(directory, 'new_opening_wide.png'));

    const continuity = vectorDistance(result.before.rightDoor.style?.transform, result.after.rightDoor.style?.transform);
    addCheck('fold resize: opening layout frozen across 390→768', result.before.entry.gateLayout === 'portrait'
      && result.after.entry.gateLayout === 'portrait', {
      before: result.before.entry.gateLayout,
      after: result.after.entry.gateLayout,
    });
    addCheck('fold resize: active choreography survives resize', result.after.entry.state === 'opening'
      && result.completed.entry.state === 'open', {
      afterState: result.after.entry.state,
      completedState: result.completed.entry.state,
      transformDeltaAcrossResize: continuity,
    });
    addCheck('fold resize: replay recomputes wide layout', result.replayWide.entry.gateLayout === 'wide', {
      layout: result.replayWide.entry.gateLayout,
      viewport: result.replayWide.viewport,
    });
    return result;
  } finally {
    await page.close();
  }
}

async function runVisibilityScenario() {
  const name = 'visibility';
  const directory = join(OUT, name);
  const { page, runtime } = await createPage(name, { mockVisibility: true });
  const result = {
    runtime,
    beforeHidden: null,
    hiddenStart: null,
    hiddenEnd: null,
    resumedStart: null,
    resumedEnd: null,
    completed: null,
    atmosphereActive: null,
    atmosphereHidden: null,
    atmosphereResumed: null,
    realAudioPlaybackObserved: false,
  };
  try {
    await gotoReady(page);
    await page.click('#openInvitation');
    await page.waitForSelector('#entry[data-state="opening"][data-gate-motion="cinematic"]', { timeout: 1800 });
    await sleep(280);
    result.beforeHidden = await readMetrics(page);
    await sleep(180);
    const audioAdvanced = await readMetrics(page);
    result.realAudioPlaybackObserved = Boolean(
      !result.beforeHidden.audio?.paused
      && audioAdvanced.audio?.currentTime > result.beforeHidden.audio.currentTime + 0.03
    );
    await page.evaluate(() => window.__qaSetVisibility?.('hidden'));
    result.hiddenStart = await readMetrics(page);
    await screenshot(page, join(directory, 'hidden_start.png'));
    await sleep(420);
    result.hiddenEnd = await readMetrics(page);
    await screenshot(page, join(directory, 'hidden_end.png'));
    await page.evaluate(() => window.__qaSetVisibility?.('visible'));
    result.resumedStart = await readMetrics(page);
    await sleep(420);
    result.resumedEnd = await readMetrics(page);
    await screenshot(page, join(directory, 'resumed.png'));
    await waitForGateEvents(page, 1, 8500);
    result.completed = await readMetrics(page);
    await screenshot(page, join(directory, 'completed.png'));

    // Exercise the decorative hero atmosphere independently after the gate is
    // complete, so pause/resume is verified rather than inferred from classes.
    await sleep(220);
    result.atmosphereActive = await readMetrics(page);
    if (result.atmosphereActive.atmosphere.exists) {
      await page.evaluate(() => window.__qaSetVisibility?.('hidden'));
      await sleep(220);
      result.atmosphereHidden = await readMetrics(page);
      await screenshot(page, join(directory, 'atmosphere_hidden.png'));
      await page.evaluate(() => window.__qaSetVisibility?.('visible'));
      await sleep(260);
      result.atmosphereResumed = await readMetrics(page);
      await screenshot(page, join(directory, 'atmosphere_resumed.png'));
    }

    const hiddenDoorDelta = vectorDistance(
      result.hiddenStart.rightDoor.style?.transform,
      result.hiddenEnd.rightDoor.style?.transform,
    );
    const resumedDoorDelta = vectorDistance(
      result.resumedStart.rightDoor.style?.transform,
      result.resumedEnd.rightDoor.style?.transform,
    );
    addCheck('visibility: gate pauses while page is hidden', hiddenDoorDelta !== null && hiddenDoorDelta < 0.01, {
      hiddenDoorDelta,
    });
    addCheck('visibility: gate resumes when page returns', resumedDoorDelta !== null && resumedDoorDelta > 0.002, {
      resumedDoorDelta,
      completedState: result.completed.entry.state,
    });
    if (result.realAudioPlaybackObserved) {
      addCheck('visibility: real audio pauses while hidden', result.hiddenEnd.audio?.paused
        && result.hiddenEnd.audio.currentTime <= result.hiddenStart.audio.currentTime + 0.08, {
        start: result.hiddenStart.audio,
        end: result.hiddenEnd.audio,
      });
      addCheck('visibility: real audio resumes when visible', !result.resumedEnd.audio?.paused
        && result.resumedEnd.audio.currentTime > result.resumedStart.audio.currentTime + 0.03, {
        start: result.resumedStart.audio,
        end: result.resumedEnd.audio,
      });
    } else {
      addCheck('visibility: real audio playback available in headless Chrome', false, {
        audio: result.beforeHidden.audio,
        audioEvents: result.completed.audioEvents,
        note: 'Audio lifecycle assertions were recorded but real time advancement was unavailable in this host.',
      }, 'warning');
    }

    const atmosphereWasPresent = result.atmosphereActive.atmosphere.exists;
    if (atmosphereWasPresent) {
      const hiddenStates = result.atmosphereHidden.atmosphere.animated.map(item => item.animationPlayState);
      const resumedStates = result.atmosphereResumed.atmosphere.animated.map(item => item.animationPlayState);
      addCheck('visibility: atmosphere pauses while hidden', !result.atmosphereHidden.atmosphere.active
        || hiddenStates.every(state => state === 'paused'), {
        atmosphere: result.atmosphereHidden.atmosphere,
      });
      addCheck('visibility: atmosphere resumes while visible', result.atmosphereResumed.atmosphere.active
        && resumedStates.some(state => state === 'running'), {
        atmosphere: result.atmosphereResumed.atmosphere,
      });
    } else {
      addCheck('visibility: atmosphere layer available', false, {
        selector: ATMOSPHERE_SELECTOR,
        note: 'No atmosphere layer was present in the tested production DOM.',
      }, 'warning');
    }
    return result;
  } finally {
    await page.close();
  }
}

async function runRealTabVisibilityScenario() {
  const name = 'visibility-real-tab';
  const directory = join(OUT, 'visibility');
  const { page, runtime } = await createPage(name);
  let coverPage = null;
  const result = {
    runtime,
    beforeBackground: null,
    backgroundStart: null,
    whileBackground: null,
    afterForeground: null,
    completed: null,
    manualPauseBeforeSwitch: null,
    manualPauseAfterSwitch: null,
  };
  try {
    await gotoReady(page);
    await page.bringToFront();
    await page.click('#openInvitation');
    await page.waitForSelector('#entry[data-state="opening"][data-gate-motion="cinematic"]', { timeout: 1800 });
    await sleep(300);
    result.beforeBackground = await readMetrics(page);
    coverPage = await browser.newPage();
    await coverPage.setViewport(PHONE_VIEWPORT);
    await coverPage.goto('about:blank');
    await coverPage.bringToFront();
    await sleep(80);
    result.backgroundStart = await readMetrics(page);
    await sleep(420);
    result.whileBackground = await readMetrics(page);
    await page.bringToFront();
    await sleep(420);
    result.afterForeground = await readMetrics(page);
    await screenshot(page, join(directory, 'real_tab_resumed.png'));
    await waitForGateEvents(page, 1, 8500);
    result.completed = await readMetrics(page);

    // A user-initiated manual pause must not be undone by tab visibility.
    if (!result.completed.audio?.paused) {
      await page.click('#musicToggle');
      await sleep(100);
    }
    result.manualPauseBeforeSwitch = await readMetrics(page);
    await coverPage.bringToFront();
    await sleep(220);
    await page.bringToFront();
    await sleep(220);
    result.manualPauseAfterSwitch = await readMetrics(page);
    await screenshot(page, join(directory, 'manual_pause_persisted.png'));

    const hiddenDoorDelta = vectorDistance(
      result.backgroundStart.rightDoor.style?.transform,
      result.whileBackground.rightDoor.style?.transform,
    );
    const resumedDoorDelta = vectorDistance(
      result.whileBackground.rightDoor.style?.transform,
      result.afterForeground.rightDoor.style?.transform,
    );
    addCheck('real tab visibility: Chrome reports the invitation hidden', result.whileBackground.hidden
      && result.whileBackground.visibilityState === 'hidden', {
      visibilityState: result.whileBackground.visibilityState,
      hidden: result.whileBackground.hidden,
    });
    addCheck('real tab visibility: gate marks itself paused in background', result.backgroundStart.entry.gatePaused
      && result.whileBackground.entry.gatePaused
      && hiddenDoorDelta !== null && hiddenDoorDelta < 0.02, {
      gatePausedAtStart: result.backgroundStart.entry.gatePaused,
      gatePaused: result.whileBackground.entry.gatePaused,
      hiddenDoorDelta,
    });
    addCheck('real tab visibility: gate resumes in foreground', !result.afterForeground.entry.gatePaused
      && resumedDoorDelta !== null && resumedDoorDelta > 0.002
      && result.completed.entry.state === 'open', {
      gatePaused: result.afterForeground.entry.gatePaused,
      resumedDoorDelta,
      completedState: result.completed.entry.state,
    });
    if (!result.beforeBackground.audio?.paused) {
      addCheck('real tab visibility: playing audio pauses in background', result.whileBackground.audio?.paused
        && result.whileBackground.music?.ariaLabel?.toLowerCase().includes('play'), {
        before: result.beforeBackground.audio,
        hidden: result.whileBackground.audio,
        hiddenLabel: result.whileBackground.music?.ariaLabel,
      });
      addCheck('real tab visibility: auto-paused audio resumes in foreground', !result.afterForeground.audio?.paused
        && result.afterForeground.music?.ariaLabel?.toLowerCase().includes('pause'), {
        resumed: result.afterForeground.audio,
        resumedLabel: result.afterForeground.music?.ariaLabel,
      });
    } else {
      addCheck('real tab visibility: real audio started before tab switch', false, {
        audio: result.beforeBackground.audio,
        note: 'The host did not expose advancing media playback; state evidence was retained.',
      }, 'warning');
    }
    addCheck('real tab visibility: manual audio pause persists', result.manualPauseBeforeSwitch.audio?.paused
      && result.manualPauseAfterSwitch.audio?.paused
      && result.manualPauseAfterSwitch.music?.ariaLabel?.toLowerCase().includes('play'), {
      before: result.manualPauseBeforeSwitch.audio,
      after: result.manualPauseAfterSwitch.audio,
      label: result.manualPauseAfterSwitch.music?.ariaLabel,
    });
    return result;
  } finally {
    await coverPage?.close().catch(() => {});
    await page.close();
  }
}

async function collectRegressionSnapshot(page) {
  return page.evaluate(() => {
    const brokenImages = [...document.images]
      .filter(image => image.complete && image.naturalWidth === 0)
      .map(image => ({ src: image.currentSrc || image.src, alt: image.alt || '', className: image.className || '' }));
    const brokenMedia = [...document.querySelectorAll('audio,video')]
      .filter(media => media.error)
      .map(media => ({ src: media.currentSrc || media.src, code: media.error?.code, message: media.error?.message || null }));
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${[...element.classList].slice(0, 3).join('.')}` : ''}`,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter(item => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1))
      .sort((a, b) => Math.max(Math.abs(b.left), b.right - viewportWidth) - Math.max(Math.abs(a.left), a.right - viewportWidth))
      .slice(0, 20);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: viewportWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowPx: document.documentElement.scrollWidth - viewportWidth,
      },
      brokenImages,
      brokenMedia,
      overflowOffenders: offenders,
      musicToggle: (() => {
        const button = document.querySelector('#musicToggle');
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return {
          visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden',
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          ariaLabel: button.getAttribute('aria-label'),
        };
      })(),
    };
  });
}

async function runRegressionScenario(viewport, label) {
  const name = `regressions-${label}`;
  const { page, runtime } = await createPage(name, { viewport });
  const result = { runtime, closed: null, opened: null };
  try {
    await gotoReady(page);
    result.closed = await collectRegressionSnapshot(page);
    await page.evaluate(() => {
      const button = document.querySelector('#openInvitation');
      button?.click();
      button?.click();
      button?.click();
    });
    await waitForGateEvents(page, 1);
    await sleep(250);
    result.opened = await collectRegressionSnapshot(page);
    await screenshot(page, join(OUT, 'regressions', `${label}_opened.png`));
    addCheck(`${label}: no horizontal overflow`, result.opened.document.overflowPx <= 1, {
      document: result.opened.document,
      offenders: result.opened.overflowOffenders,
    });
    addCheck(`${label}: no broken image/media elements`, result.opened.brokenImages.length === 0
      && result.opened.brokenMedia.length === 0, {
      brokenImages: result.opened.brokenImages,
      brokenMedia: result.opened.brokenMedia,
    });
    addCheck(`${label}: music control remains visible`, result.closed.musicToggle?.visible
      && result.opened.musicToggle?.visible, {
      closed: result.closed.musicToggle,
      opened: result.opened.musicToggle,
    });
    const events = await page.evaluate(() => window.__qaGateEvents || []);
    addCheck(`${label}: rapid repeated activation opens once`, events.length === 1, { events });
    return result;
  } finally {
    await page.close();
  }
}

function slimScenarioForJson(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (key === 'timeline' && Array.isArray(item)) {
      return item.map(sample => ({
        elapsedMs: sample.elapsedMs,
        frame: sample.frame,
        viewport: sample.viewport,
        visibilityState: sample.visibilityState,
        entry: sample.entry,
        rightDoor: sample.rightDoor,
        letter: sample.letter,
        seam: sample.seam,
        audio: sample.audio,
        atmosphere: sample.atmosphere,
      }));
    }
    return item;
  }));
}

function markdownReport() {
  const failures = summary.checks.filter(check => !check.passed && check.severity === 'error');
  const warnings = summary.checks.filter(check => !check.passed && check.severity === 'warning');
  const lines = [
    '# Mobile cinematic browser QA',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Test URL: \`${summary.url}\``,
    '',
    `Browser: ${summary.browser?.version || 'unknown'} (${summary.browser?.executablePath || 'unknown path'})`,
    '',
    `Overall: ${failures.length ? `FAIL (${failures.length} blocking checks)` : 'PASS'}; ${warnings.length} warning(s).`,
    '',
    'This is Chrome mobile emulation evidence. No physical phone test or deployment was performed.',
    '',
    '## Checks',
    '',
  ];
  for (const check of summary.checks) {
    const mark = check.passed ? 'PASS' : check.severity === 'warning' ? 'WARN' : 'FAIL';
    lines.push(`- ${mark} — ${check.name}`);
  }
  lines.push(
    '',
    '## Runtime diagnostics',
    '',
    `- Console errors: ${summary.runtime.consoleErrors.length}`,
    `- Page errors: ${summary.runtime.pageErrors.length}`,
    `- Failed requests: ${summary.runtime.requestFailures.length}`,
    `- HTTP errors: ${summary.runtime.httpErrors.length}`,
    `- External RSVP submissions blocked: ${summary.runtime.blockedExternalSubmissions.length}`,
    '',
    '## Device tooling',
    '',
    `- adb available: ${Boolean(summary.deviceEnvironment?.available)}`,
    `- Connected adb rows: ${summary.deviceEnvironment?.devices?.length || 0}`,
    `- Note: ${summary.deviceEnvironment?.note || 'not inspected'}`,
    '',
    '## Evidence',
    '',
  );
  for (const path of summary.evidence) lines.push(`- \`${path}\``);
  lines.push('', 'Full measurements and event details are in `summary.json`.', '');
  return lines.join('\n');
}

async function writeReports() {
  const jsonPath = join(OUT, 'summary.json');
  const mdPath = join(OUT, 'summary.md');
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, markdownReport(), 'utf8');
  addEvidence(jsonPath.slice(ROOT.length + 1));
  addEvidence(mdPath.slice(ROOT.length + 1));
  // Re-write so the JSON evidence list includes the reports themselves.
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, markdownReport(), 'utf8');
}

async function main() {
  await prepareOutput();
  summary.deviceEnvironment = await inspectAdb();
  summary.server = await chooseServer();
  summary.url = summary.server.url;
  const executablePath = await findChrome();
  browser = await puppeteer.launch({
    executablePath,
    headless: HEADED ? false : 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=900,1000',
    ],
  });
  summary.browser = {
    executablePath,
    version: await browser.version(),
    userAgent: await browser.userAgent(),
    headless: !HEADED,
  };

  const baseline = await recordGateTimeline('baseline', { video: true });
  summary.scenarios.baseline = slimScenarioForJson(baseline);

  const fallback = await recordGateTimeline('forced-fallback', { forceFallback: true, video: true });
  summary.scenarios.forcedFallback = slimScenarioForJson(fallback);
  const baselineOpening = baseline.timeline.filter(item => item.entry.state === 'opening');
  const fallbackOpening = fallback.timeline.filter(item => item.entry.state === 'opening');
  addCheck('forced fallback: WAAPI and complex clip support were actually removed', fallbackOpening.some(item => (
    item.capabilities?.after?.waapi === false && item.capabilities?.after?.complexClip === false
  )), {
    capabilities: fallbackOpening[0]?.capabilities || fallback.timeline[0]?.capabilities || null,
  });
  addCheck('forced fallback: same cinematic route as baseline', baseline.event?.detail?.motion === 'cinematic'
    && fallback.event?.detail?.motion === 'cinematic'
    && baselineOpening.every(item => item.entry.gateMotion === 'cinematic')
    && fallbackOpening.every(item => item.entry.gateMotion === 'cinematic'), {
    baselineEvent: baseline.event,
    fallbackEvent: fallback.event,
    baselineMotions: [...new Set(baselineOpening.map(item => item.entry.gateMotion))],
    fallbackMotions: [...new Set(fallbackOpening.map(item => item.entry.gateMotion))],
  });
  const baselineDuration = Number(baseline.event?.detail?.durationMs);
  const fallbackDuration = Number(fallback.event?.detail?.durationMs);
  addCheck('forced fallback: declared choreography duration matches baseline', Number.isFinite(baselineDuration)
    && Number.isFinite(fallbackDuration)
    && Math.abs(baselineDuration - fallbackDuration) <= 32, {
    baselineDuration,
    fallbackDuration,
  });

  const reduced = await recordGateTimeline('reduced', { reduced: true, video: false });
  summary.scenarios.reduced = slimScenarioForJson(reduced);

  summary.scenarios.replay = slimScenarioForJson(await runReplayScenario());
  summary.scenarios.foldResize = slimScenarioForJson(await runFoldResizeScenario());
  summary.scenarios.visibility = slimScenarioForJson(await runVisibilityScenario());
  summary.scenarios.visibilityRealTab = slimScenarioForJson(await runRealTabVisibilityScenario());
  summary.scenarios.regressionsPhone = slimScenarioForJson(await runRegressionScenario(PHONE_VIEWPORT, 'phone-390x844'));
  summary.scenarios.regressionsTallPhone = slimScenarioForJson(await runRegressionScenario(TALL_PHONE_VIEWPORT, 'phone-412x915'));
  summary.scenarios.regressionsWide = slimScenarioForJson(await runRegressionScenario(WIDE_VIEWPORT, 'wide-768x844'));

  addCheck('runtime: no uncaught page errors', summary.runtime.pageErrors.length === 0, {
    pageErrors: summary.runtime.pageErrors,
  });
  addCheck('runtime: no console errors', summary.runtime.consoleErrors.length === 0, {
    consoleErrors: summary.runtime.consoleErrors,
  });
  addCheck('runtime: no failed asset requests', summary.runtime.requestFailures.length === 0, {
    requestFailures: summary.runtime.requestFailures,
  });
  addCheck('runtime: no HTTP asset errors', summary.runtime.httpErrors.length === 0, {
    httpErrors: summary.runtime.httpErrors,
  });
  addCheck('safety: no external RSVP submission attempted', summary.runtime.blockedExternalSubmissions.length === 0, {
    blocked: summary.runtime.blockedExternalSubmissions,
  });
  await writeReports();

  const blockingFailures = summary.checks.filter(check => !check.passed && check.severity === 'error');
  console.log(`\nEvidence: ${OUT}`);
  console.log(`Blocking failures: ${blockingFailures.length}`);
  if (blockingFailures.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  summary.fatalError = { message: error.message, stack: error.stack || null };
  console.error(error);
  await mkdir(OUT, { recursive: true }).catch(() => {});
  await writeReports().catch(() => {});
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (ownedServer && ownedServer.exitCode === null) ownedServer.kill();
}

