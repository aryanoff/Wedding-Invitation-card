# Shahi Patra — Final Production Release & Validation Report

Date: 2026-11-25  
Repository: `https://github.com/aryanoff/Wedding-Invitation-card`  
Verification / Preview Branch: `fix/codex-continuation-mobile-cinematic` (verified code checkpoint `7c4b070892f3ca26d23ec080c2118be70a29a039`, followed by isolated `vercel.json` `dist` static output hardening)  
Current Untouched Production Branch (`main`): `26328e0888cb2307ca539546a8f2d0551df8a877`  
Release Gate Status: **PREVIEW READY FOR DEVICE VALIDATION — HELD BEFORE MERGE TO `main` PENDING EXPLICIT APPROVAL**

---

## 1. Deployment URLs & Hosting Configuration

| Environment | Status / Observation | Details |
| :--- | :--- | :--- |
| **GitHub Preview Branch** | **Verified (`200`)** | Branch `fix/codex-continuation-mobile-cinematic` on `aryanoff/Wedding-Invitation-card` (`7c4b070892f3ca26d23ec080c2118be70a29a039` + `vercel.json` static `dist` commit). |
| **Vercel Preview Dashboard** | **Deployment Completed (`vercel[bot]`)** | Initial `7c4b070` preview build recorded `state: "success"` at `https://vercel.com/aryanoffs-projects/weddingcard/5XVMKwK2j3zyg29re887BsuEMszg` (`2026-11-25T10:40:33Z`); refreshed on push with hardened `dist/` output. |
| **Vercel Preview Public URL** | **SSO Protected / Pending Tokenless Access** | Team/branch aliases (`*.vercel.app`) currently redirect unauthenticated requests (`307`) to `https://vercel.com/login?next=%2Fsso-api...` due to **Vercel Deployment Protection** and Chrome remote debugging (`DevToolsActivePort`) not being enabled locally. Obtain the shareable/public preview link (or disable Deployment Protection on Preview / issue a share link) in `https://vercel.com/aryanoffs-projects/weddingcard` before physical handset testing. |
| **Vercel Production (`main`)** | **PENDING USER RELEASE APPROVAL** | Production `main` intentionally untouched at `26328e0` until preview + physical device acceptance checks are signed off. |
| **Static Build Isolation** | **Verified Locally (`54` files)** | [`vercel.json`](../vercel.json) sets `"framework": null`, `"installCommand": "true"`, builds only the 54 clean runtime assets/code files into `dist/` (stripping `*.md`), and sets `"outputDirectory": "dist"`. Locally verified HTTP `404` on `/admin.html`, `/admin.js`, `/server.mjs`, `/package.json`, `/scripts/verify-mobile-cinematic.mjs`, and `/docs/CODEX_HANDOFF_RECOVERY.md`. |

---

## 2. Exact Files Modified & Created Relative to `main` (`26328e0`)

### Runtime Website & Static Hosting Files (Deployed inside `dist/`)
- [`index.html`](../index.html) — hero preload rules (`mandap-portrait.webp` <= 640px, `mandap_dusk.webp` >= 641px), `.entry-seam` element, linked `hero-atmosphere` assets, `decoding="async"` on decorative artwork.
- [`styles.css`](../styles.css) — 3D gate perspective, overlapping velvet panels (`width: calc(50vw + 2px)`), `2850ms` choreography keyframes (`shahi-gate-letter`, `shahi-gate-letter-portrait`, `shahi-gate-door`, `shahi-gate-seam`, `shahi-gate-scrim`), `[data-gate-fallback="raf"]` isolation, removed permanent `.reveal` `will-change`, removed conflicting `.reel-value` transition, hardened `body.is-locked` (`100dvh`, `overscroll-behavior: none`) and `.entry { touch-action: none }`.
- [`styles/entrance-soft-floral-override.css`](../styles/entrance-soft-floral-override.css) — Stage A tap-press active/opening confirmation on `#openInvitation`.
- [`styles/date-gold-rain.css`](../styles/date-gold-rain.css) — `.is-css-spinning`, `.is-date-paused`, `.is-rain-paused`, `@keyframes shahi-date-css-reel`, disabled transition fight on `.reel-value`.
- [`styles/hero-atmosphere.css`](../styles/hero-atmosphere.css) & [`scripts/hero-atmosphere.js`](../scripts/hero-atmosphere.js) — GPU-composited birds + pool droplets/ripples mapped dynamically to `background-size: cover` hero artboard crops (`2322×1224` wide / `992×1586` portrait) while avoiding `#heroTitle` overlap; auto-paused on offscreen scroll, `visibilitychange`, `pagehide`, `freeze`, and `prefers-reduced-motion`.
- [`main.js`](../main.js) — consolidated deterministic `setUpGate()` controller (`2850ms` + `rAF` fallback on disabled/cancelled CSS keyframes), stabilized `setUpAudio()` rapid-switch resume + `freeze` + `aria-pressed`, monotonic per-reel + `rAF` date reveal controller, live `reducedMotion.matches` checks.
- [`scripts/date-gold-rain.js`](../scripts/date-gold-rain.js) — foreground-aware cleanup clock & visibility-paused petal/firework animation state.
- [`scripts/silk-scroll-delay-bounce.js`](../scripts/silk-scroll-delay-bounce.js) — scroll/resize listener teardown after completion + `document.hidden` frame-delta pause accounting.

