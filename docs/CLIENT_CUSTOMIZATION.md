# SHAHI PATRA — CLIENT CUSTOMIZATION GUIDE

All wedding invitation text, dates, ceremonies, gallery items, audio, links, and RSVP settings are controlled from **one file**: [`config.js`](../config.js).  
You **do not** need to modify `index.html`, `styles.css`, or `main.js` for normal client customization.

---

## 1. Couple Names, Wedding Date & Welcome Card

Edit lines 17–23 of `config.js`:

| Key | Format / Rule | Example |
| :--- | :--- | :--- |
| `devanagariHeading` | Invocation text above welcome note | `'श्री गणेशाय नमः'` |
| `brideName` | Short first name shown on hero banner | `'Aditi'` |
| `groomName` | Short first name shown on hero banner | `'Rahul'` |
| `title` | Couple title used in page `<title>`, WhatsApp text, calendar & footer | `'Aditi & Rahul'` |
| `date` | **Strict `YYYY-MM-DD`** (feeds Save the Date shields: `DATE`, `MONTH`, `YEAR`) | `'2026-10-11'` |
| `timeZone` | IANA time zone for `.ics` calendar downloads | `'Asia/Kolkata'` |
| `introNote` | 4-line invitation stanza (`\n` creates line breaks) | `'We cordially invite you to\ngrace the auspicious\n...'` |

---

## 2. Family Scrolls (`families`)

`families` is an array of 2 objects (index `0` = Bride's scroll, index `1` = Groom's scroll):

```js
families: [
  {
    name: 'Chi. Aditi Sharma',
    relation: 'Daughter of',
    parents: ['Shri. Jitendra Sharma', 'Smt. Anjana Sharma'],
    grandparentsLabel: 'Granddaughter of',
    grandparents: ['Late Shri. Krishnalal Sharma', 'Late Smt. Rukhmini Sharma']
  },
  // ... Groom family
]
```

> **Note:** Check `relation` (`Daughter of` / `Son of`) and `grandparentsLabel` (`Granddaughter of` / `Grandson of`) carefully for each client. Scroll heights automatically measure and adjust cleanly around longer or shorter family lists.

---

## 3. Gallery Photographs & Story Cards (`gallery`)

The hanging gallery supports **5 items** matching the inspected suspension layout:
1. Portrait photo (`--hang: 118px`)
2. Story quote (`--hang: 86px`)
3. Landscape photo (`--hang: 150px`)
4. Story quote (`--hang: 120px`)
5. Portrait photo (`--hang: 132px`)

### Photo Dimension Guidelines
- **Portrait Photos (`photo-1.jpg`, `photo-3.jpg`):** Recommended **`750 × 1000 px`** (3:4 portrait aspect ratio), JPEG/WebP `< 250 KB`. Keep subjects centered in the upper two-thirds so faces aren't cropped.
- **Landscape Photo (`photo-2.jpg`):** Recommended **`1000 × 750 px`** (4:3 landscape aspect ratio), JPEG/WebP `< 250 KB`. Faces/subjects stay best centered around upper-middle (`object-position: 53% 33%`).
- Save client photographs into `assets/photos/` and update `localImage` in `config.js`. Remove or overwrite the bundled sample photos before publishing for a live client.

---

## 4. Wedding Ceremonies & Google Maps Links (`ceremonies`)

`ceremonies` supports 5 cards arranged in a symmetrical `3 + 2` desktop grid (and stacked single-column on phones):

- `name`: Event heading (e.g. `'Mehendi'`, `'Haldi'`, `'Sangeet'`, `'Vivaah'`, `'Reception'`)
- `date`: `YYYY-MM-DD`
- `time`: 24-hour `HH:MM` (displayed in 12-hour format, e.g. `'19:30'` -> `7:30 pm`, and exported to `.ics`)
- `venue`: Venue address string
- `art`: Bundled filename inside `assets/media/`:
  - `mehendi.webp`
  - `haldi.webp`
  - `sangeet.webp`
  - `vivaah.webp`
  - `reception.webp`
  - `ring_ceremony.webp` (available for Engagement / Ring Ceremony!)
- `mapsUrl`: Paste an exact Google Maps share link. If left `''`, the map icon automatically searches Google Maps using the `venue` text.

---

## 5. Compliments, Notes & Sunset Farewell

- `complimentsTitle`: Heading inside the first lower scroll
- `compliments`: Array of strings, one per family line
- `noteTitle`: Heading inside the bottom scroll
- `note`: Short informational paragraph (e.g., valet, dress code, airport shuttle)
- `farewell`: Quote displayed on the sunset courtyard easel

---

## 6. Music, Social Links & Calendar

- `music`: Path to a licensed soundtrack file in `assets/audio/`. Use **MP3 or AAC (128–192 kbps, ~3–6 MB)**—avoid uncompressed `.wav` files for web delivery.
- `musicVolume`: Playback volume from `0` to `1` (default `0.5`).
- `instagramUrl`: Optional link to couple's wedding Instagram page. When empty (`''`), the button remains visibly disabled with `Instagram link unavailable`.
- `invitationUrl`: Published public site URL for WhatsApp share helper.

---

## 7. RSVP Integration (`w3forms` & Privacy Notice)

- **Option A — Static Hosting with Web3Forms (Default):**
  1. Create a free form key at `https://web3forms.com/` for the host's email address.
  2. Set `provider: 'web3forms'` and paste `accessKey: '<your-uuid-key>'` in `config.js`.
  3. Set the allowed domain inside your Web3Forms dashboard so automated spam from other domains is blocked.
  4. Send one labeled test RSVP on the **live deployed domain** and verify it lands in the host's inbox (do not treat `"success": true` from a sandbox or local origin alone as inbox proof).
- **Option B — Self-Hosted Node Server (`/api/rsvp`):**
  1. Set `provider: 'server'` in `config.js` (no Web3Forms access key required).
  2. Run `node server.mjs` behind HTTPS and set a strong `ADMIN_TOKEN` (16+ characters) to view RSVPs at `/admin.html`.
- Update `rsvpDeadline` and `rsvpPrivacyNotice` in `config.js` to match the client's RSVP cutoff date and guest data handling notice.

---

## 8. Commercial & Licensing Reminder

1. **Couple Photos (`assets/photos/`):** Sample images must be replaced with photographs the wedding client owns or has permission to publish.
2. **Audio (`assets/audio/`):** Confirm commercial/public streaming rights for the client's chosen wedding music track.
3. **Decorative Media (`assets/media/`):** Do not redistribute third-party template imagery commercially without proper rights; bundled fallback SVGs (`assets/fallback/*.svg`) and OFL fonts (`assets/fonts/`) are local and open-licensed (`OFL-*.txt`).
