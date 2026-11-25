/* ==========================================================================
   SHAHI PATRA • ROYAL WEDDING INVITATION CLIENT LOGIC
   Faithful recreation of interactive behavior, animations & W3Forms RSVP
   ========================================================================== */

(() => {
  'use strict';

  const cfg = window.WEDDING_CONFIG;
  if (!cfg) {
    console.error('config.js must be loaded before main.js');
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = reducedMotion.matches;
  const safeText = value => String(value ?? '');
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = safeText(text);
  };

  let guestCount = Number(cfg.w3forms?.defaultGuests || 2);
  let maxGuests = Number(cfg.w3forms?.maxGuests || 10);
  let toastTimer;

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3600);
  }

  function formattedDate(dateString, options = {}) {
    const date = new Date(`${dateString}T12:00:00`);
    return isNaN(date.getTime()) ? dateString : new Intl.DateTimeFormat('en-IN', options).format(date);
  }

  function formattedTime(time) {
    const [h, m] = (time || '00:00').split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  /* --------------------------------------------------------------------------
     1. POPULATE CONFIGURATION DATA
     -------------------------------------------------------------------------- */
  function populateBasics() {
    if (!cfg.brideName || !cfg.groomName) {
      console.warn('config.js: Set brideName and groomName before deployment.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.date || '')) {
      console.warn('config.js: date should follow YYYY-MM-DD format.');
    }

    document.title = `${cfg.title || 'Aditi & Rahul'} • The Wedding Invitation`;
    $('meta[name="description"]').content = `You are cordially invited to celebrate the royal wedding of ${cfg.title || 'Aditi & Rahul'}.`;

    if (cfg.devanagariHeading) setText('devanagariHeading', cfg.devanagariHeading);
    setText('heroBride', cfg.brideName || 'Aditi');
    setText('heroGroom', cfg.groomName || 'Rahul');
    setText('footerCouple', cfg.title || 'Aditi & Rahul');
    setText('introNote', cfg.introNote);
    setText('farewellText', cfg.farewell || 'Your Presence Means the World to Us');
    setText('complimentsLead', cfg.complimentsTitle || 'With Best Compliments From:');
    setText('noteLead', cfg.noteTitle || 'Things to Note');
    setText('noteText', cfg.note);
    if (cfg.rsvpPrivacyNotice) {
      setText('rsvpDisclaimer', cfg.rsvpDeadline ? `${cfg.rsvpDeadline} ${cfg.rsvpPrivacyNotice}` : cfg.rsvpPrivacyNotice);
    } else if (cfg.rsvpDeadline) {
      setText('rsvpDisclaimer', cfg.rsvpDeadline);
    }

    // Compliments lines
    const complimentsWrap = $('#complimentsLines');
    if (complimentsWrap) {
      complimentsWrap.innerHTML = '';
      (cfg.compliments || []).forEach(text => {
        const line = document.createElement('div');
        line.textContent = text;
        complimentsWrap.append(line);
      });
    }

    // Family scrolls
    const familyFields = [
      ['familyFirstName', 'familyFirstRel', 'familyFirstParents', 'familyFirstGrandLabel', 'familyFirstGrand'],
      ['familySecondName', 'familySecondRel', 'familySecondParents', 'familySecondGrandLabel', 'familySecondGrand']
    ];

    (cfg.families || []).slice(0, 2).forEach((fam, index) => {
      const fields = familyFields[index];
      setText(fields[0], fam.name);
      setText(fields[1], fam.relation);
      setText(fields[3], fam.grandparentsLabel);

      [
        [fields[2], fam.parents],
        [fields[4], fam.grandparents]
      ].forEach(([id, names]) => {
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = '';
          (names || []).forEach(name => {
            const span = document.createElement('span');
            span.textContent = name;
            container.append(span);
          });
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     2. GATE OPENING & PROGRESSIVE HERO REVEAL (UNIFIED DETERMINISTIC CONTROLLER)
     -------------------------------------------------------------------------- */
  function setUpGate(startMusicOnOpen) {
    const entry = $('#entry');
    const openBtn = $('#openInvitation');
    const main = $('#mainContent');
    if (!entry || !openBtn || !main) return;

    const leftDoor = $('.entry-door--left', entry);
    const rightDoor = $('.entry-door--right', entry);
    const letter = $('.entry-letter', entry);
    const seam = $('.entry-seam', entry);
    const duration = 2850;
    const nameCue = 2050;
    entry.style.setProperty('--gate-duration', `${duration}ms`);
    entry.dataset.state = entry.dataset.state || 'closed';
    main.inert = true;

    let activeAbort = null;
    const cubicEase = (t, x1, y1, x2, y2) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const sample = u => (((3 * (1 - u) * (1 - u) * u) * x1) + (3 * (1 - u) * u * u * x2) + (u * u * u));
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 8; i++) {
        u = (lo + hi) * 0.5;
        if (sample(u) < t) lo = u;
        else hi = u;
      }
      return ((3 * (1 - u) * (1 - u) * u) * y1) + (3 * (1 - u) * u * u * y2) + (u * u * u);
    };
    const lerp = (a, b, p) => a + (b - a) * p;

    function clearInlineGateStyles() {
      [letter, leftDoor, rightDoor, seam].forEach(el => {
        if (!el) return;
        el.style.removeProperty('transform');
        el.style.removeProperty('opacity');
      });
      delete entry.dataset.gateFallback;
      delete entry.dataset.gateStage;
    }

    function applyRafFrame(ratio, portraitLayout) {
      // Piecewise choreography synchronized to styles.css @keyframes percentages
      if (letter) {
        const lp = ratio <= 0.03 ? 0 : Math.min(1, (ratio - 0.03) / 0.205);
        const eased = cubicEase(lp, 0.34, 0.04, 0.24, 1);
        if (portraitLayout) {
          const yPct = eased <= 0.46
            ? lerp(0, -27, eased / 0.46)
            : lerp(-27, -174, (eased - 0.46) / 0.54);
          const rot = eased <= 0.46
            ? lerp(0, 26, eased / 0.46)
            : lerp(26, 55, (eased - 0.46) / 0.54);
          const sc = lerp(1, 0.94, eased);
          letter.style.transform = `translate3d(-50%, ${yPct.toFixed(2)}%, ${(eased <= 0.46 ? 3 : 0)}px) rotateX(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        } else {
          const x = eased <= 0.46 ? lerp(-50, -31, eased / 0.46) : lerp(-31, 62, (eased - 0.46) / 0.54);
          const rot = lerp(0, -47, eased);
          letter.style.transform = `translate3d(${x.toFixed(2)}%, ${(-2 * eased).toFixed(2)}%, ${(eased <= 0.46 ? 3 : 0)}px) rotateY(${rot.toFixed(2)}deg)`;
        }
        const op = lp <= 0.46 ? 1 : Math.max(0, 1 - (lp - 0.46) / 0.54);
        letter.style.opacity = String(op.toFixed(3));
      }

      const dp = ratio <= 0.26 ? 0 : Math.min(1, (ratio - 0.26) / 0.74);
      let doorShift = 0;
      let doorAngle = 0;
      if (dp > 0) {
        if (dp <= 0.243) {
          const s = cubicEase(dp / 0.243, 0.45, 0.04, 0.42, 1);
          doorShift = lerp(0, 8, s);
          doorAngle = lerp(0, 12, s);
        } else if (dp <= 0.703) {
          const s = cubicEase((dp - 0.243) / 0.46, 0.26, 0.58, 0.18, 1);
          doorShift = lerp(8, 81, s);
          doorAngle = lerp(12, 23, s);
        } else {
          const s = cubicEase((dp - 0.703) / 0.297, 0.25, 0.46, 0.45, 0.94);
          doorShift = lerp(81, 111, s);
          doorAngle = lerp(23, 26, s);
        }
      }
      if (leftDoor) leftDoor.style.transform = `translate3d(${(-doorShift).toFixed(2)}%, 0, 0) rotateY(${(-doorAngle).toFixed(2)}deg)`;
      if (rightDoor) rightDoor.style.transform = `translate3d(${doorShift.toFixed(2)}%, 0, 0) rotateY(${doorAngle.toFixed(2)}deg)`;

      if (seam) {
        if (ratio <= 0.24 || ratio >= 0.43) {
          seam.style.opacity = '0';
        } else if (ratio <= 0.31) {
          const sp = (ratio - 0.24) / 0.07;
          seam.style.opacity = (0.76 * sp).toFixed(3);
          seam.style.transform = `translate(-50%, -50%) ${portraitLayout ? `scaleY(${lerp(0.12, 1, sp).toFixed(3)})` : `scaleX(${lerp(0.06, 1, sp).toFixed(3)})`}`;
        } else {
          const sp = (ratio - 0.31) / 0.12;
          seam.style.opacity = (0.76 * (1 - sp)).toFixed(3);
          seam.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      }
    }

    function playGate(portraitLayout) {
      return new Promise(resolve => {
        let elapsed = 0;
        let resumedAt = null;
        let timer = 0;
        let verifyFrame = 0;
        let rafLoop = 0;
        let pageAway = false;
        let namesShown = false;
        let doorFinished = false;
        let useRafFallback = false;
        let settled = false;

        const finish = motion => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (verifyFrame) cancelAnimationFrame(verifyFrame);
          if (rafLoop) cancelAnimationFrame(rafLoop);
          lastListeners(false);
          clearInlineGateStyles();
          if (activeAbort === abortRun) activeAbort = null;
          resolve(motion);
        };

        const abortRun = () => finish('aborted');
        activeAbort = abortRun;

        const tickRafFallback = () => {
          if (settled || !useRafFallback) return;
          if (!pageAway && !document.hidden) {
            const now = performance.now();
            resumedAt ??= now;
            const fg = elapsed + (now - resumedAt);
            applyRafFrame(Math.min(1, fg / duration), portraitLayout);
            if (fg >= duration) {
              finish('cinematic');
              return;
            }
          }
          rafLoop = requestAnimationFrame(tickRafFallback);
        };

        const activateRafFallback = () => {
          if (settled || useRafFallback || reducedMotion.matches) return;
          useRafFallback = true;
          entry.dataset.gateFallback = 'raf';
          const fg = elapsed + (resumedAt === null ? 0 : performance.now() - resumedAt);
          applyRafFrame(Math.min(1, fg / duration), portraitLayout);
          rafLoop = requestAnimationFrame(tickRafFallback);
        };

        function syncClock() {
          if (settled) return;
          clearTimeout(timer);
          const now = performance.now();
          if (pageAway || document.hidden) {
            if (resumedAt !== null) elapsed += now - resumedAt;
            resumedAt = null;
            entry.dataset.gatePaused = '';
            return;
          }

          delete entry.dataset.gatePaused;
          resumedAt ??= now;
          const foregroundMs = elapsed + now - resumedAt;
          if (foregroundMs >= nameCue && !namesShown) {
            namesShown = true;
            entry.dataset.gateStage = 'hero-names';
            document.body.classList.add('opened');
          } else if (foregroundMs >= duration * 0.26 && !namesShown) {
            entry.dataset.gateStage = 'curtains';
          } else if (foregroundMs >= duration * 0.03 && !entry.dataset.gateStage) {
            entry.dataset.gateStage = 'letter-fold';
          }
          const completionCue = doorFinished || useRafFallback ? duration : duration + 120;
          if (foregroundMs >= completionCue) {
            finish('cinematic');
            return;
          }
          const nextCue = namesShown ? completionCue : nameCue;
          timer = setTimeout(syncClock, Math.max(16, Math.ceil(nextCue - foregroundMs)));
        }

        function onDoorEnd(event) {
          if (event.target === rightDoor && event.animationName === 'shahi-gate-door' &&
              event.elapsedTime * 1000 >= duration - 24) {
            doorFinished = true;
            syncClock();
          }
        }
        function onAnimationCancel(event) {
          if ((event.target === rightDoor || event.target === letter) &&
              !settled && !pageAway && !document.hidden && !reducedMotion.matches) {
            activateRafFallback();
          }
        }
        function onPageHide() { pageAway = true; syncClock(); }
        function onPageShow() { pageAway = false; syncClock(); }
        function onMotionChange() { if (reducedMotion.matches) finish('reduced'); }

        function lastListeners(attach) {
          const method = attach ? 'addEventListener' : 'removeEventListener';
          rightDoor?.[method]('animationend', onDoorEnd);
          rightDoor?.[method]('animationcancel', onAnimationCancel);
          letter?.[method]('animationcancel', onAnimationCancel);
          document[method]('visibilitychange', syncClock);
          document[method]('freeze', onPageHide);
          window[method]('pagehide', onPageHide);
          window[method]('pageshow', onPageShow);
          if (reducedMotion.addEventListener && reducedMotion.removeEventListener) {
            reducedMotion[method]('change', onMotionChange);
          } else if (attach) {
            reducedMotion.addListener?.(onMotionChange);
          } else {
            reducedMotion.removeListener?.(onMotionChange);
          }
        }

        lastListeners(true);
        entry.dataset.gateStage = 'tap';
        syncClock();

        // Detect disabled/0s CSS keyframes when prefers-reduced-motion is NOT requested.
        verifyFrame = requestAnimationFrame(() => {
          verifyFrame = 0;
          if (settled || useRafFallback || reducedMotion.matches || !rightDoor) return;
          const doorStyle = getComputedStyle(rightDoor);
          const animDur = parseFloat(doorStyle.animationDuration) || 0;
          if (doorStyle.animationName === 'none' || animDur <= 0.05) {
            activateRafFallback();
          }
        });
      });
    }

    async function openGate() {
      if (entry.dataset.state && entry.dataset.state !== 'closed') return;
      if (activeAbort) activeAbort();
      const started = performance.now();
      const anchor = location.hash.slice(1);
      const motion = reducedMotion.matches ? 'reduced' : 'cinematic';
      const portraitLayout = matchMedia('(max-width: 640px)').matches;
      clearInlineGateStyles();
      entry.dataset.gateMotion = motion;
      entry.dataset.gateLayout = portraitLayout ? 'portrait' : 'wide';
      entry.dataset.state = 'opening';
      openBtn.disabled = true;
      window.scrollTo({ top: 0, behavior: 'instant' });
      startMusicOnOpen?.();

      const completedMotion = motion === 'cinematic' ? await playGate(portraitLayout) : motion;
      if (completedMotion === 'aborted') return;

      document.body.classList.add('opened');
      entry.hidden = true;
      entry.dataset.state = 'open';
      entry.dataset.gateMotion = completedMotion;
      delete entry.dataset.gatePaused;
      delete entry.dataset.gateFallback;
      delete entry.dataset.gateStage;
      entry.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      main.inert = false;
      main.focus({ preventScroll: true });
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'instant' });
      document.dispatchEvent(new CustomEvent('shahi:gate-opened', {
        detail: { motion: completedMotion, durationMs: Math.round(performance.now() - started) }
      }));
    }

    openBtn.addEventListener('click', openGate);

    // Replay button in footer
    $('#replayInvitation')?.addEventListener('click', () => {
      if (entry.dataset.state !== 'open') return;
      if (activeAbort) activeAbort();
      window.scrollTo({ top: 0, behavior: 'instant' });
      clearInlineGateStyles();
      entry.hidden = false;
      entry.dataset.state = 'closed';
      delete entry.dataset.gateMotion;
      delete entry.dataset.gateLayout;
      delete entry.dataset.gatePaused;
      entry.removeAttribute('aria-hidden');
      document.body.classList.remove('opened');
      document.body.classList.add('is-locked');
      main.inert = true;
      openBtn.disabled = false;
      openBtn.focus();
    });
  }

  /* --------------------------------------------------------------------------
     3. SAVE THE DATE (SLOT MACHINE REEL REVEAL)
     -------------------------------------------------------------------------- */
  function setUpDateReveal() {
    const rawDt = new Date(`${cfg.date}T12:00:00`);
    const dt = isNaN(rawDt.getTime()) ? new Date('2026-10-11T12:00:00') : rawDt;
    const values = [
      String(dt.getDate()).padStart(2, '0'),
      dt.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
      String(dt.getFullYear())
    ];

    const ids = ['dateDay', 'dateMonth', 'dateYear'];
    const btn = $('#dateRevealBtn');
    const stage = $('#dateStage');
    const blessing = $('#dateBlessing');
    const saveText = $('#dateSaveText');
    if (!btn || !stage) return;

    let state = 'hidden';

    const easeReel = t => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const sample = u => (((3 * (1 - u) * (1 - u) * u) * 0.22) + (3 * (1 - u) * u * u * 0.23) + (u * u * u));
      let lo = 0, hi = 1, u = t;
      for (let i = 0; i < 8; i++) {
        u = (lo + hi) * 0.5;
        if (sample(u) < t) lo = u;
        else hi = u;
      }
      return ((3 * (1 - u) * (1 - u) * u) * 0.68) + (3 * (1 - u) * u * u * 1.0) + (u * u * u);
    };

    btn.addEventListener('click', () => {
      if (state === 'revealed') {
        downloadCalendar();
        return;
      }
      if (state === 'spinning') return;

      state = 'spinning';
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      stage.classList.add('is-spinning');

      const finalize = () => {
        ids.forEach((id, i) => setText(id, values[i]));
        stage.classList.remove('is-spinning');
        stage.classList.add('is-revealed');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        state = 'revealed';
        btn.hidden = true;
        if (saveText) {
          saveText.hidden = false;
          saveText.focus({ preventScroll: true });
        }
        if (blessing) {
          blessing.textContent = '';
          blessing.hidden = true;
        }
        requestAnimationFrame(() => {
          document.dispatchEvent(new CustomEvent('shahi:date-revealed', {
            detail: { day: values[0], month: values[1], year: values[2] }
          }));
        });
      };

      if (reducedMotion.matches) {
        finalize();
        return;
      }

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const sequences = [
        Array.from({ length: 14 }, (_, i) => String((i * 3 + 3) % 31 + 1).padStart(2, '0')),
        Array.from({ length: 15 }, (_, i) => months[(dt.getMonth() + i + 2) % 12]),
        Array.from({ length: 16 }, (_, i) => String(dt.getFullYear() - 4 + (i % 8)))
      ];
      const reels = ids.map((id, index) => {
        const value = document.getElementById(id);
        const sequence = ['', ...sequences[index], values[index]];
        value.replaceChildren(...sequence.map(item => {
          const row = document.createElement('span');
          row.textContent = item;
          return row;
        }));
        const shift = -100 * (sequence.length - 1);
        return { value, shift, offset: `${shift}%`, duration: 1420 + index * 155 };
      });

      const totalDuration = reels.at(-1).duration;
      const reelProgress = reels.map(() => 0);
      const reelFinished = reels.map(() => false);
      let animations = [];
      const lifecyclePaused = new Set();
      let cssFallback = false;
      let rafFallback = false;
      let rafId = 0;
      let verifyCssFrame = 0;
      let elapsed = 0;
      let resumedAt = null;
      let pageAway = false;
      let timer;
      let settled = false;

      const foregroundTime = (now = performance.now()) =>
        elapsed + (resumedAt === null ? 0 : now - resumedAt);

      function pauseMotion() {
        stage.classList.add('is-date-paused');
        animations.forEach(animation => {
          if (animation.playState !== 'running' && animation.playState !== 'pending') return;
          try {
            animation.pause();
            lifecyclePaused.add(animation);
          } catch {}
        });
      }

      function resumeMotion() {
        stage.classList.remove('is-date-paused');
        lifecyclePaused.forEach(animation => {
          if (animation.playState === 'finished' || animation.playState === 'idle') return;
          try { animation.play(); } catch {}
        });
        lifecyclePaused.clear();
      }

      function clearReelProperties() {
        reels.forEach(({ value }) => {
          value.style.removeProperty('--reel-offset');
          value.style.removeProperty('--reel-duration');
          value.style.removeProperty('--reel-delay');
          value.style.removeProperty('transform');
        });
      }

      function stopAnimations() {
        lifecyclePaused.clear();
        animations.forEach(animation => {
          animation.finished.catch(() => {});
          try { animation.cancel(); } catch {}
        });
        animations = [];
      }

      function applyRafReels() {
        if (settled || !rafFallback) return;
        const fg = foregroundTime();
        reels.forEach(({ value, shift, offset, duration }, index) => {
          const p = Math.max(fg, reelProgress[index]);
          if (reelFinished[index] || p >= duration) {
            reelFinished[index] = true;
            value.style.transform = `translateY(${offset})`;
          } else {
            const ratio = Math.min(1, Math.max(0, p / duration));
            value.style.transform = `translateY(${(shift * easeReel(ratio)).toFixed(3)}%)`;
          }
        });
        if (fg < totalDuration) {
          rafId = requestAnimationFrame(applyRafReels);
        }
      }

      function activateRafReels() {
        if (settled || rafFallback || reducedMotion.matches) return;
        const fg = foregroundTime();
        reels.forEach(({ duration }, index) => {
          const anim = animations[index];
          const animTime = anim && typeof anim.currentTime === 'number' ? anim.currentTime : 0;
          reelProgress[index] = Math.max(reelProgress[index], Math.min(duration, Math.max(fg, animTime)));
          if (anim?.playState === 'finished' || reelProgress[index] >= duration) reelFinished[index] = true;
        });
        rafFallback = true;
        cssFallback = false;
        stopAnimations();
        stage.classList.remove('is-css-spinning');
        applyRafReels();
      }

      function onReelCssCancel() {
        if (!settled && cssFallback && !pageAway && !document.hidden && !reducedMotion.matches) {
          activateRafReels();
        }
      }

      function activateCssFallback() {
        if (settled || cssFallback || rafFallback) return;
        const fg = foregroundTime();
        reels.forEach(({ duration }, index) => {
          const anim = animations[index];
          const animTime = anim && typeof anim.currentTime === 'number' ? anim.currentTime : 0;
          reelProgress[index] = Math.max(reelProgress[index], Math.min(duration, Math.max(fg, animTime)));
          if (anim?.playState === 'finished' || reelProgress[index] >= duration) reelFinished[index] = true;
        });
        cssFallback = true;
        stopAnimations();
        reels.forEach(({ value, offset, duration }, index) => {
          if (reelFinished[index]) {
            value.style.transform = `translateY(${offset})`;
            return;
          }
          value.style.setProperty('--reel-offset', offset);
          value.style.setProperty('--reel-duration', `${duration}ms`);
          value.style.setProperty('--reel-delay', `${-reelProgress[index]}ms`);
          value.addEventListener('animationcancel', onReelCssCancel, { once: true });
        });
        void stage.offsetWidth;
        stage.classList.add('is-css-spinning');
        if (pageAway || document.hidden) stage.classList.add('is-date-paused');

        verifyCssFrame = requestAnimationFrame(() => {
          verifyCssFrame = 0;
          if (settled || rafFallback || reducedMotion.matches) return;
          const activeReel = reels.find((_, idx) => !reelFinished[idx]);
          if (!activeReel) return;
          const rs = getComputedStyle(activeReel.value);
          if (rs.animationName === 'none' || (parseFloat(rs.animationDuration) || 0) <= 0.05) {
            activateRafReels();
          }
        });
      }

      function cleanupController() {
        clearTimeout(timer);
        if (rafId) cancelAnimationFrame(rafId);
        if (verifyCssFrame) cancelAnimationFrame(verifyCssFrame);
        reels.forEach(({ value }) => value.removeEventListener('animationcancel', onReelCssCancel));
        document.removeEventListener('visibilitychange', syncClock);
        document.removeEventListener('freeze', onPageHide);
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
        if (reducedMotion.removeEventListener) reducedMotion.removeEventListener('change', onMotionChange);
        else reducedMotion.removeListener(onMotionChange);
        stopAnimations();
        stage.classList.remove('is-css-spinning', 'is-date-paused');
        clearReelProperties();
      }

      function finish() {
        if (settled) return;
        settled = true;
        cleanupController();
        finalize();
      }

      function syncClock() {
        if (settled) return;
        clearTimeout(timer);
        const now = performance.now();
        if (pageAway || document.hidden) {
          if (resumedAt !== null) elapsed += now - resumedAt;
          resumedAt = null;
          pauseMotion();
          return;
        }

        resumedAt ??= now;
        resumeMotion();
        const remaining = totalDuration - foregroundTime(now);
        if (remaining <= 0) {
          finish();
          return;
        }
        timer = setTimeout(syncClock, Math.max(16, Math.ceil(remaining)));
      }

      function onPageHide() {
        pageAway = true;
        syncClock();
      }

      function onPageShow() {
        pageAway = false;
        syncClock();
      }

      function onMotionChange() {
        if (reducedMotion.matches) finish();
      }

      try {
        for (const { value, offset, duration } of reels) {
          animations.push(value.animate([
            { transform: 'translateY(0)' },
            { transform: `translateY(${offset})` }
          ], { duration, easing: 'cubic-bezier(.22,.68,.23,1)', fill: 'forwards' }));
        }
      } catch {
        activateCssFallback();
      }

      if (!cssFallback) {
        animations.forEach((animation, index) => {
          animation.finished.then(
            () => {
              reelFinished[index] = true;
              reelProgress[index] = reels[index].duration;
            },
            () => {
              if (!settled && !reelFinished[index]) activateCssFallback();
            }
          );
        });
      }

      document.addEventListener('visibilitychange', syncClock);
      document.addEventListener('freeze', onPageHide);
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', onPageShow);
      if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
      else reducedMotion.addListener(onMotionChange);
      syncClock();
    });
  }

  /* --------------------------------------------------------------------------
     4. HANGING LOVE-STORY GALLERY (RAIL-SLIDE SYSTEM WITH SUSPENSION CORDS)
     -------------------------------------------------------------------------- */
  function buildGallery() {
    const track = $('#galleryTrack');
    if (!track) return;

    const HANG_HEIGHTS = [118, 86, 150, 120, 132]; // Original inspected hang heights

    track.innerHTML = '';
    (cfg.gallery || []).forEach((item, index) => {
      const hang = HANG_HEIGHTS[index % HANG_HEIGHTS.length];
      const card = document.createElement('article');
      const typeClass = item.type === 'story'
        ? 'gframe--story'
        : (item.orientation === 'landscape' ? 'gframe--landscape' : 'gframe--portrait');

      card.className = `gframe ${typeClass}`;
      card.style.setProperty('--hang', `${hang}px`);
      card.style.setProperty('--rotation', `${item.rotation || 0}deg`);
      card.setAttribute('aria-label', `Memory ${index + 1}`);

      // Hook connecting to rail
      const hook = document.createElement('div');
      hook.className = 'gframe__hook';
      hook.setAttribute('aria-hidden', 'true');
      card.append(hook);

      // V-Cord SVG with fine cord lines
      const cordSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      cordSvg.setAttribute('class', 'gframe__cord');
      cordSvg.setAttribute('viewBox', `0 0 100 ${hang}`);
      cordSvg.setAttribute('preserveAspectRatio', 'none');
      cordSvg.setAttribute('aria-hidden', 'true');
      cordSvg.innerHTML = `
        <path d="M50 0L12 ${hang}M50 0L88 ${hang}" vector-effect="non-scaling-stroke"/>
        <path class="gframe__twist" d="M50 0L12 ${hang}M50 0L88 ${hang}" vector-effect="non-scaling-stroke"/>
      `;
      card.append(cordSvg);

      // 3D Frame Body
      const body = document.createElement('div');
      body.className = 'gframe__body';

      ['top', 'right', 'bottom', 'left'].forEach(side => {
        const s = document.createElement('div');
        s.className = `gframe__side gframe__side--${side}`;
        s.setAttribute('aria-hidden', 'true');
        body.append(s);
      });

      const face = document.createElement('div');
      face.className = 'gframe__face';

      const lip = document.createElement('div');
      lip.className = 'gframe__lip';
      lip.setAttribute('aria-hidden', 'true');
      face.append(lip);

      const mat = document.createElement('div');
      mat.className = 'gframe__mat';

      if (item.type === 'story') {
        const quote = document.createElement('div');
        quote.className = 'gframe__quote';
        quote.textContent = item.text || '';
        mat.append(quote);
      } else {
        const imgPath = item.localImage || item.image || `assets/photos/photo-${((index % 3) + 1)}.jpg`;
        const img = document.createElement('img');
        img.className = 'gframe__photo';
        img.src = imgPath;
        img.draggable = false;
        img.alt = item.caption || `Couple photograph ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = () => {
          img.onerror = null;
          img.src = `assets/photos/photo-${((index % 3) + 1)}.jpg`;
        };
        mat.append(img);

        if (item.caption) {
          const caption = document.createElement('p');
          caption.className = 'gframe__caption';
          caption.textContent = item.caption;
          mat.append(caption);
        }
      }

      face.append(mat);
      body.append(face);
      card.append(body);
      track.append(card);
    });

    const cards = [...track.children];
    if (!cards.length) return;
    const dismissHint = () => $('#ryGalleryHint')?.classList.add('is-hidden');
    const nearestFrame = () => cards.reduce((best, card, index) => {
      const center = track.scrollLeft + track.clientWidth / 2;
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
    const scrollToIndex = index => {
      const target = cards[Math.min(Math.max(index, 0), cards.length - 1)];
      if (target) {
        const targetLeft = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2;
        track.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
    };

    // Keyboard support
    track.addEventListener('keydown', e => {
      const direction = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!direction && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      dismissHint();
      if (direction) scrollToIndex(nearestFrame() + direction);
      else track.scrollTo({ left: e.key === 'Home' ? 0 : track.scrollWidth, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });

    // Mouse and Touch drag-to-glide rail mechanism with physical suspension kinetics
    let drag = null;
    let dampAnimFrame = 0;
    const clamp = (value, max) => Math.max(-max, Math.min(max, value));
    const applySwing = (angleOffset, torsionOffset = 0) => {
      cards.forEach((card, i) => {
        const weight = [1, .8, .66, .86, .95][i % 5];
        card.style.setProperty('--swing', `${angleOffset * weight}deg`);
        card.style.setProperty('--torsion', `${torsionOffset * weight}deg`);
      });
    };

    function settle(velocity, coast) {
      cancelAnimationFrame(dampAnimFrame);
      if (reducedMotion.matches) return applySwing(0);
      const start = performance.now();
      const left = track.scrollLeft;
      const distance = coast ? clamp(-velocity * 165, 250) : 0;
      const angle = clamp(-velocity * 4, 5.5);
      const draw = time => {
        const elapsed = time - start;
        const decay = Math.exp(-elapsed / 210);
        if (distance) track.scrollLeft = left + distance * (1 - Math.exp(-elapsed / 125));
        applySwing(angle * decay * Math.cos(elapsed / 88), -angle * 1.35 * decay * Math.cos(elapsed / 77));
        if (elapsed < 820) dampAnimFrame = requestAnimationFrame(draw);
        else applySwing(0);
      };
      dampAnimFrame = requestAnimationFrame(draw);
    }

    track.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0) return;
      cancelAnimationFrame(dampAnimFrame);
      applySwing(0);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, previousX: e.clientX,
        time: performance.now(), left: track.scrollLeft, velocity: 0, engaged: false };
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (e.pointerId !== drag?.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.engaged) {
        if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(dy)) return;
        drag.engaged = true;
        track.classList.add('is-dragging');
        dismissHint();
      }
      const now = performance.now();
      const velocity = (e.clientX - drag.previousX) / Math.max(8, now - drag.time);
      drag.velocity = drag.velocity * .42 + velocity * .58;
      drag.previousX = e.clientX;
      drag.time = now;
      track.scrollLeft = drag.left - dx;
      if (!reducedMotion.matches) applySwing(clamp(-drag.velocity * 4, 5.5), clamp(drag.velocity * 6, 8));
    });
    function release(e) {
      if (e.pointerId !== drag?.id) return;
      const velocity = performance.now() - drag.time < 95 ? drag.velocity : 0;
      const engaged = drag.engaged;
      drag = null;
      track.classList.remove('is-dragging');
      if (engaged) settle(velocity, e.type === 'pointerup');
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('lostpointercapture', release);
    track.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      dismissHint();
      cancelAnimationFrame(dampAnimFrame);
      settle(-e.deltaX / 24, false);
    }, { passive: true });
  }

  /* --------------------------------------------------------------------------
     5. 3+2 SYMMETRICAL CEREMONIES CARDS
     -------------------------------------------------------------------------- */
  function mapsUrl(ceremony) {
    return ceremony.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ceremony.venue || '')}`;
  }

  function createCeremonyCard(c) {
    const card = document.createElement('article');
    card.className = 'ceremony-card reveal';

    const inner = document.createElement('div');
    inner.className = 'ceremony-card__inner';

    const image = document.createElement('img');
    image.className = 'ceremony-illustration';
    image.alt = `${c.name} illustration`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = `assets/media/${c.art || 'mehendi.webp'}`;
    image.onerror = () => {
      image.src = 'assets/fallback/lotus.svg';
    };

    const heading = document.createElement('h3');
    heading.textContent = c.name;

    const location = document.createElement('div');
    location.className = 'ceremony-location';

    const locationText = document.createElement('span');
    locationText.textContent = c.venue;

    const map = document.createElement('a');
    map.href = mapsUrl(c);
    map.target = '_blank';
    map.rel = 'noopener noreferrer';
    map.className = 'map-link';
    map.title = `Directions to ${c.venue}`;
    map.setAttribute('aria-label', `Get directions to ${c.venue}`);
    map.textContent = '⌖';

    location.append(locationText, map);

    const meta = document.createElement('div');
    meta.className = 'ceremony-meta';

    const date = document.createElement('span');
    date.textContent = formattedDate(c.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const time = document.createElement('span');
    time.textContent = formattedTime(c.time);

    meta.append(date, time);
    inner.append(image, heading, location, meta);
    card.append(inner);
    return card;
  }

  function buildCeremonies() {
    const rowTop = $('#ceremonyRowTop');
    const rowBottom = $('#ceremonyRowBottom');
    if (!rowTop || !rowBottom) return;

    rowTop.innerHTML = '';
    rowBottom.innerHTML = '';

    const ceremonies = cfg.ceremonies || [];
    // Row 1: 3 cards
    ceremonies.slice(0, 3).forEach(c => rowTop.append(createCeremonyCard(c)));
    // Row 2: 2 centered cards
    ceremonies.slice(3, 5).forEach(c => rowBottom.append(createCeremonyCard(c)));
  }

  /* --------------------------------------------------------------------------
     6. INLINE RSVP FIELDS (W3FORMS ADAPTER)
     -------------------------------------------------------------------------- */
  function buildRsvpFields() {
    const wrap = $('#rsvpEventRows');
    if (!wrap) return;

    wrap.innerHTML = '';
    (cfg.ceremonies || []).forEach((c, index) => {
      const row = document.createElement('div');
      row.className = 'rsvp-event-row';

      const info = document.createElement('div');
      info.className = 'rsvp-event-info';

      const name = document.createElement('strong');
      name.textContent = c.name;

      const date = document.createElement('small');
      date.textContent = formattedDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' });

      info.append(name, date);
      row.append(info);

      const opts = document.createElement('div');
      opts.className = 'rsvp-choices';

      name.id = `rsvp-event-name-${index}`;
      opts.setAttribute('role', 'radiogroup');
      opts.setAttribute('aria-labelledby', name.id);
      ['Yes', 'Maybe', 'No'].forEach(choice => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `event_${index}`;
        input.value = choice;
        input.required = true;

        const span = document.createElement('span');
        span.textContent = choice;

        label.append(input, span);
        opts.append(label);
      });

      row.append(opts);
      wrap.append(row);
    });

    // Guest counter stepper
    const updateCount = () => {
      setText('guestCount', guestCount);
      const hiddenCount = $('#rsvpGuestCount');
      if (hiddenCount) hiddenCount.value = String(guestCount);
    };

    $('#guestMinus')?.addEventListener('click', () => {
      guestCount = Math.max(1, guestCount - 1);
      updateCount();
    });

    $('#guestPlus')?.addEventListener('click', () => {
      guestCount = Math.min(maxGuests, guestCount + 1);
      updateCount();
    });

    updateCount();
  }

  /* --------------------------------------------------------------------------
     7. CALENDAR EXPORT (.ICS) & WHATSAPP SHARE
     -------------------------------------------------------------------------- */
  function escapeIcs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r?\n/g, '\\n');
  }

  function dtIcs(date, time = '18:00') {
    return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  }

  function dtPlus(date, time) {
    const d = new Date(`${date}T${time || '18:00'}:00`);
    d.setHours(d.getHours() + 3);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  }

  function downloadCalendar() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const tzid = safeText(cfg.timeZone || 'Asia/Kolkata').trim() || 'Asia/Kolkata';
    const events = (cfg.ceremonies || []).map((c, index) => [
      'BEGIN:VEVENT',
      `UID:wedding-${index}-${cfg.date}@shahi-patra.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${tzid}:${dtIcs(c.date, c.time)}`,
      `DTEND;TZID=${tzid}:${dtPlus(c.date, c.time)}`,
      `SUMMARY:${escapeIcs(`${cfg.title} - ${c.name}`)}`,
      `LOCATION:${escapeIcs(c.venue)}`,
      `DESCRIPTION:${escapeIcs(`Wedding celebration for ${cfg.title}`)}`,
      'END:VEVENT'
    ].join('\r\n')).join('\r\n');

    const content = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Editable Shahi Patra//EN\r\nCALSCALE:GREGORIAN\r\n${events}\r\nEND:VCALENDAR\r\n`;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wedding-celebrations.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Calendar invitation downloaded');
  }

  function shareWhatsapp() {
    const url = cfg.invitationUrl || (location.protocol.startsWith('http') ? location.href.split('#')[0] : '');
    const message = `You are cordially invited to celebrate the royal wedding of ${cfg.title}! 💐\n${formattedDate(cfg.date, { day: 'numeric', month: 'long', year: 'numeric' })}${url ? `\n${url}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  /* --------------------------------------------------------------------------
     8. W3FORMS SUBMISSION HANDLER
     -------------------------------------------------------------------------- */
  async function submitRsvp(event) {
    event.preventDefault();
    const form = $('#rsvpForm');
    const status = $('#rsvpSuccess');
    const submitBtn = $('#submitRsvpBtn');
    if (!form || !status || !submitBtn) return;

    status.hidden = true;
    if (!form.reportValidity()) return;

    const provider = cfg.w3forms?.provider === 'server' ? 'server' : 'web3forms';
    const raw = new FormData(form);
    const phone = safeText(raw.get('phone')).trim();
    if (!/^[+0-9()\s-]{8,18}$/.test(phone)) {
      toast('Please enter a valid mobile number');
      $('#rsvpForm [name="phone"]')?.focus();
      return;
    }

    if (raw.get('botcheck')) {
      console.warn('Bot submission blocked');
      return;
    }

    const accessKey = safeText(cfg.w3forms?.accessKey || '').trim();
    if (provider !== 'server' && (!accessKey || /^(YOUR_|PASTE_|REPLACE_)/i.test(accessKey))) {
      status.hidden = false;
      status.classList.add('is-error');
      status.textContent = 'RSVP delivery is not configured yet. Add your W3Forms access key in config.js.';
      toast('Add your W3Forms access key before accepting RSVPs');
      return;
    }

    // Disable button & indicate progress
    submitBtn.disabled = true;
    const btnSpan = submitBtn.querySelector('span');
    if (btnSpan) btnSpan.textContent = 'Sending RSVP…';

    try {
      let response;
      if (provider === 'server') {
        const responses = (cfg.ceremonies || []).map((ceremony, index) => ({
          event: ceremony.name,
          date: ceremony.date,
          response: safeText(raw.get(`event_${index}`) || 'No')
        }));
        response = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: safeText(raw.get('name')).trim(),
            phone,
            guestCount,
            responses,
            message: safeText(raw.get('message')).trim()
          }),
          signal: AbortSignal.timeout(20000)
        });
      } else {
        const payload = new FormData();
        payload.set('access_key', accessKey);
        payload.set('subject', `Wedding RSVP - ${cfg.title}`);
        payload.set('name', safeText(raw.get('name')).trim());
        payload.set('phone', phone);
        payload.set('guest_count', String(guestCount));
        payload.set('message', safeText(raw.get('message')).trim());
        payload.set('event_date', safeText(cfg.date));

        const responses = [];
        (cfg.ceremonies || []).forEach((ceremony, index) => {
          const reply = safeText(raw.get(`event_${index}`) || 'No');
          const label = `${ceremony.name} (${formattedDate(ceremony.date, { day: 'numeric', month: 'short' })})`;
          payload.append(`RSVP_${ceremony.name}`, reply);
          responses.push(`${label}: ${reply}`);
        });
        payload.set('event_responses', responses.join(' | '));

        response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: payload,
          signal: AbortSignal.timeout(20000)
        });
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok || (result.success !== true && result.ok !== true)) {
        throw new Error(result.error || result.message || `Submission failed (HTTP ${response.status})`);
      }

      status.hidden = false;
      status.classList.remove('is-error');
      status.textContent = 'Thank you! Your RSVP was submitted.';
      if (btnSpan) btnSpan.textContent = '♥ RSVP Sent';
      toast('RSVP received successfully');

      // Reset form
      form.reset();
      guestCount = Number(cfg.w3forms?.defaultGuests || 2);
      setText('guestCount', guestCount);
      const hiddenCount = $('#rsvpGuestCount');
      if (hiddenCount) hiddenCount.value = String(guestCount);

    } catch (error) {
      status.hidden = false;
      status.classList.add('is-error');
      status.textContent = `Could not send your RSVP (${error.message}). Your response was NOT delivered. Please check the access key or allowed domain settings in your Web3Forms dashboard.`;
      if (btnSpan) btnSpan.textContent = '♥ Retry RSVP';
      submitBtn.disabled = false;
      console.warn('RSVP delivery failed:', error);
      toast('RSVP not delivered — please retry');
    }
  }

  /* --------------------------------------------------------------------------
     9. AUDIO CONTROLS & INTERACTION SETUP
     -------------------------------------------------------------------------- */
  function setUpAudio() {
    const musicBtn = $('#musicToggle');
    const audio = $('#weddingAudio');
    if (!musicBtn || !audio) return;

    const configured = Boolean(cfg.music);
    if (configured) audio.src = cfg.music;
    const volume = Number(cfg.musicVolume ?? .5);
    audio.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : .5;

    let handledFirstGesture = false;
    let wantsPlayback = false;
    let reachedPlayback = false;
    let awaitingResumeConfirm = false;
    let resumeOnReturn = false;
    let pageAway = false;
    let playRequest = 0;
    const isAway = () => document.hidden || pageAway;

    function syncButton() {
      const playing = !audio.paused && !audio.ended && !isAway();
      musicBtn.classList.toggle('playing', playing);
      musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      musicBtn.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
    }

    function startPlayback() {
      if (!configured || !wantsPlayback || isAway()) return;
      const request = ++playRequest;
      function denied() {
        if (request !== playRequest) return;
        wantsPlayback = false;
        awaitingResumeConfirm = false;
        syncButton();
      }
      try {
        Promise.resolve(audio.play()).then(() => {
          if (request !== playRequest) return;
          awaitingResumeConfirm = false;
          syncButton();
        }, denied);
      } catch {
        denied();
      }
    }

    function suspend() {
      // Preserve consent when interrupting either active playback or a pending return resume.
      if (wantsPlayback && (reachedPlayback || awaitingResumeConfirm) && !audio.ended) {
        resumeOnReturn = true;
      }
      awaitingResumeConfirm = false;
      playRequest++;
      audio.pause();
      reachedPlayback = false;
      if (!resumeOnReturn) wantsPlayback = false;
      syncButton();
    }

    function returnToPage() {
      if (isAway() || !resumeOnReturn) return;
      resumeOnReturn = false;
      awaitingResumeConfirm = true;
      startPlayback();
    }

    musicBtn.addEventListener('click', () => {
      handledFirstGesture = true;
      if (!configured) {
        toast('No audio file configured in config.js');
        return;
      }
      resumeOnReturn = false;
      awaitingResumeConfirm = false;
      wantsPlayback = !wantsPlayback && audio.paused;
      if (wantsPlayback) startPlayback();
      else {
        playRequest++;
        audio.pause();
        reachedPlayback = false;
      }
      syncButton();
    });

    audio.addEventListener('play', () => {
      if (isAway() || !wantsPlayback) audio.pause();
      syncButton();
    });
    audio.addEventListener('playing', () => {
      if (isAway() || !wantsPlayback) audio.pause();
      else {
        reachedPlayback = true;
        awaitingResumeConfirm = false;
      }
      syncButton();
    });
    audio.addEventListener('pause', () => {
      if (audio.paused) {
        if (isAway() && wantsPlayback && (reachedPlayback || awaitingResumeConfirm) && !audio.ended) {
          resumeOnReturn = true;
        }
        if (!isAway() && !resumeOnReturn && !awaitingResumeConfirm) wantsPlayback = false;
        reachedPlayback = false;
      }
      syncButton();
    });
    for (const event of ['ended', 'error']) {
      audio.addEventListener(event, () => {
        wantsPlayback = reachedPlayback = resumeOnReturn = awaitingResumeConfirm = false;
        syncButton();
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (isAway()) suspend();
      else returnToPage();
    });
    document.addEventListener('freeze', suspend);
    window.addEventListener('pagehide', () => { pageAway = true; suspend(); });
    window.addEventListener('pageshow', () => { pageAway = false; returnToPage(); });
    syncButton();

    return () => {
      if (handledFirstGesture) return;
      handledFirstGesture = true;
      wantsPlayback = true;
      startPlayback();
    };
  }

  /* --------------------------------------------------------------------------
     10. SCROLL REVEAL (INTERSECTION OBSERVER)
     -------------------------------------------------------------------------- */
  function setUpScrollReveal() {
    // Silk scroll roots have their own measured reveal system and must not be
    // translated/faded by this generic observer at the same time.
    const revealEls = $$('.reveal:not(.silk-scroll)');
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      revealEls.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px 80px 0px' });

    revealEls.forEach(el => observer.observe(el));
  }

  function init() {
    document.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.dataset.fallback) return;
      const fallback = image.dataset.fallback;
      delete image.dataset.fallback;
      image.src = fallback;
    }, true);
    populateBasics();
    setUpGate(setUpAudio());
    setUpDateReveal();
    buildGallery();
    buildCeremonies();
    buildRsvpFields();

    // Event listeners
    $('#saveCalendarBottom')?.addEventListener('click', downloadCalendar);
    $('#shareWhatsapp')?.addEventListener('click', shareWhatsapp);
    const instagram = $('#ryIgBtn');
    if (instagram && !cfg.instagramUrl) {
      instagram.disabled = true;
      instagram.title = 'Instagram link unavailable';
      instagram.setAttribute('aria-label', 'Instagram link unavailable');
    }
    instagram?.addEventListener('click', () => {
      window.open(cfg.instagramUrl, '_blank', 'noopener,noreferrer');
    });
    $('#ryLocBtn')?.addEventListener('click', () => {
      document.querySelector('#ceremonies')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
    $('#ryCalBtn')?.addEventListener('click', downloadCalendar);
    $('#rsvpForm')?.addEventListener('submit', submitRsvp);

    // Initial access key binding
    const rsvpKeyInput = $('#rsvpAccessKey');
    if (rsvpKeyInput && cfg.w3forms?.accessKey) {
      rsvpKeyInput.value = cfg.w3forms.accessKey;
    }

    setUpScrollReveal();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
