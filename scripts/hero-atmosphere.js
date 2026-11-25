/* Lightweight SVG birds and CSS pool ripples for the existing #home hero.
   Artboard-relative geometry binds birds to unobstructed sky lanes and ripples
   strictly inside the visible reflection water across desktop, tablet, fold & phone crops. */
(() => {
  'use strict';

  const hero = document.querySelector('#home.hero');
  if (!hero || hero.querySelector('.shahi-atmosphere')) return;

  const backdrop = hero.querySelector('.hero-backdrop');
  const heroTitle = hero.querySelector('#heroTitle');
  const entry = document.querySelector('#entry');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let heroVisible = false;
  let pageVisible = !document.hidden;

  const ARTBOARDS = {
    portrait: {
      natW: 992,
      natH: 1586,
      skyMaxY: 0.35,      // Above tallest mandap dome ridge in portrait artwork
      pool: { left: 0.24, right: 0.76, top: 0.688, bottom: 0.975 }
    },
    wide: {
      natW: 2322,
      natH: 1224,
      skyMaxY: 0.405,     // Above wide dusk mandap floral arch
      pool: { left: 0.145, right: 0.855, top: 0.905, bottom: 0.988 }
    }
  };

  const layer = document.createElement('div');
  layer.className = 'shahi-atmosphere';
  layer.setAttribute('aria-hidden', 'true');

  const birdFlight = document.createElement('div');
  birdFlight.className = 'shahi-bird-flight';

  // Relative vertical fractions [0..1] inside the unobstructed sky band(s).
  const birdSettings = [
    { band: 'upper', lane: 0.26, size: 11, duration: 23.4, delay: -2.1, rise: -3.2, depth: 0.74, opacity: 0.42, wing: 1.35 },
    { band: 'upper', lane: 0.62, size: 9, duration: 22.8, delay: -3.0, rise: -2.6, depth: 0.64, opacity: 0.36, wing: 1.58 },
    { band: 'lower', lane: 0.34, size: 13, duration: 24.2, delay: -4.2, rise: -3.6, depth: 0.84, opacity: 0.42, wing: 1.72 },
    { band: 'lower', lane: 0.66, size: 10, duration: 25.6, delay: -12.8, rise: -2.2, depth: 0.68, opacity: 0.35, wing: 1.47 },
    { band: 'lower', lane: 0.48, size: 14, duration: 26.1, delay: -14.0, rise: -3.1, depth: 0.88, opacity: 0.38, wing: 1.86 },
    { band: 'upper', lane: 0.44, size: 8, duration: 24.9, delay: -15.1, rise: -1.8, depth: 0.58, opacity: 0.32, wing: 1.62 }
  ];

  const birdPaths = [
    'M2 16C8 9 13 8 19 13c2 2 4 2 5 0 6-5 12-4 22 3',
    'M2 15c7-5 12-6 19-1 2 2 4 2 6 0 7-5 12-4 19 1',
    'M2 17C9 8 15 9 21 14c2 2 4 2 6 0 6-5 12-6 19 3'
  ];

  const birdEls = birdSettings.map((settings, index) => {
    const bird = document.createElement('span');
    bird.className = `shahi-bird shahi-bird--${(index % 3) + 1}`;
    bird.style.setProperty('--bird-top', `${index < 2 ? 12 : 76}%`);
    bird.style.setProperty('--bird-size', `${settings.size}px`);
    bird.style.setProperty('--bird-duration', `${settings.duration}s`);
    bird.style.setProperty('--bird-delay', `${settings.delay}s`);
    bird.style.setProperty('--bird-rise', `${settings.rise}vh`);
    bird.style.setProperty('--bird-depth', String(settings.depth));
    bird.style.setProperty('--bird-opacity', String(settings.opacity));
    bird.style.setProperty('--wing-duration', `${settings.wing}s`);
    bird.innerHTML = `
      <svg viewBox="0 0 48 24" fill="none" aria-hidden="true" focusable="false">
        <path d="${birdPaths[index % birdPaths.length]}" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" />
        <path d="M21 14.5q3 3 6 0" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" opacity=".72" />
      </svg>`;
    birdFlight.appendChild(bird);
    return bird;
  });

  const pool = document.createElement('div');
  pool.className = 'shahi-pool-effects';

  const rippleSettings = [
    { x: 24, y: 38, width: 16, duration: 8.4, delay: -1.4 },
    { x: 48, y: 68, width: 19, duration: 9.6, delay: -5.7 },
    { x: 68, y: 46, width: 15, duration: 7.8, delay: -3.3 },
    { x: 78, y: 74, width: 18, duration: 10.2, delay: -8.1 }
  ];

  rippleSettings.forEach(settings => {
    const event = document.createElement('span');
    event.className = 'shahi-pool-event';
    event.style.setProperty('--ripple-x', `${settings.x}%`);
    event.style.setProperty('--ripple-y', `${settings.y}%`);
    event.style.setProperty('--ripple-width', `${settings.width}px`);
    event.style.setProperty('--ripple-duration', `${settings.duration}s`);
    event.style.setProperty('--ripple-delay', `${settings.delay}s`);

    const drop = document.createElement('span');
    drop.className = 'shahi-pool-drop';
    const ripple = document.createElement('span');
    ripple.className = 'shahi-pool-ripple';
    event.append(drop, ripple);
    pool.appendChild(event);
  });

  layer.append(birdFlight, pool);
  hero.appendChild(layer);

  function parsePositionKeyword(token, fallback) {
    if (!token) return fallback;
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return 1;
    if (token === 'center') return 0.5;
    if (token.endsWith('%')) {
      const value = parseFloat(token);
      return Number.isFinite(value) ? value / 100 : fallback;
    }
    return fallback;
  }

  function updateArtboardGeometry() {
    const heroBox = hero.getBoundingClientRect();
    if (!heroBox.width || !heroBox.height || !backdrop) return;

    const style = getComputedStyle(backdrop);
    const bgImg = style.backgroundImage || '';
    const art = bgImg.includes('mandap-portrait') ? ARTBOARDS.portrait : ARTBOARDS.wide;

    const posTokens = (style.backgroundPosition || '50% 50%').trim().split(/\s+/);
    const posX = parsePositionKeyword(posTokens[0], 0.5);
    const posY = parsePositionKeyword(posTokens[1] || posTokens[0], 0.5);

    const scale = Math.max(heroBox.width / art.natW, heroBox.height / art.natH);
    const drawnW = art.natW * scale;
    const drawnH = art.natH * scale;
    const offsetX = (heroBox.width - drawnW) * posX;
    const offsetY = (heroBox.height - drawnH) * posY;

    const toHeroX = xNorm => Math.max(0, Math.min(heroBox.width, offsetX + xNorm * drawnW));
    const toHeroY = yNorm => Math.max(0, Math.min(heroBox.height, offsetY + yNorm * drawnH));

    // Bind water ripples strictly within visible reflection pool bounds.
    const poolLeft = toHeroX(art.pool.left);
    const poolRight = toHeroX(art.pool.right);
    const poolTop = toHeroY(art.pool.top);
    const poolBottom = toHeroY(art.pool.bottom);
    const poolW = Math.max(36, poolRight - poolLeft);
    const poolH = Math.max(18, poolBottom - poolTop);

    layer.style.setProperty('--pool-left', `${((poolLeft / heroBox.width) * 100).toFixed(2)}%`);
    layer.style.setProperty('--pool-top', `${((poolTop / heroBox.height) * 100).toFixed(2)}%`);
    layer.style.setProperty('--pool-width', `${((poolW / heroBox.width) * 100).toFixed(2)}%`);
    layer.style.setProperty('--pool-height', `${((poolH / heroBox.height) * 100).toFixed(2)}%`);

    // Place birds inside the unobstructed sky band and completely avoid #heroTitle.
    const skyBottomPx = Math.max(80, Math.min(heroBox.height * 0.56, offsetY + art.skyMaxY * drawnH));
    const skyTopPx = Math.max(8, heroBox.height * 0.025);
    const skyHeightPx = Math.max(40, skyBottomPx - skyTopPx);

    layer.style.setProperty('--sky-top', `${((skyTopPx / heroBox.height) * 100).toFixed(2)}%`);
    layer.style.setProperty('--sky-height', `${((skyHeightPx / heroBox.height) * 100).toFixed(2)}%`);

    let titleTopInSky = skyHeightPx * 0.25;
    let titleBottomInSky = skyHeightPx * 0.65;
    if (heroTitle) {
      const tRect = heroTitle.getBoundingClientRect();
      if (tRect.height > 0) {
        const relTop = (tRect.top - heroBox.top) - skyTopPx;
        const relBottom = (tRect.bottom - heroBox.top) - skyTopPx;
        titleTopInSky = Math.max(0, relTop - 16);
        titleBottomInSky = Math.min(skyHeightPx, relBottom + 14);
      }
    }

    const upperMax = Math.max(12, Math.min(titleTopInSky, skyHeightPx - 14));
    const lowerMin = Math.max(0, Math.min(titleBottomInSky, skyHeightPx - 14));
    const lowerSpan = Math.max(10, skyHeightPx - lowerMin - 12);

    birdSettings.forEach((settings, index) => {
      const bird = birdEls[index];
      let yPx;
      if (settings.band === 'upper' && upperMax >= 24) {
        yPx = Math.max(4, upperMax - 12) * settings.lane;
      } else {
        yPx = lowerMin + lowerSpan * settings.lane;
      }
      const pct = Math.max(3, Math.min(92, (yPx / skyHeightPx) * 100));
      bird.style.setProperty('--bird-top', `${pct.toFixed(1)}%`);
    });
  }

  const gateIsOpen = () => {
    if (!entry) return true;
    return !document.body.classList.contains('is-locked') && (
      document.body.classList.contains('opened') ||
      entry.hidden ||
      entry.dataset.state === 'open' ||
      entry.getAttribute('aria-hidden') === 'true'
    );
  };

  const updateActiveState = () => {
    const active = heroVisible && pageVisible && !reducedMotion.matches && gateIsOpen();
    if (active) updateArtboardGeometry();
    layer.classList.toggle('is-active', active);
  };

  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      const observation = entries[0];
      heroVisible = Boolean(observation?.isIntersecting && observation.intersectionRatio > 0.001);
      updateActiveState();
    }, { rootMargin: '0px', threshold: [0, 0.01, 0.12] });
    heroObserver.observe(hero);
  } else {
    let fallbackFrame = 0;
    const measureHero = () => {
      fallbackFrame = 0;
      const bounds = hero.getBoundingClientRect();
      heroVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      updateActiveState();
    };
    const requestMeasure = () => {
      if (!fallbackFrame) fallbackFrame = window.requestAnimationFrame(measureHero);
    };
    window.addEventListener('scroll', requestMeasure, { passive: true });
    window.addEventListener('resize', requestMeasure, { passive: true });
    measureHero();
  }

  let resizeFrame = 0;
  const scheduleGeometryUpdate = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      updateArtboardGeometry();
    });
  };
  window.addEventListener('resize', scheduleGeometryUpdate, { passive: true });

  const stateObserver = new MutationObserver(updateActiveState);
  stateObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (entry) {
    stateObserver.observe(entry, { attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'data-state'] });
  }

  const onVisibilityChange = () => {
    pageVisible = !document.hidden;
    updateActiveState();
  };

  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
  document.addEventListener('freeze', () => {
    pageVisible = false;
    updateActiveState();
  }, { passive: true });
  document.addEventListener('shahi:gate-opened', updateActiveState);
  window.addEventListener('pagehide', () => {
    pageVisible = false;
    updateActiveState();
  }, { passive: true });
  window.addEventListener('pageshow', () => {
    pageVisible = !document.hidden;
    updateActiveState();
  }, { passive: true });

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', updateActiveState);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(updateActiveState);
  }

  updateArtboardGeometry();
  updateActiveState();
})();
