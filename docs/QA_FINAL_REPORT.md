# SHAHI PATRA — FINAL POST-CLEANUP QA & RELEASE VERIFICATION REPORT

**Verification Date:** 2026-11-25  
**Branch:** `chore/shahi-patra-finalization`  
**Deploy Package Verified:** `C:\Users\Araya\Downloads\Shahi-Patra-Production-Deploy-20261125.zip` (8.27 MB)  
**Pre-Cleanup Backup ZIP:** `C:\Users\Araya\Downloads\Shahi-Patra-Editable-BASELINE-BACKUP-20261125.zip` (488.37 MB)

---

## 1. Test Coverage & Verification Matrix

| Area / Feature | Test Performed | Evidence / Measured Outcome | Status |
| :--- | :--- | :--- | :---: |
| **Static Syntax Check** | `node -c` across all active JS files | `config.js`, `main.js`, `server.mjs`, `admin.js`, `silk-scroll-delay-bounce.js`, `date-gold-rain.js`, `download-assets.mjs` all exit `0` | **PASS** |
| **Fresh Deploy Package Extract** | Extracted `Shahi-Patra-Production-Deploy-20261125.zip` into clean dir and served via static HTTP (`localhost:3099`) | `0` console/network/404 errors, `brokenImgs: []`, `5/5` fonts loaded, `5` gallery frames, `5` ceremonies, `audioPaused: false`, `overflowX: false` | **PASS** |
| **Responsive Layout & Overflow** | Headless Chromium at `375×667`, `390×844`, `768×1024`, `1024×768`, `1366×768`, `1920×1080` (closed gate + opened page) | `closedOverflow: false` & `openedOverflow: false` on all **6/6 viewports** | **PASS** |
| **Royal Entrance & 3D Gate** | Static card layout, floating CTA (`Tap to open`), click + Enter activation, repeat-click lock guard, replay button | Curtain aperture + ivory letter fold completes (~1.85s), `entry.hidden = true`, `main.inert = false`, couple names visible | **PASS** |
| **Silk Family & Notes Scrolls** | Auto-unroll on `#scrollBride`, `#scrollGroom`, `#scrollCompliments`, `#scrollNotes`, hash deep-link & back-scroll | Top roller document-Y drift `0.000px`, settled natural heights (`644px`, `644px`, `542px`, `469px`), 450ms delay + overshoot (~11px) | **PASS** |
| **Date Reveal & Celebration** | Reel cycling to `config.js` date, shimmer sweep, multi-color petals & spark bursts, repeated click guard, `.ics` export | Lands on `11 OCT 2026`; peak: 54 petals + 44 sparks; complete DOM cleanup (`0` `.shahi-date-rain` nodes, shimmer cleared at 5.8s) | **PASS** |
| **Our Story Hanging Gallery** | 5 frames (`118px`, `86px`, `150px`, `120px`, `132px`), pointer drag + `pointercancel` + wheel + keyboard arrows | Scroll distance `312px` drag / `997px` keyboard, `isDraggingAfterCancel: false`, `hintHidden: true` | **PASS** |
| **Ceremonies & Social Row** | 5 arched cards (3+2 grid), optimized `ceremony-corner-embroidered-v2.webp` (168 KB), Maps URLs, `#ryIgBtn`, `#ryLocBtn`, `#ryCalBtn` | All 5 Maps search links valid, `#ryIgBtn` safely disabled (`Instagram link unavailable`) when unconfigured | **PASS** |
| **Audio Playback** | Automatic start on gate click (`Wedding-web.mp3`, 4.93 MB) + `#musicToggle` pause/resume cycle | `paused: false` after gate (`1.77s` playback position), `true` after pause click, `false` after resume | **PASS** |
| **Accessibility & Reduced Motion** | `prefers-reduced-motion: reduce` emulation, keyboard Tab focus, semantic `aria-*` and `inert` lock | Gate completes immediately without transitions; Bride scroll immediately opens (`644px`, `complete`) | **PASS** |
| **Linux Path Case Audit** | Exact case-sensitive filesystem comparison across all active runtime references | `19/19` HTML/CSS/JS references match exact disk filename casing | **PASS** |
| **Self-Hosted Node RSVP Server** | Isolated startup test of `server.mjs` (`PORT=3098`, `ADMIN_TOKEN` set) | `POST /api/rsvp` HTTP `200`; `GET /api/rsvps` HTTP `401` unauthenticated / HTTP `200` authorized (`1` record); `/package.json` & `/data/rsvps.json` blocked (`403`) | **PASS** |
| **RSVP Client Validation** | Native HTML5 `checkValidity()` + regex phone validation + stepper `1..10` clamping + honeypot | Invalid phone rejected (`false`), unchecked ceremony radios rejected (`false`), stepper bounded cleanly `[1, 10]` | **PASS** |
| **Web3Forms Live Inbox Delivery** | End-to-end delivery to host email inbox on real public domain | Sandbox/localhost run does not verify recipient inbox delivery or Web3Forms domain allowlist | **UNVERIFIED** (Owner must send one labeled test RSVP after deploying to final live domain) |

---

## 2. Visual Parity Review (Baseline Approved vs. Post-Cleanup)

Screenshots in [`qa/post-cleanup/`](../qa/post-cleanup/) were programmatically compared against frozen baseline captures in [`qa/baseline-approved/`](../qa/baseline-approved/) and visually reviewed:

- **Entrance (Desktop & Mobile), Date Reveal, Pavilion, Gallery, RSVP:** `0.00%` to `0.92%` pixel variance (`pctChangedGt8`), confirming exact parity.
- **Ceremonies (`post_desktop_ceremonies.png`):** `3.86%` localized subpixel delta from replacing the `2.07 MB` PNG with `168 KB` `960×640` 2× alpha WebP corners; manual visual inspection confirms identical embroidery detail, crisp gold pearls, and clean alpha edges.
- **Palace Hero / Notes / Sunset Easel (`post_desktop_hero.png`, `post_desktop_notes_social.png`, `post_desktop_finale.png`):** Pixel thresholds triggered solely by frame capture timing (`scale(1.02) -> scale(1)` hero transition, scroll alignment between Compliments vs. Notes scrolls, and easel fade timing). Direct visual inspection confirms identical layout, typography, framing, and mobile arch behavior.

---

## 3. Walkthrough Recordings

- **Desktop 1366×768 Continuous Walkthrough:** [`qa/post-cleanup/final_desktop_walkthrough_1366.mp4`](../qa/post-cleanup/final_desktop_walkthrough_1366.mp4)
- **Mobile 390×844 Continuous Walkthrough:** [`qa/post-cleanup/final_mobile_walkthrough_390.mp4`](../qa/post-cleanup/final_mobile_walkthrough_390.mp4)

---

## 4. Residual Notes & Client Pre-Publish Actions

1. **Web3Forms Domain & Inbox Verification (`UNVERIFIED`):** After publishing to the final custom domain/Netlify/Vercel URL, verify that the domain is allowed in Web3Forms and confirm one labeled test RSVP arrives in the host inbox.
2. **Sample Personal Media:** Replace `assets/photos/photo-1..3.jpg` and `assets/audio/Wedding-web.mp3` with client-owned/licensed photography and audio prior to commercial launch.
3. **Dev/QA Exclusion:** Never upload `qa/`, `docs/`, `.git/`, `node_modules/`, or `.env` to a public static host; deploy directly from `Shahi-Patra-Production-Deploy-20261125.zip`.
