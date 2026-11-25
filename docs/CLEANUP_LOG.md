# SHAHI PATRA — CLEANUP & OPTIMIZATION LOG

**Date:** 2026-11-25  
**Branch:** `chore/shahi-patra-finalization`  
**Pre-Cleanup Backup Verified:** `C:\Users\Araya\Downloads\Shahi-Patra-Editable-BASELINE-BACKUP-20261125.zip` (488.37 MB)  
**External Archive Directory:** `C:\Users\Araya\Downloads\Shahi-Patra-Archive-20261125\`

---

## 1. Before vs. After Project Size Comparison

| Scope | Before Cleanup | After Cleanup | Reduction |
| :--- | :---: | :---: | :---: |
| **Total Workspace Folder (incl. `.git`, `node_modules`, `qa`)** | ~527.5 MB | ~57.7 MB (incl. 21.3 MB `qa/baseline-approved/` + 26.1 MB `node_modules/`) | **-469.8 MB (-89.1%)** |
| **Production App + Assets (`assets/`, `styles/`, `scripts/`, root code)** | ~97.8 MB | **~8.39 MB** | **-89.4 MB (-91.4%)** |
| **Static Deploy ZIP Package (`Shahi-Patra-Production-Deploy-20261125.zip`)** | N/A | Updated cleanly at build step (**~8.1 MB**) | Clean runtime-only build |

---

## 2. Exact Files & Folders Archived (Moved Safely Outside Workspace)

All items below were verified non-runtime or superseded masters, backed up in the baseline ZIP, and moved intact to `C:\Users\Araya\Downloads\Shahi-Patra-Archive-20261125\`:

| Original Path | Size | Reason Archived | Verification |
| :--- | :---: | :--- | :--- |
| `Fixing/` | 6.80 MB | Nov 24 video audit comparisons pack | Zero runtime imports |
| `Shahi-Patra-Antigravity-Handoff/` | 9.04 MB | Nov 23 handoff package | Zero runtime imports |
| `Shahi-Patra-Bounce-Repair/` | 0.90 MB | Nov 24 scroll bounce patch kit | Zero runtime imports |
| `Shahi-Patra-Motion-Repair-Kit/` | 1.18 MB | Nov 24 motion repair kit | Zero runtime imports |
| `Shahi-Patra-Soft-Floral-Fix/` | 0.43 MB | Nov 24 floral watermark fix kit | Zero runtime imports |
| `Shahi-Patra-Styles-Zip/` | <0.01 MB | Duplicate extracted stylesheet | Zero runtime imports |
| `shahi_latest_master_audit/` | 8.08 MB | Nov 24 keyframe storyboard archive | Zero runtime imports |
| `tmp/` | 23.28 MB | Temporary analysis crops & stills | Zero runtime imports |
| `qa/*` (except `qa/baseline-approved/` & final QA outputs) | 329.38 MB | Legacy screenshots, `temp_frames_mobile/`, old videos | Non-runtime QA artifacts |
| `scripts/*.mjs` (76 one-off QA/crop/audit scripts) | 0.31 MB | One-off historical test/crop utilities (`scripts-legacy/`) | Kept `silk-scroll-delay-bounce.js`, `date-gold-rain.js`, `download-assets.mjs` |
| `scripts/silk-scroll-motion.js` | 5.4 KB | Obsolete scroll controller superseded by `silk-scroll-delay-bounce.js` | Not linked in `index.html` |
| `styles/silk-scroll-motion.css` | 4.3 KB | Obsolete scroll stylesheet superseded by `silk-scroll-delay-bounce.css` | Not linked in `index.html` |
| `MISSING_ASSETS.md`, `QA_REPORT.md` | 19.1 KB | Superseded Nov 23 root documentation | Replaced by `docs/` guides |
| `assets/audio/Wedding.wav` | 86.97 MB | Uncompressed WAV audio master; runtime uses `Wedding-web.mp3` (4.93 MB) | Preserved externally; fallback updated in `main.js` |
| `assets/entrance-floral-watermark.svg` | 2.2 KB | Rejected earlier lotus watermark | Replaced by `entrance-watermark-soft-buti.svg` |
| `assets/media/roll-top1.svg` | 579 B | Unreferenced roller SVG | Zero HTML/CSS/JS references |
| `assets/media/ceremony-corner-embroidered-v2.png` | 2.07 MB | Original `1536×1024` master PNG | Replaced by `960×640` alpha `ceremony-corner-embroidered-v2.webp` (168 KB, -92%) |

---

## 3. Exact Files Deleted

| Deleted Path | Size | SHA-256 | Reason Safe to Delete |
| :--- | :---: | :--- | :--- |
| `assets/media/garden_close.webp` | 268,934 B | `e25cd651ca52...` | Verified SHA-256 byte-for-byte duplicate of `assets/media/garden_close_tall.webp` and unreferenced (desktop uses `sunset-courtyard-wide.webp`, mobile uses `garden_close_tall.webp`). Still preserved inside baseline ZIP. |

---

## 4. Safe Source Refactors & Consolidation Summary

- **`styles.css`:** Removed ~295 lines of proven-dead CSS rules (`.floating-petals` animation rules and legacy pre-`.gframe` gallery selectors `.gallery-wrap`/`.gallery-rope`/`.gallery-item`/`.gallery-frame`/`.gallery-controls`). Visual and responsive cascades preserved intact.
- **`index.html`:** Updated ceremony corner art references (`ceremony-corner-embroidered-v2.webp`), added `id="devanagariHeading"` and `id="rsvpDisclaimer"` hooks for single-source `config.js` customization.
- **`config.js`:** Organized cleanly with inline client sections; removed external `itsbalcony.com` demo fallback URLs in favor of local `assets/photos/photo-1..3.jpg`; added optional `devanagariHeading`, `timeZone`, `instagramUrl`, `rsvpDeadline`, and `rsvpPrivacyNotice` keys preserving identical rendered defaults.
- **`main.js`:** Changed legacy audio fallback from `Wedding.wav` to `Wedding-web.mp3`; wired `devanagariHeading`, `timeZone`, and `rsvpPrivacyNotice` cleanly; added clean optional `provider: 'server'` JSON POST path targeting `/api/rsvp` when using `server.mjs`; added non-blocking placeholder/date format console warnings.
- **`.gitignore`:** Excluded `qa/`, `tmp/`, `dist/`, `data/`, `.env`, `*.zip`, `*.mp4`, `*.wav`, and `node_modules/`.
