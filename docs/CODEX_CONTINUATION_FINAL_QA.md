# Shahi Patra — Codex Continuation & Cross-Device QA Report

Generated: 2026-11-25T16:02:00+05:30  
Repository: `aryanoff/Wedding-Invitation-card`  
Production Baseline Commit (`main`, untouched): `26328e0888cb2307ca539546a8f2d0551df8a877`  
Verification Branch: `fix/codex-continuation-mobile-cinematic`  
Browser Automated Environment: Google Chrome `158.0.8127.37` (`C:\Program Files\Google\Chrome\Application\chrome.exe`) via `puppeteer-core` (`http://127.0.0.1`)

---

## 1. Recovery Summary

Pre-continuation backup saved at `C:\Users\Araya\Downloads\Shahi-Patra-Codex-Handoff-Backup-20261125\` (preserving all modified and untracked files prior to any edits). Detailed file-by-file inventory recorded in [`docs/CODEX_HANDOFF_RECOVERY.md`](CODEX_HANDOFF_RECOVERY.md).

### Recovered From Interrupted Codex Session & Preserved
- **Gate Compatibility Rewrite:** CSS keyframe + foreground-clock replacement removing single-point failures on `Element.animate()` and `clip-path: polygon(evenodd, ...)` ([`main.js`](../main.js), [`styles.css`](../styles.css), [`index.html`](../index.html)).
- **Background Audio Lifecycle:** Media-event synchronization (`play`, `playing`, `pause`, `ended`, `error`), `visibilitychange`/`pagehide`/`pageshow` suspension, manual mute preservation across switches & replay, and clean rejection handling.
- **Palace Hero Atmosphere:** Initial SVG birds + water pool droplets/ripples modules ([`scripts/hero-atmosphere.js`](../scripts/hero-atmosphere.js), [`styles/hero-atmosphere.css`](../styles/hero-atmosphere.css)).
- **Date Reveal Fallback Base:** Initial `activateCssFallback()` + `@keyframes shahi-date-css-reel` ([`main.js`](../main.js), [`styles/date-gold-rain.css`](../styles/date-gold-rain.css)).
- **Verification Tooling:** [`scripts/verify-mobile-cinematic.mjs`](../scripts/verify-mobile-cinematic.mjs) and `qa/mobile-cinematic/`.

### Completed, Fixed, and Consolidated by Antigravity
1. **Gate Pacing, Seam & Full Fallback Chain (`main.js`, `styles.css`, `styles/entrance-soft-floral-override.css`):**
   - Paced entrance choreography to **`2850ms`** (`~2.89s` measured) with Stage A tap-press micro-feedback (`#openInvitation:active` + `.entry[data-state="opening"] #openInvitation`), 3D paper fold (`3%–23.5%`), Stage C velvet anticipation & golden light seam (`24%–43%`), Stage D 3D velvet parting (`26%–100%`) with behind-curtain dusk atmospheric scrim, and Stage E staggered couple name entrance (`nameCue = 2050ms`).
   - Fixed the vertical sky hairline peeking between closed doors (`width: calc(50vw + 2px)` overlap on `.entry-door` instead of transparent border gap).
   - Hardened `body.is-locked` (`height: 100vh; height: 100dvh; overscroll-behavior: none;`) and `.entry { touch-action: none; }`.
   - Added runtime `animationcancel` and zero-duration CSS-animation detection (`data-gate-fallback="raf"`): automatically hands off smoothly to `requestAnimationFrame` on foreground elapsed progress if CSS `@keyframes` are disabled or cancelled while `!prefers-reduced-motion`, plus explicit abort handle (`activeAbort`) and idempotent `finish()` cleanup.
2. **Audio Rapid App-Switch Fix (`main.js`):**
   - Added `awaitingResumeConfirm` and `freeze` listener so switching apps within milliseconds of returning (before `'playing'` fires) preserves `resumeOnReturn` without phantom background startup or dropped playback, alongside `aria-pressed` sync.
3. **Artboard-Mapped Hero Atmosphere (`scripts/hero-atmosphere.js`, `styles/hero-atmosphere.css`):**
   - Replaced static crop percentages with live `background-size: cover` + `background-position` projection against natural artboard dimensions (`2322×1224` wide vs `992×1586` portrait) and `#heroTitle` bounds measurement across resizes.
   - Guarantees zero overlap between flying birds and `"Aditi & Rahul"` on all viewports while locking pool droplets/ripples strictly inside visible reflection water.
   - Pauses cleanly via `IntersectionObserver`, `visibilitychange`, `pagehide`, `freeze`, and `prefers-reduced-motion`.
