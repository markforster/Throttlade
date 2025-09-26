# Stream Throttling (Status)

Goal
- Make network requests appear to “take N ms” in Chrome DevTools with a continuous Content Download bar (no stall-before or stall-after), for both `fetch` and `XMLHttpRequest`.

Why not just delay in page JS?
- Wrapping `window.fetch`/`XMLHttpRequest` and inserting `setTimeout` only delays app callbacks. DevTools still shows the real network timing, so you see gaps instead of an extended download. To affect DevTools, we must shape bytes at the network boundary.

Approaches considered
- Service Worker (page scope): clean, but not viable for arbitrary sites from a Chrome extension; SW must be same-origin with the page.
- Extension `webRequest.filterResponseData`: can stream/drip response bytes in the extension background for both fetch and XHR; DevTools reflects the longer download. Chosen approach.
- Keep existing TIMEOUT approach as fallback via a feature flag.

Current implementation (in repo)
- Feature flag: `src/utils/featureFlags.ts` exports `THROTTLE_STRATEGY` = `"TIMEOUT" | "STREAM"` (default: `TIMEOUT`).
- Strategy functions: `src/utils/throttling.ts`
  - `throttleWithTimeout(ctx)`: delay before request (what we already had, formalized).
  - `throttleWithStream(ctx)`: primes a one-shot `webRequest` listener, attaches `filterResponseData`, and paces bytes.
  - Pacing details: captures `Content-Length` (via non-blocking `onHeadersReceived`), accounts for TTFB, and drips 16 KiB sub-chunks so total time ≈ `throttleMs`.
- Integration (non-destructive):
  - `src/inpage.ts` and `src/content.ts`: commented out the old inline delay, replaced with a call to the selected strategy. For STREAM, the in-page script posts a prime message; the content bridge forwards to background; background kicks off `throttleWithStream`.
  - A short ACK handshake reduces races so the listener is ready before the request starts.
- Demo page: `demo/index.html` to trigger Fetch/XHR requests for testing.

What works
- TIMEOUT: behaves as before, controlled via the flag.
- STREAM: code paths compile and run in MV3 without `webRequestBlocking`.

What’s not yet working
- In manual testing with `https://catfact.ninja/fact` and a rule of 5000 ms, Fetch/XHR still completed in ~190 ms. DevTools showed a short Content Download, indicating the streaming filter did not pace the bytes as intended.

Likely causes (to investigate)
- Request type mismatch: ensure `webRequest` captures Fetch as `type: "fetch"` (we added it) and that `filterResponseData` supports it on your Chrome version. If not, Fetch may appear as `xmlhttprequest` or `other`.
- Race conditions: even with the ACK, the listener may miss the request if it starts too soon. A slightly longer priming window or a small delay before dispatching the request may help.
- URL match strictness: matching `details.url === ctx.url` may miss redirects or minor differences (e.g., trailing slash). Relax to prefix/origin+path match.
- `filterResponseData` availability: not all request types are filterable in all Chrome builds. Add diagnostics to confirm `filterResponseData` is created and events fire.

Next steps (recommended)
1) Add richer diagnostics in background:
   - Log every `onBeforeRequest` for the target origin, the chosen match, when `filterResponseData` attaches, and counts of ondata events.
2) Loosen match:
   - Match by origin+pathname and ignore query; optionally normalize trailing slashes.
3) Prime with a brief guard window:
   - Keep the one-shot listener active for ~500 ms after ACK to catch the next request.
4) Include more types:
   - Try including `"other"` and `"main_frame"` in the filter list to cover edge cases.
5) Tab scoping:
   - Pass `sender.tab?.id` from `background` when priming so we only intercept the correct tab’s request.
6) Test on a larger payload (e.g., `https://jsonplaceholder.typicode.com/photos`) to make pacing visible and easier to confirm.

Constraints and decisions so far
- Removed experimental CORS header helper and its references; we’ll rely on CORS-friendly public APIs or the demo’s optional proxy.
- Kept permissions minimal: `webRequest` only; no `webRequestBlocking`.
- No upload throttling yet (response/download only).

How to exercise current code
- Set `THROTTLE_STRATEGY = "STREAM"` in `src/utils/featureFlags.ts`.
- Build and reload extension.
- Use the demo page and the rules UI to target the test URL and set a delay.
- Check the extension service worker console for `[Throttlr][stream]` logs.

Pick-up checklist
- [ ] Add and review background logs for `onBeforeRequest`, `onHeadersReceived`, `filter attached`, and `ondata` counts.
- [ ] Relax URL matching and re-test.
- [ ] Add small priming window (e.g., 300–500 ms) before dispatching Fetch/XHR or keep listener alive briefly.
- [ ] Verify Chrome version’s support matrix for `filterResponseData` on `type: "fetch"`.
- [ ] Test with a large response and compare DevTools timing.

