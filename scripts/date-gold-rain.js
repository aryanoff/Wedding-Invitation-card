/**
 * SHAHI PATRA • Date Reveal Celebration System
 * Multi-phase festive choreography:
 * 1. Golden shimmer sweep across date shields
 * 2. Cascading shower of pink, red, and gold flower petals drifting down from the crest
 * 3. Two compact festive sky spark/firework bursts behind/above the date plaques
 * 4. Gentle golden stardust drift
 * 5. Complete DOM cleanup after 2.8s
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

    // Phase 1: Shimmer sweep across date plaques
    const plaques = root.querySelector('.date-plaques');
    if (plaques) {
      plaques.classList.add('shimmer-active');
      window.setTimeout(() => plaques.classList.remove('shimmer-active'), 1600);
    }

    const rain = document.createElement('div');
    rain.className = 'shahi-date-rain';
    rain.setAttribute('aria-hidden', 'true');
    root.append(rain);

    const random = seededRandom(20261011);

    // Phase 2: Flower Petal Shower (Gold, Pink, Ruby Red, Amber)
    const petalColors = [
      'gold',      // Warm golden silk
      'pink',      // Delicate lotus pink
      'ruby',      // Royal wedding crimson
      'amber'      // Antique marigold
    ];

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

    // Phase 3: Two Compact Festive Sky Spark/Firework Bursts
    const burstCenters = [
      { x: mobile ? 23 : 29, y: 22, delay: 475 },
      { x: mobile ? 77 : 71, y: 17, delay: 770 }
    ];

    const sparkCountPerBurst = mobile ? 14 : 22;

    burstCenters.forEach(burst => {
      window.setTimeout(() => {
        if (!rain.isConnected) return;
        for (let i = 0; i < sparkCountPerBurst; i++) {
          const spark = document.createElement('span');
          spark.className = 'shahi-firework-spark';
          const angle = (i / sparkCountPerBurst) * Math.PI * 2 + (random() - 0.5) * 0.3;
          const distance = mobile ? 22 + random() * 39 : 42 + random() * 69;
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance + 12; // slight gravity pull
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
      }, burst.delay);
    });

    // Clean complete removal after celebration
    window.setTimeout(() => {
      rain.remove();
    }, 2800);
  }

  window.ShahiDateRain = { play };
  document.addEventListener('shahi:date-revealed', play, { once: true });
})();