4. **Deterministic Date Reveal & Celebration (`main.js`, `styles/date-gold-rain.css`, `scripts/date-gold-rain.js`):**
   - Removed conflicting `.reel-value { transition: transform 0.08s ease }` in [`styles.css`](../styles.css) & [`styles/date-gold-rain.css`](../styles/date-gold-rain.css).
   - Guarded invalid `cfg.date` parsing, added monotonic per-reel progress (`reelFinished[]` / `reelProgress[]`) so late WAAPI cancellation preserves settled Day/Month reels without rewinding, added `animationcancel` / 0ms-keyframe `requestAnimationFrame` reel fallback, and updated [`scripts/date-gold-rain.js`](../scripts/date-gold-rain.js) with visibility-paused cleanup timers.
5. **Performance & Runtime Reduced-Motion Polish (`main.js`, `styles.css`, `index.html`, `scripts/silk-scroll-delay-bounce.js`):**
   - Replaced stale boot-time `prefersReduced` checks in `setUpScrollReveal`, `buildGallery`, and `#ryLocBtn` with live `reducedMotion.matches`.
   - Released `.reveal` `will-change` after elements become `.is-visible` and added `contain: strict` on `.paper-grain`.
   - Cleaned up silk-scroll `scroll`/`resize` listeners once all 4 scrolls complete and added `document.hidden` pause accounting inside `animateScroll`.
   - Added [`scripts/verify-continuation-full.mjs`](../scripts/verify-continuation-full.mjs) (excluded from Vercel static deploy in [`.vercelignore`](../.vercelignore)).

---

## 2. Automated Verification Results (All Executed After Final Edits)

### A. Mobile Cinematic Suite (`node scripts/verify-mobile-cinematic.mjs`)
- **Result:** **57 / 57 PASS** (`0` blocking failures, `0` warnings, `0` console/page/HTTP/request errors).
- **Measured Timings (`390×844` trusted touchscreen tap):**
  - Normal baseline (`cinematic`): **`2885ms`**
  - Forced fallback (`Element.animate` undefined + `CSS.supports('clip-path')` false): **`2885ms`** (`cinematic` intermediate frames matched)
  - Reduced motion (`prefers-reduced-motion: reduce`): **`18ms`** (`motion: "reduced"`)
  - Replay twice (`opened -> replayed -> opened`): **`2873ms`** then **`2895ms`**
  - Fold resize (`390×844 -> 768×844` mid-opening): `gateLayout` stayed `'portrait'` mid-flight, completed cleanly, replay recomputed `'wide'`
  - Visibility & Real Tab Switching (`Chrome hidden=true`): paused gate & audio (`currentTime: 0.0774s, paused: true`), resumed cleanly in foreground (`currentTime: 0.5872s, paused: false`), all 8 sampled atmosphere nodes transitioned `paused -> running`, manual pause stayed `paused: true` across tab switch.

### B. Full Continuation Stress, 8-Viewport Matrix & E2E Walkthrough (`node scripts/verify-continuation-full.mjs`)
- **Result:** **26 / 26 PASS** (`0` runtime/console errors).
- **Entrance Fallbacks & CPU Throttling:**
  - `0.001ms` CSS keyframes disabled (`rAF` fallback): `fallback === "raf"`, completed cleanly in **`2881ms`**.
  - Mid-flight `animationcancel` + `4x` CPU throttling: seamlessly continued from mid-door position via `rAF` and finished cleanly in **`2939ms`**.
- **Audio Stress Cases:**
  - Rapid background -> foreground -> background (`<15ms`): stayed paused while away, resumed cleanly upon return (`aria-pressed="true"`).
  - Autoplay `NotAllowedError` rejection: UI stayed cleanly unplayed (`playingClass: false`, `Play background music`).
- **Date Reveal Cancellation & Fallbacks:**
  - WAAPI missing -> CSS reel fallback -> `11 OCT 2026`.
  - Late WAAPI `cancel()` at `1470ms` (after Day settled, while Year spun) -> settled Day preserved (`translateY(-1500%)`), Year continued monotonically (`--reel-delay: -1478ms`) -> `11 OCT 2026`.
  - Double fallback (WAAPI missing + `0.001ms` CSS keyframes) -> `rAF` reel fallback -> `11 OCT 2026`.
  - Reduced motion -> prompt `11 OCT 2026`.
- **8-Viewport Atmosphere & Layout Matrix (`0px` overflow, `0` broken images, `0` bird/title collisions, `activeAtmo: true`, pool strictly inside lower reflection area across all 8):**
  - `360×800` (Android), `393×873` (Motorola CSS), `390×844` (Mobile), `344×882` (Fold outer), `680×820` (Fold inner), `768×1024` (Tablet), `1366×768` (Desktop), `1920×1080` (Widescreen).