### Repository Configuration, Verification & Documentation (Excluded from Public `dist/`)
- [`vercel.json`](../vercel.json) & [`.vercelignore`](../.vercelignore)
- [`scripts/verify-mobile-cinematic.mjs`](../scripts/verify-mobile-cinematic.mjs) & [`scripts/verify-continuation-full.mjs`](../scripts/verify-continuation-full.mjs)
- [`docs/CODEX_HANDOFF_RECOVERY.md`](CODEX_HANDOFF_RECOVERY.md), [`docs/CODEX_CONTINUATION_FINAL_QA.md`](CODEX_CONTINUATION_FINAL_QA.md), [`docs/FINAL_PRODUCTION_RELEASE.md`](FINAL_PRODUCTION_RELEASE.md)

---

## 3. Clear Classification of Completed vs Pending Verification

| Test Domain | Classification | Measured Outcome |
| :--- | :--- | :--- |
| **Syntax & Static Case Audit** | Automated (Local) | **PASS** — `node -c` exit `0` across all JS; `38/38` asset/script paths matched disk casing (`0` missing). |
| **Isolated `dist/` Static Bundle** | Automated Chromium (`158.0.8127.37`) | **PASS** — `54` runtime files served cleanly (`200` root + `200` `Wedding-web.mp3`, `0` console/page/HTTP errors), `6/6` probed internal files returned `404`. |
| **Mobile Cinematic Suite** (`verify-mobile-cinematic.mjs`) | Automated Chrome Emulation | **57 / 57 PASS** (`0` warnings): baseline `2885ms`, forced no-WAAPI/no-clip `2885ms`, reduced-motion `18ms`, replay `2873ms` / `2895ms`, `390→768` mid-open resize, native tab + mock visibility pause/resume for gate/audio/atmosphere, rapid tap dedupe. |
| **Continuation Stress & Walkthroughs** (`verify-continuation-full.mjs`) | Automated Chrome + Emulation (`8` viewports) | **26 / 26 PASS** (`0` console/page errors): `rAF` 0ms-keyframe fallback (`2881ms`), `animationcancel` + `4x` CPU throttle (`2939ms`), `<15ms` rapid audio tab switch, autoplay `NotAllowedError` handling, WAAPI-disabled / late-cancelled / `rAF` date reels (`11 OCT 2026`), `8` viewports (`344×882`, `360×800`, `390×844`, `393×873`, `680×820`, `768×1024`, `1366×768`, `1920×1080`) zero overflow & zero bird/title overlap, all `4` silk scrolls (`topDrift: 0px`), gallery swipe/keys, 5 ceremonies, finale easel, mocked Web3Forms `200` + `500` error recovery. |
| **Music Lifecycle & Performance** | Automated Chrome + Visual Filmstrip | **PASS** — pauses on `visibilitychange`, `pagehide`, `freeze`; manual mute preserved through tab switch & replay; zero leaked RAF/scroll loops once silk scrolls complete; `.reveal` releases `will-change` after settling. |
| **Motorola G64 5G & Pixel 9 Pro Fold (Outer + Inner)** | **Physical Android Devices — PENDING** | `adb devices -l` reported `0` attached devices. Must be verified manually on live accessible preview URL before claiming cross-device handset sign-off. |
| **Web3Forms Live Email Receipt** | **Live Inbox Delivery — PENDING EXPLICIT AUTHORIZATION** | Form validation, guest stepper, payload fields (`access_key` from `config.js`), loading/error/retry UI verified locally against mocked responses; no unauthorized real emails submitted. |

---

## 4. Physical Device Acceptance Procedure (Preview Build)

Once you confirm/open the Vercel Preview URL from `https://vercel.com/aryanoffs-projects/weddingcard` (ensuring guests/testers have access without a Vercel login wall):

1. **Test on Motorola G64 5G, Pixel 9 Pro Fold (outer cover screen & inner unfolded display), and one additional Android phone:**
   - Open from **WhatsApp in-app browser**, **direct Android Chrome**, and a fresh **Chrome Incognito** tab.
   - Tap `Tap to open`: verify subtle press acknowledgement, smooth upward 3D invitation card fold (`~0.65s`), brief velvet pause + central golden light seam, `~2.0s` velvet curtain parting (~`2.85–2.9s` total), palace/names staggered arrival, and zero instant skip or overlay freeze.
   - Test **rapid double-tap**, **switching to WhatsApp/home mid-opening then returning**, **screen lock/unlock**, **landscape vs portrait**, **physical unfold/fold** (Pixel Fold), and footer **Replay (`↑ Back to beginning`)**.
   - Separately enable Android OS **Remove animations / Reduce motion** and verify crisp immediate transition.
2. **Background Music:** Verify audio plays after tap, pauses immediately on app switch or phone lock, resumes cleanly on return (if allowed by browser), and stays muted across switches + replay once manually muted.
3. **Hero Atmosphere & Full Invitation Scroll:** Check distant birds stay cleanly above/below `Aditi & Rahul` (never overlapping names or ground), water ripples stay inside the pool, and all 4 silk scrolls, Save the Date (`11 OCT 2026` + petals/sparks), gallery swipe, 5 ceremonies, `.ics` calendar export, sunset finale, and RSVP client validation operate smoothly.
4. **Authorized Live RSVP Test (Optional upon approval):** Submit one clearly labeled test entry (e.g., `Test Guest - Release QA`) and confirm receipt in the configured Web3Forms inbox.

---

## 5. Safe Production Release & Rollback Procedure

### Promote Approved Preview to Production `main`
```powershell
git fetch origin
git checkout main
git merge --ff-only fix/codex-continuation-mobile-cinematic
git push origin main
```

### Rollback Procedure
- **Instant Vercel Rollback:** Open `https://vercel.com/aryanoffs-projects/weddingcard` -> **Deployments** -> select previous commit (`26328e0`) -> **Promote to Production**.
- **Git Rollback (non-destructive, no force-push):**
  ```powershell
  git checkout main
  git revert --no-commit 26328e0..HEAD
  git commit -m "Rollback Shahi Patra release to 26328e0 baseline"
  git push origin main
  ```
