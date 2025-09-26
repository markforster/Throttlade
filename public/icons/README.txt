Place your icon files in this folder. Expected filenames:

- favicon.ico
- favicon-16x16.png
- favicon-32x32.png
- apple-touch-icon.png
- safari-pinned-tab.svg
- android-chrome-192x192.png
- android-chrome-512x512.png
- mstile-150x150.png (optional)
- icon16.png (extension icon)
- icon32.png (extension icon)
- icon48.png (extension icon)
- icon128.png (extension icon)

Notes:
- The build copies `public/` to `dist/`, so these will be available at `dist/icons/...`.
- `manifest.json` references `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` for the extension icon and toolbar icon.
- Popup and Options pages reference the `favicon*`, `apple-touch-icon`, and `safari-pinned-tab.svg`.