- **Full Desktop (`1366×768`) & Mobile (`390×844`) End-to-End Walkthroughs:**
  - All 4 silk scrolls (`scrollBride`, `scrollGroom`, `scrollCompliments`, `scrollNotes`): `topDrift: 0px` across every frame on both mobile and desktop, downward lower-roller travel (`283.2–655.7px`), bounce overshoot (`9.4–11.6px`), typography transforms strictly `['none']`.
  - Hanging gallery: touch swipe (`0 -> 353px`) & keyboard ArrowRight (`0 -> 506px`).
  - Ceremonies: `5` cards rendered cleanly.
  - Sunset finale: desktop & mobile easel captures verified visually.
  - RSVP: HTML5 required validation (`checkValidity() === false`), guest stepper (`2 -> 3`, resets to `2`), mocked Web3Forms HTTP `200` success (`Thank you! Your RSVP was submitted.`), and simulated HTTP `500` error recovery (`♥ Retry RSVP`, button re-enabled). **Zero real RSVP submissions were transmitted.**

### C. Generated Visual & Video Evidence
- Mobile & Desktop Walkthrough Recordings:
  - `qa/codex-continuation/videos/mobile-390x844_walkthrough.mp4`
  - `qa/codex-continuation/videos/desktop-1366x768_walkthrough.mp4`
  - `qa/mobile-cinematic/baseline/mobile-cinematic.mp4`
  - `qa/mobile-cinematic/forced-fallback/mobile-cinematic.mp4`
- Screenshots:
  - `qa/mobile-cinematic/{baseline,forced-fallback,reduced,replay,fold-resize,visibility,regressions}/*`
  - `qa/codex-continuation/screenshots/*.png`

---

## 3. Classification of Testing Coverage vs Pending Items

| Category | Status | Scope Covered / Notes |
| :--- | :--- | :--- |
| Automated Chromium Emulation & Fallback Tests | **COMPLETED** | All 57 checks in `verify-mobile-cinematic.mjs` + all 26 checks in `verify-continuation-full.mjs` passed against local Node static/dev server in headless Chrome `158.0.8127.37`. |
| Mocked RSVP Submission & Error Recovery | **COMPLETED** | Local request interception tested HTTP `200` and `500` paths cleanly without hitting live Web3Forms inbox. |
| Physical Device Verification (**Motorola G64 5G** & **Pixel 9 Pro Fold**) | **PENDING** | `adb devices -l` reported `0` connected physical devices; real Android hardware WebView/Chrome lifecycle, lock screen, physical foldable hinge continuity, and loudspeaker focus still require hands-on verification after deploy. |
| Production Vercel Deployment & Live URL Verification | **PENDING RELEASE APPROVAL** | Changes currently reside cleanly on local branch `fix/codex-continuation-mobile-cinematic` (`main` untouched at `26328e0`). Live Vercel deployment requires explicit user approval to merge/push to `main` plus public guest access / signed-in dashboard check. |

---

## 4. Physical Device Checklist (Motorola G64 5G & Pixel 9 Pro Fold) & Safe Deployment Next Steps

### Physical Device Test Instructions (Once Deployed to Preview / Production URL)
1. **Entrance & Pacing:** Tap `Tap to open` on Motorola G64 5G and Pixel 9 Pro Fold (both outer cover screen and unfolded inner screen) — confirm smooth ~2.8–3.0s 3D card fold -> golden seam -> curtain part without snapping.
2. **Fold Continuity:** Open once on the outer cover screen, unfold mid-opening or replay after unfolding, and verify zero clipped panels or stuck overlay.
3. **Audio Lifecycle:** Verify wedding soundtrack starts on tap, pauses immediately when switching Android apps / locking the phone screen, resumes cleanly on return when not muted, and stays muted if paused manually before switching/replaying.
4. **Full Scroll Pass:** Scroll smoothly through Family scrolls (delayed 450ms open, steady top roller, bounce hem), Save the Date reel (`11 OCT 2026` + petals/fireworks), swiping the Hanging Gallery, 5 Ceremony cards, Compliments/Notes scrolls, Sunset Easel, and RSVP validation.

### Safe Release Path to GitHub `main` & Vercel
When ready to promote these verified changes to `main` (and verify on Vercel):
1. Review changes on `fix/codex-continuation-mobile-cinematic` (`git diff main`).
2. Merge fast-forward to `main` and push normally (no `--force`):
   ```powershell
   git checkout main
   git merge --ff-only fix/codex-continuation-mobile-cinematic
   git push origin main
   ```
3. Confirm Vercel builds commit from `main` as a static site (`Framework Preset: Other`, `Root Directory: .`, `Output Directory: .`) and ensure Vercel Deployment Protection does not gate public guests behind an SSO login before running live URL browser QA.
