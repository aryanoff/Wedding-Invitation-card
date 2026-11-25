/**
 * SHAHI PATRA • weighted silk-scroll unroll with delayed start and soft end bounce.
 * Top roller stays fixed; bottom roller follows document flow as fabric height expands.
 * Typography is never transformed. Pauses clock cleanly if backgrounded mid-unroll.
 */
(() => {
  'use strict';

  const CONFIG = {
    pauseBeforeOpenMs: 450,
    durationMs: 1920,
    bouncePortion: 0.22,
    overshootMultiplier: 0.045,
    overshootMinPx: 18,
    overshootMaxPx: 21,
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrolls = [...document.querySelectorAll('.silk-scroll')];
  if (!scrolls.length) return;

  const states = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => {
    const t = clamp(value, 0, 1);
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  };

  function setHeight(fabric, heightPx) {
    fabric.style.height = `${Math.max(0, heightPx).toFixed(3)}px`;
  }

  function measureInner(inner) {
    return Math.max(1, Math.ceil(Math.max(inner.scrollHeight, inner.getBoundingClientRect().height)));
  }

  function setState(scroll, stateName) {
    scroll.dataset.rollState = stateName;
    scroll.classList.toggle('is-unrolling', stateName === 'opening');
    scroll.classList.toggle('is-unrolled', stateName === 'complete');
    scroll.classList.toggle('is-complete', stateName === 'complete');
  }

  function finish(scroll) {
    const state = states.get(scroll);
    if (!state || state.phase === 'complete') return;
    clearTimeout(state.timer);
    if (state.frame) cancelAnimationFrame(state.frame);
    state.target = measureInner(state.inner);
    state.fabric.style.removeProperty('height');
    state.phase = 'complete';
    setState(scroll, 'complete');
    scroll.dispatchEvent(new CustomEvent('shahi:scroll-unrolled', {
      bubbles: true,
      detail: { id: scroll.id, height: state.target }
    }));
  }

  function animateScroll(scroll, state) {
    if (state.phase === 'complete') return;
    if (reducedMotion.matches) {
      finish(scroll);
      return;
    }
    state.phase = 'opening';
    setState(scroll, 'opening');
    state.target = measureInner(state.inner);

    const duration = scroll.dataset.rollDuration
      ? clamp(Number(scroll.dataset.rollDuration) || CONFIG.durationMs, 900, 4000)
      : CONFIG.durationMs;
    const springAmplitude = clamp(
      state.target * CONFIG.overshootMultiplier,
      CONFIG.overshootMinPx,
      CONFIG.overshootMaxPx
    );
    const basePortion = 1 - CONFIG.bouncePortion;
    let lastTimestamp = null;
    let elapsedMs = 0;

    const step = now => {
      if (state.phase !== 'opening') return;
      if (document.hidden) {
        lastTimestamp = null;
        state.frame = requestAnimationFrame(step);
        return;
      }
      if (lastTimestamp !== null) {
        elapsedMs += Math.min(64, now - lastTimestamp);
      }
      lastTimestamp = now;

      const t = clamp(elapsedMs / duration, 0, 1);
      let height;
      if (t <= basePortion) {
        const mainProgress = smooth(t / basePortion);
        height = state.target * mainProgress;
      } else {
        const bounceProgress = (t - basePortion) / CONFIG.bouncePortion;
        const displacement = springAmplitude
          * Math.exp(-3.2 * bounceProgress)
          * Math.sin(2 * Math.PI * bounceProgress);
        height = state.target + displacement;
      }

      setHeight(state.fabric, height);
      if (t >= 1) {
        finish(scroll);
        return;
      }
      state.frame = requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
  }

  function open(scroll) {
    const state = states.get(scroll);
    if (!state || state.phase !== 'closed') return;
    if (reducedMotion.matches) {
      finish(scroll);
      return;
    }
    state.phase = 'waiting';
    setState(scroll, 'waiting');
    const basePause = typeof window.WEDDING_CONFIG?.scrollDelayMs === 'number'
      ? clamp(window.WEDDING_CONFIG.scrollDelayMs, 0, 3000)
      : CONFIG.pauseBeforeOpenMs;
    const pause = scroll.dataset.rollDelay
      ? clamp(Number(scroll.dataset.rollDelay) || 0, 0, 4000)
      : basePause;
    state.timer = window.setTimeout(() => animateScroll(scroll, state), pause);
  }

  document.documentElement.classList.add('shahi-scroll-bounce-ready');
  for (const scroll of scrolls) {
    const fabric = scroll.querySelector('.silk-scroll__fabric');
    const inner = scroll.querySelector('.silk-scroll__inner');
    if (!fabric || !inner) continue;
    states.set(scroll, { phase: 'closed', fabric, inner, target: 0, timer: null, frame: null });
    setState(scroll, 'closed');
    scroll.classList.add('is-visible');
    setHeight(fabric, 0);
  }

  let visibilityFrame = 0;
  let listenersCleaned = false;
  function checkVisible() {
    visibilityFrame = 0;
    if (document.body.classList.contains('is-locked')) return;
    const openingSections = new Set();
    const trigger = innerHeight * (matchMedia('(max-width: 640px)').matches ? .68 : .80);
    let incompleteCount = 0;
    for (const scroll of scrolls) {
      const state = states.get(scroll);
      if (!state || state.phase === 'complete') continue;
      incompleteCount += 1;
      const box = scroll.getBoundingClientRect();
      if (box.bottom < 0 || box.top > trigger ||
          openingSections.has(scroll.parentElement)) continue;
      openingSections.add(scroll.parentElement);
      if (state.phase === 'closed') open(scroll);
    }
    if (incompleteCount === 0 && !listenersCleaned) {
      listenersCleaned = true;
      window.removeEventListener('pageshow', scheduleVisibilityCheck);
      window.removeEventListener('scroll', scheduleVisibilityCheck);
      window.removeEventListener('resize', scheduleVisibilityCheck);
      document.removeEventListener('shahi:gate-opened', scheduleVisibilityCheck);
      document.removeEventListener('shahi:scroll-unrolled', scheduleVisibilityCheck);
    }
  }
  function scheduleVisibilityCheck() {
    if (!visibilityFrame && !listenersCleaned) visibilityFrame = requestAnimationFrame(checkVisible);
  }
  window.addEventListener('pageshow', scheduleVisibilityCheck);
  window.addEventListener('scroll', scheduleVisibilityCheck, { passive: true });
  window.addEventListener('resize', scheduleVisibilityCheck, { passive: true });
  document.addEventListener('shahi:gate-opened', scheduleVisibilityCheck);
  document.addEventListener('shahi:scroll-unrolled', scheduleVisibilityCheck);
  scheduleVisibilityCheck();

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      for (const scroll of scrolls) {
        const state = states.get(scroll);
        if (state && (state.phase === 'waiting' || state.phase === 'opening')) finish(scroll);
      }
    }
  });

  window.ShahiSilkScroll = {
    openById(id) {
      const scroll = document.getElementById(id);
      if (scroll) open(scroll);
    },
    getState(id) {
      const scroll = document.getElementById(id);
      const state = scroll && states.get(scroll);
      if (!state) return null;
      const currentHeight = state.fabric.getBoundingClientRect().height;
      return { phase: state.phase, targetHeight: state.phase === 'complete' ? currentHeight : state.target, currentHeight };
    },
  };
})();
