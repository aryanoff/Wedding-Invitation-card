# SHAHI PATRA — FILE DEPENDENCY MANIFEST & CLEANUP CLASSIFICATION

**Audit Basis:** Transitive code scan across HTML (`index.html`, `admin.html`), CSS (`styles.css`, `styles/*.css`), JS (`main.js`, `config.js`, `scripts/*.js`, `server.mjs`, `admin.js`), `package.json`, SHA-256 duplicate analysis, and live Chromium network telemetry (`qa/baseline-approved/baseline_telemetry.json`).

---

## Classification Legend

- **KEEP / ACTIVE:** Required in production runtime or optional server runtime; never delete.
- **KEEP / DEVELOPMENT:** Used locally for asset fetching, dependency installation, documentation, or regression testing; exclude from static client deployment package.
- **CONSOLIDATE:** Obsolete dead CSS/JS or small config normalization to clean safely with parity test.
- **ARCHIVE OUTSIDE DEPLOY ROOT:** Historical repair kits, old QA captures, temporary analysis images, unused old audit scripts, and uncompressed 87 MB WAV master — moved safely to `C:\Users\Araya\Downloads\Shahi-Patra-Archive-20261125\` (and preserved inside baseline backup ZIP).
- **DELETE ONLY AFTER VERIFIED:** Confirmed byte-for-byte duplicates or transient unreferenced leftovers after archival backup.

---

## 1. Root Files & Config

| Path | Type | Size | Referenced By | Runtime Required | Classification | Reason / Notes |
| :--- | :---: | :---: | :--- | :---: | :--- | :--- |
| `index.html` | HTML | 25.6 KB | Entry URL `/` | YES | **KEEP / ACTIVE** | Canonical royal invitation entrypoint |
| `styles.css` | CSS | 73.1 KB | `index.html:11` | YES | **KEEP / ACTIVE** | Primary design system & section layouts |
| `main.js` | JS | 34.5 KB | `index.html:16` | YES | **KEEP / ACTIVE** | Gate, date reels, gallery, ceremonies, audio, RSVP |
| `config.js` | JS | 4.0 KB | `index.html:15`, `main.js` | YES | **KEEP / ACTIVE** | Single source of truth for client customization |
| `server.mjs` | Node | 6.5 KB | `package.json` (`npm start`) | Optional (Node) | **KEEP / ACTIVE** | Static server + optional secure RSVP API |
| `admin.html` | HTML | 2.0 KB | Manual `/admin.html` | Optional (Node) | **KEEP / ACTIVE** | Optional private RSVP dashboard (`ADMIN_TOKEN` gated) |
| `admin.js` | JS | 2.2 KB | `admin.html` | Optional (Node) | **KEEP / ACTIVE** | Client script for private RSVP viewer |
| `package.json` | JSON | 0.4 KB | npm (`start`, `download-assets`) | Dev / Node | **KEEP / DEVELOPMENT** | Project metadata & scripts |
| `package-lock.json` | JSON | 11.7 KB | npm lockfile | Dev | **KEEP / DEVELOPMENT** | Reproducible dev dependency lock |
| `.gitignore` | Text | 35 B | Git | Dev | **KEEP / DEVELOPMENT** | Expand to exclude QA videos, temp files, `.zip`, `data/` |
| `README.md` | MD | 6.1 KB | Repo root | Dev | **KEEP / ACTIVE** | Root project guide (update & link `docs/`) |
| `MISSING_ASSETS.md` | MD | 3.4 KB | None | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Superseded Nov 23 checklist (`Wedding.wav` note outdated) |
| `QA_REPORT.md` | MD | 15.7 KB | None | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Superseded Nov 23 QA report; replaced by `docs/QA_FINAL_REPORT.md` |

---

## 2. Modular Stylesheets (`styles/`) & Scripts (`scripts/`)

| Path | Size | Referenced By | Runtime Required | Classification | Action / Reason |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `styles/silk-scroll-delay-bounce.css` | 3.1 KB | `index.html:12` | YES | **KEEP / ACTIVE** | Active scroll roller/fabric typography & cloth border styling |
| `styles/entrance-soft-floral-override.css` | 6.1 KB | `index.html:13` | YES | **KEEP / ACTIVE** | Active soft peach parchment, Devanagari, button float, mobile folio |
| `styles/date-gold-rain.css` | 7.7 KB | `index.html:14` | YES | **KEEP / ACTIVE** | Active scalloped shields, elephants, confetti petals & sky sparks |
| `styles/silk-scroll-motion.css` | 4.3 KB | **NONE** | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Obsolete scroll motion stylesheet superseded by `silk-scroll-delay-bounce.css` |
| `scripts/silk-scroll-delay-bounce.js` | 7.2 KB | `index.html:17` | YES | **KEEP / ACTIVE** | Active 450ms delay + weighted unroll/overshoot controller |
| `scripts/date-gold-rain.js` | 3.8 KB | `index.html:18` | YES | **KEEP / ACTIVE** | Active petal shower + spark fireworks celebration & 2.8s cleanup |
| `scripts/silk-scroll-motion.js` | 5.4 KB | **NONE** | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Obsolete scroll controller superseded by `silk-scroll-delay-bounce.js` |
| `scripts/download-assets.mjs` | 2.8 KB | `package.json` | NO (Dev tool) | **KEEP / DEVELOPMENT** | Utility referenced by `npm run download-assets` |
| `scripts/*.mjs` (76 one-off audit/crop scripts) | ~315 KB | **NONE** | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Historical single-purpose test/crop scripts from earlier passes; replaced by clean `scripts/verify-production.mjs` |

---

## 3. Assets (`assets/`)

### 3A. Media (`assets/media/`)

| File | Size | Referenced By | Runtime Required | Classification | Notes |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `ceremony-corner-embroidered-v2.png` | 2,172 KB | `index.html:248-249` | YES | **KEEP / ACTIVE (Optimize)** | `1536×1024` alpha PNG rendered max `451×301`. Candidate to optimize to `~150 KB` WebP/PNG (`960×640`) preserving visual quality + keeping original PNG in archive |
| `pavilion.webp` | 400 KB | `styles.css:1127` | YES | **KEEP / ACTIVE** | Pavilion interlude background |
| `sunset-courtyard-wide.webp` | 340 KB | `index.html:340` (`>=700px`) | YES | **KEEP / ACTIVE** | Desktop sunset finale picture source |
| `mandap-portrait.webp` | 282 KB | `styles.css:3009` (`<=640px`) | YES | **KEEP / ACTIVE** | Mobile portrait mandap hero |
| `garden_close_tall.webp` | 269 KB | `index.html:341`, `styles.css:1734` | YES | **KEEP / ACTIVE** | Mobile portrait sunset finale & CSS backdrop fallback |
| `garden_close.webp` | 269 KB | **NONE** | NO | **DELETE ONLY AFTER VERIFIED** | Confirmed SHA-256 byte-for-byte duplicate of `garden_close_tall.webp` (`e25cd651ca52`); unreferenced anywhere in codebase |
| `mandap_dusk.webp` | 254 KB | `styles.css:558` | YES | **KEEP / ACTIVE** | Desktop hero mandap dusk backdrop |
| `floral1.png` | 179 KB | `index.html:42,86`, `styles.css:2641` | YES | **KEEP / ACTIVE** | Gate upper floral sprays + gallery corner motif |
| `floral2.webp` | 179 KB | `index.html:145`, `styles.css:2640` | YES | **KEEP / ACTIVE** | Inter-scroll floral divider + gallery motif |
| `lotus_bunch.png` | 116 KB | `index.html:177,348`, `styles.css:2978` | YES | **KEEP / ACTIVE** | Save the Date crest & easel crown backdrop |
| `divider3.png` | 106 KB | `index.html:230,298`, `styles.css:2984-2985` | YES | **KEEP / ACTIVE** | Gallery top divider, notes divider, easel gold borders |
| `reception.webp` | 81 KB | `config.js:83` -> `main.js` | YES | **KEEP / ACTIVE** | Reception ceremony illustration |
| `elephant.png` | 68 KB | `index.html:43,87,181,205` | YES | **KEEP / ACTIVE** | Entrance doors & Date flanks |
| `vivaah.webp` | 64 KB | `config.js:82` -> `main.js` | YES | **KEEP / ACTIVE** | Vivaah ceremony illustration |
| `haldi.webp` | 55 KB | `config.js:80` -> `main.js` | YES | **KEEP / ACTIVE** | Haldi ceremony illustration |
| `mehendi.webp` | 54 KB | `config.js:79` -> `main.js` | YES | **KEEP / ACTIVE** | Mehendi ceremony illustration |
| `divider.webp` | 54 KB | `index.html:133,163,262,286,312` | YES | **KEEP / ACTIVE** | Scroll bottom ornament & ceremonies row divider |
| `sangeet.webp` | 53 KB | `config.js:81` -> `main.js` | YES | **KEEP / ACTIVE** | Sangeet ceremony illustration |
| `divider2.png` | 52 KB | `styles.css:2998` | YES | **KEEP / ACTIVE** | Easel crossbar artwork |
| `ring_ceremony.webp` | 43 KB | Optional (`config.js` client art) | Optional | **KEEP / ACTIVE** | Documented optional ceremony art for client engagement ceremonies |
| `section_divider.svg` | 32 KB | `index.html:218,223`, `styles.css:2972` | YES | **KEEP / ACTIVE** | Pavilion dividers & torn-edge band art |
| `knob 3.svg` | 21 KB | `index.html` (8× right finials) | YES | **KEEP / ACTIVE** | Right silk-scroll gold finial |
| `knob-left 1.svg` | 21 KB | `index.html` (8× left finials) | YES | **KEEP / ACTIVE** | Left silk-scroll gold finial |
| `ganesha_reference.png` | 8.2 KB | `index.html:51` | YES | **KEEP / ACTIVE** | Seated Ganesha emblem on gate card |
| `roll-top1.svg` | 579 B | **NONE** | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Unreferenced roller SVG leftover |
| `README.md` | 661 B | Docs | NO | **KEEP / ACTIVE** | Explains `assets/media/` licensing/customization |

### 3B. Photos (`assets/photos/`), Audio (`assets/audio/`), Fonts (`assets/fonts/`), Fallback (`assets/fallback/`), Root Watermarks

| File / Folder | Size | Referenced By | Runtime Required | Classification | Notes |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `assets/photos/photo-1..3.jpg` + `README.md` | 360 KB | `config.js:47,61,75` -> `main.js` | YES | **KEEP / ACTIVE** | Sample demo gallery photos (document client replacement before live publish!) |
| `assets/audio/Wedding-web.mp3` | 5.17 MB | `config.js:15` -> `main.js` | YES | **KEEP / ACTIVE** | Optimized web playback soundtrack |
| `assets/audio/Wedding.wav` | 86.97 MB | `main.js:788` legacy fallback only | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Massive uncompressed WAV master; archive externally & update fallback to `Wedding-web.mp3` |
| `assets/fonts/*.woff2, *.ttf, OFL-*.txt` | 253 KB | `styles.css:6-34`, `index.html:9` | YES | **KEEP / ACTIVE** | Self-hosted licensed typography + OFL licenses |
| `assets/fallback/*.svg` (6 SVGs) | 20 KB | `index.html` (`data-fallback`), `main.js` | YES | **KEEP / ACTIVE** | Offline / broken-asset safety fallbacks + favicon `lotus.svg` |
| `assets/entrance-watermark-soft-buti.svg` | 1.8 KB | `styles.css`, `entrance-soft-floral-override.css` | YES | **KEEP / ACTIVE** | Active parchment floral watermark |
| `assets/entrance-floral-watermark.svg` | 2.2 KB | **NONE** | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Old rejected entrance lotus watermark |

---

## 4. Historical Audit / Fix / Temp Directories

| Directory | Files | Size | Referenced By Runtime | Classification | Notes |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `Fixing/` | 30 | 6.80 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 24 video audit comparisons pack |
| `Shahi-Patra-Antigravity-Handoff/` | 86 | 9.04 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 23 handoff package |
| `Shahi-Patra-Bounce-Repair/` | 12 | 0.90 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 24 scroll bounce patch kit |
| `Shahi-Patra-Motion-Repair-Kit/` | 27 | 1.18 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 24 motion repair kit |
| `Shahi-Patra-Soft-Floral-Fix/` | 6 | 0.43 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 24 floral fix zip extraction |
| `Shahi-Patra-Styles-Zip/` | 1 | <0.01 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Duplicate extracted CSS file |
| `shahi_latest_master_audit/` | 90 | 8.08 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Nov 24 master audit keyframes |
| `tmp/` | 56 | 23.28 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Scratch video frame captures |
| `qa/` | 755 | 350.71 MB | NO | **ARCHIVE OUTSIDE DEPLOY ROOT** | Previous screenshots, `temp_frames_mobile`, old walkthrough recordings (keep only `qa/baseline-approved/` + final QA report cleanly outside deploy!) |
