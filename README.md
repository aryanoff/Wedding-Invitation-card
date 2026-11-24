# Shahi Patra — Complete editable wedding invitation reconstruction

A **newly implemented** multi-file wedding invitation modeled from the reference invitation's appearance and two screen recordings supplied by the requester. This is **not** Balcony's original source code or a copy of its private backend. Your ZIP contained only an outer HTML page with an iframe pointing to `/templates/royale/index.html` (not the actual template code/assets).

## Open the invitation

**Fastest:** extract the ZIP and double-click `index.html`. The visual fallback assets and core animations work without a server.

**Recommended (Node 18+):** open the project in VS Code's terminal and run:

```bash
npm start
```

Then go to **http://localhost:3000/**. There are no packages to install.

**Download the source template's public art** (if you have permission to use it):

```bash
npm run download-assets
```

This saves the public decorative image files into `assets/media/`. Without that, the page first tries those public URLs over the network and falls back to locally bundled hand-drawn SVG art if offline. **The ZIP initially includes original replacement fallback SVG art, not Balcony's hosted media files.** The downloadable public media may be subject to copyright or the site owner's terms, so do not redistribute without permission. The original private JavaScript/backend cannot be recovered from this ZIP.

## Edit your wedding details

Open `config.js` and change:

- Couple names and wedding date
- Family names, relatives and blessing text
- Ceremony names, dates, time and venue (plus optional `mapsUrl`)
- Gallery photo URLs (replace with your own `assets/photos/photo-1.jpg`, etc.)
- Invitation message, compliments and farewell
- `music` — add an audio file at `assets/audio/wedding.mp3`
- `invitationUrl` — use the URL of your deployed site to share on WhatsApp
- `rsvpWhatsAppNumber` — optional, e.g. `919876543210`, to collect an RSVP via WhatsApp as well

The provided names and dates were copied from the user-supplied ZIP's visible invitation data. It includes an inconsistent family role label in the source; it has been preserved verbatim for editing. Events shown in the source were in October 2026 and have not been silently changed.

## Features included

- Responsive three-panel royal entrance that opens like doors
- Animated garden/mandap hero with floating petals and couple names
- Two ornate family scrolls with gold rolls
- Tap-to-reveal date with three tiles and `.ics` calendar download
- Horizontal, swipeable photo/story gallery with hanging framed cards
- Arched ceremony cards, event date/time, and one-click Google Maps search
- Compliments, notes and sunset-palace farewell
- Guest RSVP form with name, mobile number, headcount, per-event Yes/Maybe/No responses and wishes
- RSVP localStorage fallback and optional working Node server persistence
- Private admin at `/admin.html` with guarded token and CSV download
- WhatsApp share, background music toggle, reduced-motion accessibility

## Where do RSVPs go?

- If you open `index.html` directly, responses are saved **only in that visitor's own browser**. That does not transmit the RSVP to you.
- If you run `npm start`, RSVP form submissions go to the Node server's `/api/rsvp` endpoint, which stores them in `data/rsvps.json`. That data is kept on the **server**.
- You may alternatively set `rsvpWhatsAppNumber` so guests can choose to message their RSVP directly to you.

To see all server RSVPs, set a private 16+ character admin token before starting the server:

**Windows PowerShell:**

```powershell
$env:ADMIN_TOKEN = "replace-with-a-long-private-random-string"
npm start
```

**macOS / Linux:**

```bash
ADMIN_TOKEN="replace-with-a-long-private-random-string" npm start
```

Open `http://localhost:3000/admin.html` and enter the token. Never publish your admin token in a frontend file. Do not commit `data/rsvps.json` to Git.

## Production hosting notes

The optional Node server demonstrates persistent RSVPs with basic validation, same-origin checks, request size limits, simple rate limiting, and a protected read endpoint. For production hosting, put it behind HTTPS and use a production database, secure backups, explicit guest-data consent and a privacy policy; consider stronger abuse prevention, server monitoring, and robust session management.

Static hosting (GitHub Pages, basic Netlify) runs the invitation but **does not run the Node API**. To collect guest responses across devices, host the Node server or connect your own backend/Google Forms/WhatsApp workflow. Google Maps buttons use *venue searches* until you supply exact map links. To play music add audio you are licensed to use; none was provided in this ZIP.

## Project structure

```
index.html                   Main invitation page
styles.css                   All responsive styles and animations
main.js                      Animations, gallery, buttons, calendar, RSVP logic
config.js                    Couple, dates, family, gallery & ceremony settings
server.mjs                   Optional Node RSVP server
admin.html / admin.js        Private RSVP viewer + CSV export
assets/fallback/             Original hand-drawn local SVG fallback art
assets/media/                Public original-style visual assets (optional download)
assets/photos/               Your own gallery photos
assets/audio/                Your licensed background music
scripts/download-assets.mjs  Downloads list of publicly available artwork
```

### Important

This is a functioning **visual and interaction reconstruction**, not a bit-for-bit duplicate of the site's source code. Exact visual fidelity improves by providing the original licensed assets; the reference videos do not include the complete source code. All editable HTML/CSS/JS and server source files in this project have been written anew.

`npm run download-assets` also attempts to save the three public sample gallery photographs named in the user-supplied page data into `assets/photos/`. They were **not** present in the upload. Replace them with images you have rights to use.

# Wedding-Invitation-card
