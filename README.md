# Shahi Patra — Royal Wedding Invitation (`Shahi-Patra-Editable`)

A self-contained, editable royal Rajasthani wedding invitation with zero runtime dependencies. Includes a 3D velvet curtain entrance, staged palace mandap hero reveal, silk family scrolls with natural delayed bounce physics, slot-machine date reveal with celebratory petals and sparks, parallax pavilion interlude, 3D suspended hanging story gallery, Mughal arched ceremony cards, sunset courtyard easel finale, offline self-hosted typography, and inline RSVP delivery (Web3Forms or optional Node server).

---

## Quick Start

**Requirements:** Node.js `18+` (tested on `v22.23.1`)

```bash
npm start
```

Then open **`http://localhost:3000/`**. Zero third-party npm packages are required to run the site (`puppeteer-core` is dev/QA-only).

---

## Documentation Index

| Document | Purpose |
| :--- | :--- |
| **[Client Customization Guide](docs/CLIENT_CUSTOMIZATION.md)** | How to update names, wedding dates, parents/grandparents, ceremonies, maps, gallery photos, music, and RSVP settings in [`config.js`](config.js) |
| **[Deployment & Operations Guide](docs/DEPLOYMENT.md)** | Static hosting (Netlify/Vercel/GitHub Pages), optional Node RSVP server (`ADMIN_TOKEN`), security headers, and rollback steps |
| **[File Dependency Manifest](docs/FILE_DEPENDENCY_MANIFEST.md)** | Complete inventory of active runtime, development, and archived files |
| **[Cleanup & Size Optimization Log](docs/CLEANUP_LOG.md)** | Exact before/after project sizes, archived files, and asset optimizations |
| **[Final QA Report](docs/QA_FINAL_REPORT.md)** | Post-cleanup functional tests, multi-viewport layout checks, visual parity comparison, and verification status |

---

## Project Structure

```text
Shahi-Patra-Editable/
├── index.html                           # Primary invitation webpage
├── config.js                            # Single source of truth for wedding details
├── main.js                              # Entrance, date reel, gallery, ceremonies, audio & RSVP logic
├── styles.css                           # Core design tokens, layout & responsive breakpoints
├── styles/
│   ├── silk-scroll-delay-bounce.css     # Silk scroll hardware, fabric & cloth trim styles
│   ├── entrance-soft-floral-override.css# Parchment grain, floral buti, Devanagari & cartouche CTA
│   └── date-gold-rain.css               # Scalloped shields, shimmer, petals & spark bursts
├── scripts/
│   ├── silk-scroll-delay-bounce.js      # Delayed viewport-triggered scroll unroll & bounce engine
│   ├── date-gold-rain.js                # Date celebration shower & DOM cleanup controller
│   └── download-assets.mjs              # Optional asset fetcher (`npm run download-assets`)
├── assets/
│   ├── media/                           # Decorative illustrations, backdrops & ceremony emblems
│   ├── photos/                          # Replace with couple photographs before publishing
│   ├── audio/Wedding-web.mp3            # Optimized playback music track
│   ├── fonts/                           # Self-hosted WOFF2/TTF web fonts & OFL licenses
│   └── fallback/                        # Lightweight local SVG fallbacks
├── server.mjs, admin.html, admin.js     # Optional self-hosted Node RSVP server & private dashboard
└── docs/                                # Setup, customization, deployment, cleanup & QA documentation
```
