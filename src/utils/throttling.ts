/**
 * Throttling strategies for Throttlade
 *
 * This file intentionally does not wire into existing logic. It exposes two
 * functions with the same interface so they can be selected via a small
 * strategy switch later without invasive changes.
 *
 * - throttleWithTimeout: current/simple approach; waits before request.
 * - throttleWithStream: MV3 extension approach; uses webRequest.filterResponseData
 *   to drip response bytes so DevTools shows a continuous download over ~N ms.
 */

export type ThrottleStrategy = "TIMEOUT" | "STREAM";

export type ThrottleContext = {
  /** Absolute URL of the request (as seen by the page). */
  url: string;
  /** HTTP method, default "GET". */
  method?: string;
  /** Target total response time in milliseconds. */
  throttleMs: number;
  /** Optional tab id (if known) to narrow interception in the STREAM strategy. */
  tabId?: number;
};

export type ThrottleResult = {
  strategy: ThrottleStrategy;
  /** Whether throttling was applied. */
  applied: boolean;
  /** Optional diagnostic for why throttling was not applied. */
  reason?: string;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * TIMEOUT strategy: emulate current behavior by delaying before the request is made.
 * Use this from content/inpage where we currently stall prior to forwarding the call.
 */
export async function throttleWithTimeout(ctx: ThrottleContext): Promise<ThrottleResult> {
  const ms = Math.max(0, ctx.throttleMs | 0);
  if (ms > 0) {
    await sleep(ms);
    return { strategy: "TIMEOUT", applied: true };
  }
  return { strategy: "TIMEOUT", applied: false, reason: "throttleMs <= 0" };
}

/**
 * STREAM strategy (Manifest V3 background context):
 *
 * Attempts to stretch the visible download duration to ~throttleMs using
 * chrome.webRequest.filterResponseData. This must run in the extension's
 * background service worker (not in a content script). It installs a
 * temporary onBeforeRequest listener targeting the specific URL (and tabId if provided),
 * intercepts the response stream, and drip-feeds bytes to align the download
 * time with the target.
 *
 * Notes/requirements for actual use (not enforced here):
 * - manifest.json needs permissions: ["webRequest", "webRequestBlocking"] and host permissions for target URLs.
 * - This function should be called before the network request starts so the
 *   ephemeral listener can catch the request.
 */
export async function throttleWithStream(ctx: ThrottleContext): Promise<ThrottleResult> {
  try {
    // Basic environment checks
    if (typeof chrome === "undefined" || !chrome.webRequest) {
      return { strategy: "STREAM", applied: false, reason: "chrome.webRequest unavailable" };
    }
    // @ts-expect-error filterResponseData is MV3-only and not always in type defs
    const hasFilter = typeof chrome.webRequest.filterResponseData === "function";
    if (!hasFilter) {
      return { strategy: "STREAM", applied: false, reason: "filterResponseData not supported" };
    }

    const targetMs = Math.max(0, ctx.throttleMs | 0);
    if (targetMs <= 0) {
      return { strategy: "STREAM", applied: false, reason: "throttleMs <= 0" };
    }

    // Install a one-shot listener keyed to this URL (and optionally tabId)
    // It will intercept the next matching request and pace its response.
    const urlToMatch = ctx.url;

    const filterSpec = { urls: ["<all_urls>"], types: ["xmlhttprequest", "fetch"] } as chrome.webRequest.RequestFilter;

    let resolved = false;
    const result = await new Promise<ThrottleResult>((resolve) => {
      let contentLength: number | null = null;
      const onHeadersReceived = (details: chrome.webRequest.OnHeadersReceivedDetails) => {
        try {
          chrome.runtime?.sendMessage?.({ type: "LOGGER_LOG", level: "debug", msg: "[stream] headers", data: { url: details.url, tabId: details.tabId } }, () => {
            try { (chrome.runtime as any)?.lastError; } catch {}
          });
        } catch {}
        if (details.url !== urlToMatch) return;
        if (typeof ctx.tabId === "number" && details.tabId !== ctx.tabId) return;
        const h = details.responseHeaders || [];
        const cl = h.find((header: chrome.webRequest.HttpHeader) => header.name.toLowerCase() === "content-length");
        if (cl && cl.value) {
          const n = Number(cl.value);
          if (Number.isFinite(n) && n > 0) contentLength = n;
        }
      };

      const onBeforeRequest = (details: chrome.webRequest.WebRequestDetails) => {
        try {
          chrome.runtime?.sendMessage?.({ type: "LOGGER_LOG", level: "debug", msg: "[stream] onBeforeRequest", data: { url: details.url, type: (details as any).type, tabId: details.tabId } }, () => {
            try { (chrome.runtime as any)?.lastError; } catch {}
          });
        } catch {}
        // Narrow match: exact URL and (optionally) tab
        if (details.url !== urlToMatch) return;
        if (typeof ctx.tabId === "number" && details.tabId !== ctx.tabId) return;

        try {
          // @ts-expect-error MV3 experimental type
          const filter = chrome.webRequest.filterResponseData(details.requestId);
          try {
            chrome.runtime?.sendMessage?.({ type: "LOGGER_LOG", level: "debug", msg: "[stream] filter attached", data: { requestId: details.requestId, url: details.url } }, () => {
              try { (chrome.runtime as any)?.lastError; } catch {}
            });
          } catch {}
          const startedAt = Date.now();
          let firstByteAt: number | null = null;
          let sent = 0;
          let bytesPerMs: number | null = null; // decided on first byte when we know TTFB

          const emitPaced = async (buf: Uint8Array) => {
            // Decide pacing on first emission so we account for TTFB.
            if (firstByteAt == null) {
              firstByteAt = Date.now();
              if (contentLength && contentLength > 0) {
                const ttfb = firstByteAt - startedAt;
                const remain = Math.max(0, targetMs - ttfb);
                bytesPerMs = remain > 0 ? (contentLength / remain) : null;
              } else {
                bytesPerMs = null; // unknown size → we’ll pad tail below
              }
            }
            const sz = 16 * 1024; // 16 KiB sub-chunks
            let pos = 0;
            while (pos < buf.length) {
              const end = Math.min(pos + sz, buf.length);
              const chunk = buf.subarray(pos, end);
              filter.write(chunk.buffer);
              sent += chunk.length;
              pos = end;
              if (bytesPerMs && isFinite(bytesPerMs)) {
                const idealMs = sent / bytesPerMs; // ms since first byte
                const nowMs = Date.now() - (firstByteAt ?? Date.now());
                const wait = Math.max(0, idealMs - nowMs);
                if (wait > 0) await sleep(wait);
              }
            }
          };

          filter.ondata = async (event: any) => {
            const u8 = new Uint8Array(event.data);
            try {
              await emitPaced(u8);
            } catch {
              // ignore
            }
          };

          filter.onstop = async () => {
            try {
              // If no content-length known, do a final pad so total ≈ targetMs
              if (!contentLength) {
                const anchor = firstByteAt ?? startedAt;
                const elapsed = Date.now() - anchor;
                const remaining = Math.max(0, targetMs - elapsed);
                if (remaining > 0) await sleep(remaining);
              }
            } catch {}
            try { filter.disconnect(); } catch {}
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve({ strategy: "STREAM", applied: true });
            }
          };

          filter.onerror = () => {
            try { filter.disconnect(); } catch {}
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve({ strategy: "STREAM", applied: false, reason: "filter error" });
            }
          };
        } catch (e) {
          cleanup();
          if (!resolved) {
            resolved = true;
            resolve({ strategy: "STREAM", applied: false, reason: "failed to create filter" });
          }
        }
      };

      const cleanup = () => {
        try {
          chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest as any);
        } catch {}
        try {
          chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceived as any);
        } catch {}
      };

      chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest as any, filterSpec);
      // Observe headers to capture content-length when available
      try {
        chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived as any, filterSpec, ["responseHeaders"] as any);
      } catch {}

      // Safety timeout so we don't leave a dangling listener if no request arrives soon.
      setTimeout(() => {
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve({ strategy: "STREAM", applied: false, reason: "no matching request observed (timeout)" });
        }
      }, 10_000);
    });

    return result;
  } catch (e) {
    return { strategy: "STREAM", applied: false, reason: (e as Error)?.message || "unknown error" };
  }
}

/**
 * Helper: quick probe to see if STREAM strategy is likely usable in this runtime.
 */
export function canUseStreamStrategy(): boolean {
  try {
    // @ts-expect-error filterResponseData may be missing in types
    return Boolean(chrome?.webRequest?.filterResponseData);
  } catch {
    return false;
  }
}
