# SHAHI PATRA — FINAL BASELINE CHECKPOINT (PHASE 0)

**Checkpoint Timestamp:** 2026-11-25 07:35 IST (`chore/shahi-patra-finalization`)  
**Git Starting Commit:** `e7de010` (`first commit` on `main`; workspace branched cleanly to `chore/shahi-patra-finalization`)  
**Full Pre-Cleanup External Backup:** `C:\Users\Araya\Downloads\Shahi-Patra-Editable-BASELINE-BACKUP-20261125.zip` (488.37 MB, excludes `.git/` and `node_modules/`)  
**Complete File Hash Manifest:** `C:\Users\Araya\Downloads\Shahi-Patra-BASELINE-MANIFEST-20261125.csv` (1,210 files with SHA-256 checksums)

---

## 1. Environment & Entrypoints Verified

| Component | Baseline Details |
| :--- | :--- |
| **Node.js Runtime** | `v22.23.1` |
| **npm Version** | `10.9.8` |
| **Git Version** | `2.55.0.windows.3` |
| **Active Local Server** | `node server.mjs` on `http://localhost:3000` (HTTP 200 confirmed) |
| **Package Scripts** | `npm start` (`node server.mjs`), `npm run download-assets` (`node scripts/download-assets.mjs`) |
| **Dependencies** | Dev-only dependency `puppeteer-core` (`^25.18.1`); zero runtime npm dependencies required for site operation |
| **Entry HTML** | `index.html` (invitation), `admin.html` (optional private RSVP viewer gated behind `ADMIN_TOKEN`) |
| **Active Stylesheets (Load Order)** | 1) `styles.css`, 2) `styles/silk-scroll-delay-bounce.css`, 3) `styles/entrance-soft-floral-override.css`, 4) `styles/date-gold-rain.css` |
| **Active Scripts (Deferred)** | 1) `config.js`, 2) `main.js`, 3) `scripts/silk-scroll-delay-bounce.js`, 4) `scripts/date-gold-rain.js` |

---

## 2. Frozen Baseline Telemetry (`qa/baseline-approved/baseline_telemetry.json`)

- **Console Errors:** `0`
- **Uncaught Page Errors:** `0`
- **Failed HTTP Requests:** `0`
- **HTTP 4xx/5xx Asset Responses:** `0`
- **Broken Images:** `0` (all images verified `complete === true && naturalWidth > 0`, including responsive `<picture>` desktop/mobile variants)
- **Self-Hosted Web Fonts Loaded (5/5):** `Cormorant Garamond` (regular & italic `woff2`), `DM Sans` (`woff2`), `Marcellus` (`ttf`), `Rozha One` Devanagari (`woff2`)
- **Responsive Overflow (`scrollWidth > innerWidth`):**
  - `375×667`: Closed `false`, Opened `false`
  - `390×844`: Closed `false`, Opened `false`
  - `768×1024`: Closed `false`, Opened `false`
  - `1024×768`: Closed `false`, Opened `false`
  - `1366×768`: Closed `false`, Opened `false`
  - `1920×1080`: Closed `false`, Opened `false`
- **Silk Scrolls Baseline:**
  - `#scrollBride`: `topDriftPx = 0`, peak `655.7px`, settled `644.1px`, state `complete`
  - `#scrollGroom`: `topDriftPx = 0`, peak `655.3px`, settled `644.1px`, state `complete`
  - `#scrollCompliments`: `topDriftPx = 0`, peak `552.7px`, settled `541.6px`, state `complete`
  - `#scrollNotes`: `topDriftPx = 0`, peak `479.3px`, settled `468.6px`, state `complete`
- **Date Reveal & Celebration Baseline:**
  - Configured output: `11 OCT 2026`, `Save the Date` confirmed visible
  - Peak celebration: 54 multi-color petals + 44 firework sparks
  - Cleanup at >4.5s post-reveal: `0` remaining `.shahi-date-rain` nodes, shimmer class cleared
- **Our Story Gallery Baseline:**
  - 5 `.gframe` items with hang heights `118px`, `86px`, `150px`, `120px`, `132px`
  - Pointer drag scroll (`312px`), `pointercancel`, horizontal wheel, keyboard `ArrowRight`/`ArrowLeft`, and hint dismissal (`is-hidden`) verified
- **Audio Playback Baseline:**
  - Source `assets/audio/Wedding-web.mp3` (`readyState: 4`), starts on gate gesture (`paused: false`), pauses/resumes accurately via `#musicToggle`
- **Captured Visual Baseline Location:** `qa/baseline-approved/` (18 PNGs covering desktop 1366×768 & mobile 390×844 scenes)

---

## 3. Identified Issues / Stabilization Targets

1. **Workspace Bloat (~518 MB non-runtime files):** `qa/` (350.7 MB), `tmp/` (23.3 MB), historical kits (`Fixing/`, `Shahi-Patra-Antigravity-Handoff/`, `Shahi-Patra-Bounce-Repair/`, `Shahi-Patra-Motion-Repair-Kit/`, `Shahi-Patra-Soft-Floral-Fix/`, `Shahi-Patra-Styles-Zip/`, `shahi_latest_master_audit/` = ~26.4 MB), 77 unused `.mjs` scripts in `scripts/`, and uncompressed audio master `assets/audio/Wedding.wav` (86.97 MB).
2. **Duplicate / Unused Runtime Assets:**
   - `assets/media/garden_close.webp` (268.9 KB) is byte-for-byte identical (`sha256: e25cd651ca52`) to `assets/media/garden_close_tall.webp` and is unused since `<picture>` uses `sunset-courtyard-wide.webp` and `garden_close_tall.webp`.
   - `assets/entrance-floral-watermark.svg` (2.2 KB) is the unreferenced old lotus watermark (superseded by `entrance-watermark-soft-buti.svg`).
   - `styles/silk-scroll-motion.css` & `scripts/silk-scroll-motion.js` are unreferenced legacy controllers superseded by `silk-scroll-delay-bounce.*`.
   - `assets/media/roll-top1.svg` (579 B) is unreferenced.
3. **Oversized PNG Artwork (`ceremony-corner-embroidered-v2.png` = 2.07 MB):** Dimensions are `1536×1024`, rendered at max `451×301` (`~320px` height clamp). Can be safely optimized (or crisp WebP / compressed PNG at 2× display size) while verifying exact visual parity.
4. **Audio Fallback in `main.js:788`:** Still falls back to `'assets/audio/Wedding.wav'` if `cfg.music` is cleared; updating to `'assets/audio/Wedding-web.mp3'` prevents a 404 after archiving the 87 MB WAV master.
5. **External Gallery Demo Fallback URLs in `config.js` & Hardcoded Strings:** `config.js` still carries third-party `itsbalcony.com` demo URLs alongside `localImage`; several optional client customization settings (`timeZone`, `instagramUrl`, `rsvpDisclaimer`, `devanagari` line, family overlines, optional `server` RSVP provider toggle) should be cleanly configurable via `config.js` with full parity defaults.
6. **Production Deploy Packaging & `.gitignore`:** No production deploy folder/ZIP or `.gitignore` exclusions for development/QA artifacts existed yet.
