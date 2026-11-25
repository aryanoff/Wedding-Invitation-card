/**
 * SHAHI PATRA — CLIENT INVITATION CONFIGURATION (SINGLE SOURCE OF TRUTH)
 *
 * Edit all couple, family, event, gallery, media, social, and RSVP settings here.
 * Visual layout, animations, and responsive styling adapt automatically.
 * See docs/CLIENT_CUSTOMIZATION.md for image dimensions and deployment steps.
 *
 * Formatting rules:
 * - Dates: YYYY-MM-DD (e.g. '2026-10-11')
 * - Times: 24-hour HH:MM (e.g. '19:30')
 * - Music: optimized MP3/AAC file in assets/audio/
 * - Gallery photos: save client photographs to assets/photos/ (replace sample photos!)
 */
window.WEDDING_CONFIG = {
  /* ------------------------------------------------------------------------
     1. COUPLE & ENTRANCE CARD
     ------------------------------------------------------------------------ */
  devanagariHeading: 'श्री गणेशाय नमः',
  brideName: 'Aditi',
  groomName: 'Rahul',
  title: 'Aditi & Rahul',
  date: '2026-10-11',
  timeZone: 'Asia/Kolkata',
  introNote: 'We cordially invite you to\ngrace the auspicious\noccasion of the marriage\nof…',

  /* ------------------------------------------------------------------------
     2. MUSIC, LINKS & ANIMATION TIMING
     ------------------------------------------------------------------------ */
  music: 'assets/audio/Wedding-web.mp3',
  musicVolume: 0.5,
  scrollDelayMs: 450,     // Pause before each silk scroll unrolls (ms)
  invitationUrl: '',      // Optional: live website URL included in shared messages
  instagramUrl: '',       // Optional: couple/wedding Instagram URL (disabled when empty)
  rsvpWhatsAppNumber: '', // Optional: digits with country code (e.g. 919876543210)

  /* ------------------------------------------------------------------------
     3. RSVP FORM & DELIVERY SETTINGS
     provider: 'web3forms' (static hosting, recommended) or 'server' (uses server.mjs /api/rsvp)
     ------------------------------------------------------------------------ */
  w3forms: {
    provider: 'web3forms',
    accessKey: '9fe7963b-2845-47a7-af6c-b1864e643658',
    defaultGuests: 2,
    maxGuests: 10
  },
  rsvpDeadline: '',       // Optional: e.g. 'Please RSVP by 1 October 2026.'
  rsvpPrivacyNotice: 'Your response and mobile number are sent to the wedding host through Web3Forms for wedding arrangements.',

  /* ------------------------------------------------------------------------
     4. FAMILY SCROLLS (BRIDE & GROOM)
     Preserves original sample structure; update labels/names cleanly per client.
     ------------------------------------------------------------------------ */
  families: [
    {
      name: 'Chi. Aditi Sharma',
      relation: 'Daughter of',
      parents: ['Shri. Jitendra Sharma', 'Smt. Anjana Sharma'],
      grandparentsLabel: 'Grandson of',
      grandparents: ['Late Shri. Krishnalal Sharma', 'Late Smt. Rukhmini Sharma']
    },
    {
      name: 'Kum. Rahul Verma',
      relation: 'Son of',
      parents: ['Shri Rajesh Kumar Verma', 'Smt. Meera Verma'],
      grandparentsLabel: 'Granddaughter of',
      grandparents: ['Late Shri Hari Prasad Verma', 'Late Smt. Shanti Devi Verma']
    }
  ],

  /* ------------------------------------------------------------------------
     5. OUR STORY HANGING GALLERY (5 ITEMS: PORTRAIT, STORY, LANDSCAPE, STORY, PORTRAIT)
     Replace localImage paths with authorized client photographs before going live.
     ------------------------------------------------------------------------ */
  gallery: [
    {
      type: 'photo',
      caption: '#howitstarted',
      rotation: -1.8,
      orientation: 'portrait',
      localImage: 'assets/photos/photo-1.jpg'
    },
    {
      type: 'story',
      rotation: 0.6,
      orientation: 'portrait',
      text: 'Some stories begin with grand gestures. Ours started with a simple conversation.'
    },
    {
      type: 'photo',
      caption: '#adventures',
      rotation: -2.0,
      orientation: 'landscape',
      localImage: 'assets/photos/photo-2.jpg'
    },
    {
      type: 'story',
      rotation: -0.4,
      orientation: 'portrait',
      text: "Friendship grew into something more, and we realized life's best moments were the ones we shared together."
    },
    {
      type: 'photo',
      caption: '#thelittlethings',
      rotation: 1.6,
      orientation: 'portrait',
      localImage: 'assets/photos/photo-3.jpg'
    }
  ],

  /* ------------------------------------------------------------------------
     6. WEDDING CEREMONIES (3 TOP + 2 BOTTOM)
     Supported bundled illustrations in assets/media/:
     mehendi.webp, haldi.webp, sangeet.webp, vivaah.webp, reception.webp, ring_ceremony.webp
     ------------------------------------------------------------------------ */
  ceremonies: [
    { name: 'Mehendi', date: '2026-10-10', time: '11:00', venue: 'Sharma Residence, Jaipur', art: 'mehendi.webp', mapsUrl: '' },
    { name: 'Haldi', date: '2026-10-10', time: '16:00', venue: 'Sharma Residence, Jaipur', art: 'haldi.webp', mapsUrl: '' },
    { name: 'Sangeet', date: '2026-10-10', time: '19:30', venue: 'Sharma Residence, Jaipur', art: 'sangeet.webp', mapsUrl: '' },
    { name: 'Vivaah', date: '2026-10-11', time: '20:00', venue: 'Sharma Residence, Jaipur', art: 'vivaah.webp', mapsUrl: '' },
    { name: 'Reception', date: '2026-10-12', time: '20:00', venue: 'Sharma Residence, Jaipur', art: 'reception.webp', mapsUrl: '' }
  ],

  /* ------------------------------------------------------------------------
     7. COMPLIMENTS, NOTES & FAREWELL EASEL
     ------------------------------------------------------------------------ */
  complimentsTitle: 'With Best Compliments From:',
  compliments: [
    'Shri Suresh Sharma & Family (Chacha-Chachi)',
    'Shri Manoj Sharma & Family (Tau-Tai)',
    'Smt. Asha Gupta & Family (Bua)',
    'Shri Rajendra Mehta & Family (Mama-Mami)'
  ],
  noteTitle: 'Things to Note',
  note: 'Complimentary valet parking is available at the main entrance of The Grand Oak Estate for our wedding day.',
  farewell: 'Your Presence Means the World to Us'
};
