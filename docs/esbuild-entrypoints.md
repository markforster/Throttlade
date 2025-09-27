# Build Entry Points and Where to Find Them

This extension is bundled with esbuild. The `entryPoints` block in `esbuild.config.mjs` lists the files that get transformed into JavaScript bundles for Chrome. When you are new to the project, it can be hard to know where those source files live or how they show up in the published extension. This guide walks through each entry so you always know where to look and how the manifest wires everything together.

## background → `src/background.ts`

The background bundle drives the extension’s long-lived logic: it listens for runtime messages, coordinates throttling, and keeps the dashboard in sync. The source code now lives in `src/background.ts`, which acts as a small entrypoint that pulls in the real logic from `src/background/`. esbuild compiles this TypeScript into `dist/background/background.js`. In the manifest, Chrome loads that file as the service worker via:

```json
"background": {
  "service_worker": "background/background.js",
  "type": "module"
}
```

If you ever need to tweak background behaviour, start in `src/background/` (for ports, lifecycle, and message handlers) and remember the compiled output is what Chrome actually executes.

## content → `src/content.ts`

The content bundle is injected into every page and is responsible for wrapping `fetch` and `XMLHttpRequest`, syncing throttling state, and reporting when requests are delayed. The new structure breaks this into a few files under `src/content/`, but the compiled entrypoint remains `src/content.ts`. esbuild outputs `dist/content.js`, which the manifest loads in the first `content_scripts` block:

```json
{
  "matches": ["<all_urls>"],
  "js": ["content.js"],
  "run_at": "document_start"
}
```

Any edits to how we patch network calls or listen to chrome storage belong in this folder.

## content-bridge → `src/content-bridge.ts`

This bridge runs in the page context (the "MAIN" world) so it can observe network traffic directly and forward state updates back to the extension. esbuild emits `dist/content-bridge.js`. The manifest references it in the second `content_scripts` entry:

```json
{
  "matches": ["<all_urls>"],
  "js": ["inpage/inpage.js"],
  "world": "MAIN",
  "run_at": "document_start"
}
```

When you are chasing bugs related to the in-page messaging bridge, this is the file to inspect.

## inpage → `src/inpage.ts`

The in-page script works alongside the bridge to capture responses in the page’s native context. It gets bundled to `dist/inpage/inpage.js`, which is the file referenced in the manifest entry above. Although smaller than the bridge, it lives under the same responsibility: keeping the extension aware of network activity happening in the page itself.

## popup → `src/popup.tsx`

The popup bundle powers the little window you see when clicking the extension icon. It renders the quick controls and status indicators. esbuild compiles it into `dist/popup.js`. The Chrome manifest exposes it through `manifest.action.default_popup`, which points to `popup.html`. That HTML file sits in `dist/popup.html` and loads `popup.js` under the hood.

If you want to change the popup UI, edit `src/popup.tsx` (and the React components under `src/components/`).

## options → `src/options.tsx`

The options bundle is the full dashboard. Everything you see in the options tab—rules, logs, requests—comes from `src/options.tsx` and its child components. esbuild produces `dist/options.js`; the manifest references this through `options_page: "options.html"`. Like the popup, the `options.html` file includes the compiled JavaScript automatically.

## Mapping Recap

For quick reference, here is how each entry point appears in both the source tree and the manifest:

| esbuild entry | Source file                | Output path                       | Manifest hook |
|---------------|----------------------------|-----------------------------------|----------------|
| `background`  | `src/background.ts`        | `dist/background/background.js`   | `background.service_worker` |
| `content`     | `src/content.ts`           | `dist/content.js`                 | First `content_scripts` entry |
| `content-bridge` | `src/content-bridge.ts` | `dist/content-bridge.js`          | Second `content_scripts` entry |
| `inpage`      | `src/inpage.ts`            | `dist/inpage/inpage.js`           | Second `content_scripts` entry |
| `popup`       | `src/popup.tsx`            | `dist/popup.js`                   | `action.default_popup` (via `popup.html`) |
| `options`     | `src/options.tsx`          | `dist/options.js`                 | `options_page` (via `options.html`) |

Whenever you create a new surface—whether another dashboard page or an additional content script—add it to this table in your head: point esbuild at the TypeScript source, know where the compiled file lands, and wire that path into `manifest.json`.
