/**
 * SHAHI PATRA • Date Reveal Celebration System
 * Multi-phase festive choreography with visibility-paused foreground cleanup clock.
 */
(() => {
  'use strict';

  let played = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function seededRandom(seed) {
    let state = seed | 0;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function play() {
    if (played || reducedMotion.matches) return;
    const root = document.querySelector('#date') || document.querySelector('.date-section');
    if (!root) return;
    played = true;

    const plaques = root.querySelector('.date-plaques');
    if (plaques) plaques.classList.add('shimmer-active');

    const rain = document.createElement('div');
    rain.className = 'shahi-date-rain';
    rain.setAttribute('aria-hidden', 'true');
    root.append(rain);

    const random = seededRandom(20261011);
    const petalColors = ['gold', 'pink', 'ruby', 'amber'];

    const mobile = window.innerWidth <= 640;
    const petalCount = mobile ? 32 : 54;
    for (let index = 0; index < petalCount; index += 1) {
      const petal = document.createElement('span');
      const colorType = petalColors[index % petalColors.length];
      petal.className = `shahi-date-rain__petal shahi-date-rain__petal--${colorType}`;
      petal.style.setProperty('--start-x', `${17 + random() * 66}%`);
      petal.style.setProperty('--start-y', `${8 + random() * 23}%`);
      petal.style.setProperty('--dx', `${((random() - 0.5) * (mobile ? 98 : 180)).toFixed(1)}px`);
      petal.style.setProperty('--dy', `${(72 + random() * (mobile ? 135 : 220)).toFixed(1)}px`);
      petal.style.setProperty('--size', `${(mobile ? 5 + random() * 9 : 8 + random() * 13).toFixed(1)}px`);
      petal.style.setProperty('--turn', `${Math.round((random() - 0.5) * 600)}deg`);
      petal.style.setProperty('--dur', `${(1100 + random() * 900).toFixed(0)}ms`);
      petal.style.setProperty('--delay', `${(120 + random() * 515).toFixed(0)}ms`);
      rain.append(petal);
    }

    const burstCenters = [
      { x: mobile ? 23 : 29, y: 22, delay: 475, spawned: false },
      { x: mobile ? 77 : 71, y: 17, delay: 770, spawned: false }
    ];
    const sparkCountPerBurst = mobile ? 14 : 22;

    const spawnBurst = burst => {
      if (burst.spawned || !rain.isConnected) return;
      burst.spawned = true;
      for (let i = 0; i < sparkCountPerBurst; i += 1) {
        const spark = document.createElement('span');
        spark.className = 'shahi-firework-spark';
        const angle = (i / sparkCountPerBurst) * Math.PI * 2 + (random() - 0.5) * 0.3;
        const distance = mobile ? 22 + random() * 39 : 42 + random() * 69;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance + 12;
        const isGold = i % 2 === 0;

        spark.style.left = `${burst.x}%`;
        spark.style.top = `${burst.y}%`;
        spark.style.setProperty('--tx', `${tx.toFixed(1)}px`);
        spark.style.setProperty('--ty', `${ty.toFixed(1)}px`);
        spark.style.setProperty('--spark-color', isGold ? '#bf6e1d' : '#af3b59');
        spark.style.setProperty('--spark-glow', isGold ? 'rgba(255, 215, 0, 0.85)' : 'rgba(255, 80, 120, 0.75)');
        spark.style.setProperty('--dur', `${(1000 + random() * 400).toFixed(0)}ms`);
        rain.append(spark);
      }
    };

    const CLEANUP_MS = 2850;
    const SHIMMER_MS = 1600;
    let elapsed = 0;
    let resumedAt = null;
    let pageAway = false;
    let timer = null;
    let cleaned = false;

    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', syncClock);
      document.removeEventListener('freeze', onPageHide);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      if (reducedMotion.removeEventListener) reducedMotion.removeEventListener('change', onMotionChange);
      else reducedMotion.removeListener?.(onMotionChange);
      root.classList.remove('is-rain-paused');
      plaques?.classList.remove('shimmer-active');
      rain.remove();
    }

    function syncClock() {
      if (cleaned) return;
      clearTimeout(timer);
      const now = performance.now();
      if (pageAway || document.hidden) {
        if (resumedAt !== null) elapsed += now - resumedAt;
        resumedAt = null;
        root.classList.add('is-rain-paused');
        return;
      }

      root.classList.remove('is-rain-paused');
      resumedAt ??= now;
      const fg = elapsed + now - resumedAt;

      for (const burst of burstCenters) {
        if (!burst.spawned && fg >= burst.delay) spawnBurst(burst);
      }
      if (fg >= SHIMMER_MS) plaques?.classList.remove('shimmer-active');
      if (fg >= CLEANUP_MS) {
        cleanup();
        return;
      }

      const nextTargets = [CLEANUP_MS];
      if (fg < SHIMMER_MS) nextTargets.push(SHIMMER_MS);
      for (const burst of burstCenters) {
        if (!burst.spawned) nextTargets.push(burst.delay);
      }
      const nextCue = Math.min(...nextTargets);
      timer = setTimeout(syncClock, Math.max(16, Math.ceil(nextCue - fg)));
    }

    function onPageHide() { pageAway = true; syncClock(); }
    function onPageShow() { pageAway = false; syncClock(); }
    function onMotionChange() { if (reducedMotion.matches) cleanup(); }

    document.addEventListener('visibilitychange', syncClock, { passive: true });
    document.addEventListener('freeze', onPageHide, { passive: true });
    window.addEventListener('pagehide', onPageHide, { passive: true });
    window.addEventListener('pageshow', onPageShow, { passive: true });
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else reducedMotion.addListener?.(onMotionChange);
    syncClock();
  }

  window.ShahiDateRain = { play };
  document.addEventListener('shahi:date-revealed', play, { once: true });
})();
