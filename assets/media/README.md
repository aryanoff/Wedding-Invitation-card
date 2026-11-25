# Website art and media

The original page's decorative images are served from publicly accessible URLs, but **they were not included in the ZIP you uploaded**.

The project first looks for these assets in this folder. If they aren't installed and the device is online, it attempts to load their public web URLs. When neither is available, handmade SVG fallback art in `../fallback/` is displayed.

To save the publicly accessible media locally, run from the project root:

```bash
npm run download-assets
```

Use the source website's art only with appropriate permission or licensing. You can replace any image with your own artwork using the same filenames.
