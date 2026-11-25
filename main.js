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

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
     2. GATE OPENING & PROGRESSIVE HERO REVEAL (MULTI-STAGE DETERMINISTIC SEQUENCE)
     -------------------------------------------------------------------------- */
  function setUpGate() {
    const entry = $('#entry');
    const openBtn = $('#openInvitation');
    const main = $('#mainContent');
    const letter = $('.entry-letter', entry);
    if (!entry || !openBtn || !main || !letter) return;
    main.inert = true;

    // Trace the outer velvet and then the aperture in the opposite direction.
    // The midpoint bulges inward as the top and bottom of the curtain clear.
    const aperture = (edge, top, bottom, bow = 0) => {
      const side = [0, .38, .77, 1, .77, .38, 0];
      const left = side.map((s, i) => `${edge + s * bow}% ${top + (bottom - top) * i / 6}%`);
      const right = side.map((s, i) => `${100 - edge - s * bow}% ${top + (bottom - top) * i / 6}%`);
      return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${left.join(', ')}, ${right.reverse().join(', ')}, ${left[0]})`;
    };

    async function openGate() {
      if (entry.dataset.state && entry.dataset.state !== 'closed') return;
      entry.dataset.state = 'opening';
      openBtn.disabled = true;
      const anchor = location.hash.slice(1);
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Attempt soundtrack playback after explicit user gesture
      const audio = $('#weddingAudio');
      const musicBtn = $('#musicToggle');
      if (audio && audio.src && audio.paused) {
        audio.play().then(() => {
          if (musicBtn) {
            musicBtn.classList.add('playing');
            musicBtn.setAttribute('aria-label', 'Pause background music');
          }
        }).catch(() => {});
      }

      if (!prefersReduced && typeof entry.animate === 'function') {
        const narrow = matchMedia('(max-width: 640px)').matches;
        const curtain = entry.animate([
          { clipPath: aperture(50, 50, 50), offset: 0 },
          { clipPath: aperture(50, 50, 50), offset: .28, easing: 'ease-out' },
          { clipPath: aperture(narrow ? 5 : 15, 49.6, 50.4), offset: .39, easing: 'ease-in-out' },
          { clipPath: aperture(narrow ? 4 : 14, 39, 61), offset: .49, easing: 'cubic-bezier(.3,.15,.24,1)' },
          { clipPath: aperture(3, -2, 102, narrow ? 11 : 7), offset: .68, easing: 'ease-out' },
          { clipPath: aperture(-3, -5, 105), offset: 1 }
        ], { duration: 1850, fill: 'both' });
        const letterFold = letter.animate([
          { transform: 'translateX(-50%) perspective(1000px) rotateY(0deg)', filter: 'brightness(1)' },
          { transform: narrow
            ? 'translateX(-50%) translateY(-14%) perspective(850px) rotateX(36deg) scaleY(.55)'
            : 'translateX(-2%) perspective(1000px) rotateY(-32deg) scale(.94)',
            filter: 'brightness(.85)', offset: .58 },
          { transform: narrow
            ? 'translateX(-50%) translateY(-140%) perspective(850px) rotateX(58deg)'
            : 'translateX(calc(50vw + 15%)) perspective(1000px) rotateY(-49deg) scale(.88)',
            filter: 'brightness(.68)' }
        ], { duration: 445, easing: 'cubic-bezier(.42,.05,.39,1)', fill: 'both' });
        document.body.classList.add('opening-gate');
        document.body.classList.add('opened');
        await curtain.finished.catch(() => {});
        entry.hidden = true;
        curtain.cancel();
        letterFold.cancel();
      } else {
        document.body.classList.add('opened');
        entry.hidden = true;
      }

      entry.dataset.state = 'open';
      entry.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      main.inert = false;
      main.focus({ preventScroll: true });
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'instant' });
      document.dispatchEvent(new Event('shahi:gate-opened'));
    }

    openBtn.addEventListener('click', openGate);

    // Replay button in footer
    $('#replayInvitation')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      entry.hidden = false;
      delete entry.dataset.state;
      entry.removeAttribute('aria-hidden');
      document.body.classList.remove('opened', 'opening-gate');
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
    const dt = new Date(`${cfg.date}T12:00:00`);
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

      if (prefersReduced) {
        finalize();
        return;
      }

      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const sequences = [
        Array.from({ length: 14 }, (_, i) => String((i * 3 + 3) % 31 + 1).padStart(2, '0')),
        Array.from({ length: 15 }, (_, i) => months[(dt.getMonth() + i + 2) % 12]),
        Array.from({ length: 16 }, (_, i) => String(dt.getFullYear() - 4 + (i % 8)))
      ];
      const animations = ids.map((id, index) => {
        const value = document.getElementById(id);
        const sequence = ['', ...sequences[index], values[index]];
        value.replaceChildren(...sequence.map(item => {
          const row = document.createElement('span');
          row.textContent = item;
          return row;
        }));
        return value.animate([
          { transform: 'translateY(0)' },
          { transform: `translateY(${-100 * (sequence.length - 1)}%)` }
        ], { duration: 1420 + index * 155, easing: 'cubic-bezier(.22,.68,.23,1)', fill: 'forwards' });
      });
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        animations.forEach(animation => animation.cancel());
        finalize();
      });
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
          behavior: prefersReduced ? 'auto' : 'smooth'
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
      else track.scrollTo({ left: e.key === 'Home' ? 0 : track.scrollWidth, behavior: prefersReduced ? 'auto' : 'smooth' });
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
      if (prefersReduced) return applySwing(0);
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
      if (!prefersReduced) applySwing(clamp(-drag.velocity * 4, 5.5), clamp(drag.velocity * 6, 8));
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

    audio.src = cfg.music || 'assets/audio/Wedding-web.mp3';
    audio.volume = Math.max(0, Math.min(1, Number(cfg.musicVolume) || 0.5));

    musicBtn.addEventListener('click', async () => {
      if (!audio.src || !cfg.music) {
        toast('No audio file configured in config.js');
        return;
      }

      if (!audio.paused) {
        audio.pause();
        musicBtn.classList.remove('playing');
        musicBtn.setAttribute('aria-label', 'Play background music');
      } else {
        try {
          await audio.play();
          musicBtn.classList.add('playing');
          musicBtn.setAttribute('aria-label', 'Pause background music');
        } catch (err) {
          console.warn('Audio playback error:', err);
          musicBtn.classList.remove('playing');
        }
      }
    });

    audio.addEventListener('error', () => {
      musicBtn.classList.remove('playing');
    });
  }

  /* --------------------------------------------------------------------------
     10. SCROLL REVEAL (INTERSECTION OBSERVER)
     -------------------------------------------------------------------------- */
  function setUpScrollReveal() {
    // Silk scroll roots have their own measured reveal system and must not be
    // translated/faded by this generic observer at the same time.
    const revealEls = $$('.reveal:not(.silk-scroll)');
    if (!('IntersectionObserver' in window) || prefersReduced) {
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
    setUpGate();
    setUpDateReveal();
    buildGallery();
    buildCeremonies();
    buildRsvpFields();
    setUpAudio();

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
      document.querySelector('#ceremonies')?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
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
