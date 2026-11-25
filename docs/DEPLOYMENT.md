# SHAHI PATRA — DEPLOYMENT & OPERATIONS GUIDE

## 1. Local Preview & Development

**Prerequisites:** Node.js `18+` (verified on `v22.23.1`). No third-party runtime dependencies are required for serving the invitation site.

```bash
# 1. Start local server (serves http://localhost:3000)
npm start
```

> **Note:** Opening `index.html` directly via `file://` may block certain browser features (such as Web Fonts preloading or `fetch` RSVP requests). Always preview over HTTP (`npm start` or a static dev server).

---

## 2. What Gets Deployed vs. Kept Private

### Option A — Static Website Hosting (Recommended: Netlify, Vercel, Cloudflare Pages, GitHub Pages, Nginx/Apache)

Deploy **ONLY the clean production static bundle** (`Shahi-Patra-Production-Deploy-20261125.zip` or its contents):
- `index.html`, `styles.css`, `main.js`, `config.js`
- `styles/` (`silk-scroll-delay-bounce.css`, `entrance-soft-floral-override.css`, `date-gold-rain.css`)
- `scripts/` (`silk-scroll-delay-bounce.js`, `date-gold-rain.js`)
- `assets/` (`media/`, `photos/`, `audio/Wedding-web.mp3`, `fonts/`, `fallback/`, `entrance-watermark-soft-buti.svg`)

**NEVER upload to a public static web host:**
- `qa/` (screenshots, videos, telemetry)
- `docs/`, `package.json`, `package-lock.json`, `node_modules/`
- `.git/`, `.gitignore`, `.env`, backup `.zip` files
- `server.mjs`, `admin.html`, `admin.js`, `data/` (not needed when using `provider: 'web3forms'`)

### Option B — Full Node.js Hosting (When Using Built-in `/api/rsvp` & `/admin.html`)

If `config.js` is configured with `provider: 'server'`:
1. Deploy root files including `server.mjs`, `admin.html`, `admin.js`, `index.html`, `styles.css`, `main.js`, `config.js`, `styles/`, `scripts/`, `assets/` (excluding `qa/`, `tmp/`, `.git/`).
2. Set environment variables cleanly:
   - `PORT=3000` (or platform port)
   - `ADMIN_TOKEN="<long-random-32+-char-secret>"`
3. Put Node behind an **HTTPS reverse proxy** (Caddy, Nginx, Cloudflare, or platform TLS). `server.mjs` stores RSVPs in `data/rsvps.json` (`0600` permissions) and blocks public static HTTP access to `data/`, `.git/`, `server.mjs`, `package.json`, and `package-lock.json`.
4. Add automated offsite backups for `data/rsvps.json` and review `robots` (`admin.html` already includes `noindex,nofollow`).

---

## 3. Hosting Security & Caching Headers

For static hosts (Netlify `_headers`, Vercel `vercel.json`, Nginx), configure:
- **HTTPS redirect:** Always enforce HTTPS in production.
- **Security headers:**
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: SAMEORIGIN`
- **Caching:**
  - Cache `assets/fonts/*`, `assets/media/*`, `assets/photos/*`, `assets/audio/*`: `public, max-age=604800`
  - Keep `index.html` and `config.js` short-lived (`no-cache` or `max-age=60`) so client text/date edits go live immediately.
- **Linux Case Sensitivity:** All active HTML/CSS/JS/config asset paths have been audited against disk filenames with exact casing. Maintain lowercase filenames cleanly.

---

## 4. Backup & Rollback Instructions

### Baseline Safety Copies Created Before Cleanup
- **Full Pre-Cleanup Snapshot ZIP:** `C:\Users\Araya\Downloads\Shahi-Patra-Editable-BASELINE-BACKUP-20261125.zip` (488.37 MB)
- **Archived Legacy Files Folder:** `C:\Users\Araya\Downloads\Shahi-Patra-Archive-20261125\`
- **Git Branch Checkpoint:** `chore/shahi-patra-finalization` (branched cleanly from `main` `e7de010`)

### To Roll Back Entire Workspace to Pre-Cleanup Baseline
1. Stop any running Node server on port 3000.
2. Extract `Shahi-Patra-Editable-BASELINE-BACKUP-20261125.zip` over a clean directory, restore `.git/` if needed, and run `npm ci && npm start`.
3. To roll back code-only edits made on `chore/shahi-patra-finalization`, use standard Git restore/checkout commands.
