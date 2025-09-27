import { Rule } from "./types";
import { THROTTLE_STRATEGY } from "./utils/featureFlags";
import { throttleWithTimeout, type ThrottleContext } from "./utils/throttling";
import { enabled, setEnabled, setRules } from "./utils/rules";
import { matches } from "./utils/rules/matches";
import { pathOf } from "./utils/pathOf";
import { reqStart, reqEnd } from "./utils/requests";

// export let rules: Rule[] = [];
// export let enabled = true;

// load rules on script start + listen for updates
chrome.storage.sync.get(["rules", "enabled"], (data) => {
  // rules = data.rules ?? [];
  setRules(data.rules ?? []);
  // enabled = typeof data.enabled === "boolean" ? data.enabled : true;
  setEnabled(typeof data.enabled === "boolean" ? data.enabled : true);
});

chrome.storage.onChanged.addListener((c) => {
  // if (c.rules) rules = c.rules.newValue ?? [];
  if (c.rules) setRules(c.rules.newValue ?? []);
  if (c.enabled) setEnabled(typeof c.enabled.newValue === "boolean" ? c.enabled.newValue : true);
});

// Prefer effective state broadcast from the bridge when available
window.addEventListener("message", (ev: MessageEvent) => {
  const d = ev.data as any;
  if (d && d.__THROTTLR__ && d.type === "STATE") {
    if (Array.isArray(d.rules)) setRules(d.rules as Rule[]);
    if (typeof d.enabled === "boolean") setEnabled(d.enabled as boolean);
  }
});

// fetch patch
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!enabled) return originalFetch(input, init);
  const url = typeof input === "string" ? input : (input as Request).url;
  const method = (init?.method || (typeof input !== "string" && (input as Request).method) || "GET");
  const rule = matches(url, method);
  if (rule) {
    // Old timeout-based delay (commented out during strategy integration):
    // await delay(rule.delayMs);

    // New strategy selection
    const ctx: ThrottleContext = { url, method, throttleMs: rule.delayMs };
    const id = Math.random().toString(36).slice(2);
    const startedAt = Date.now();
    reqStart({ id, url, path: pathOf(url), method: (method || "GET").toUpperCase(), throttleMs: rule.delayMs, startedAt });
    if (THROTTLE_STRATEGY === "TIMEOUT") {
      await throttleWithTimeout(ctx);
    } else {
      // STREAM strategy: prime background to throttle the matching response.
      // Fire-and-wait-for-primed ack so the listener is set before the request.
      try {
        await chrome.runtime.sendMessage({ type: "THROTTLE_STREAM_PRIME", ctx });
      } catch {
        // If messaging fails, we simply proceed without stream throttling.
      }
    }
    try {
      const res = await originalFetch(input, init);
      reqEnd({ id, finishedAt: Date.now() });
      return res;
    } catch (e: any) {
      reqEnd({ id, finishedAt: Date.now(), error: e?.message || String(e) });
      throw e;
    }
  }
  return originalFetch(input, init);
};

// XHR patch
const xhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
  (this as any).__throttleRule = matches(url, method);
  // Store normalized context to allow STREAM strategy to target exact URL
  try {
    const abs = new URL(url, document.baseURI).toString();
    (this as any).__throttlrCtx = { method: (method || "GET").toUpperCase(), url: abs };
  } catch {
    (this as any).__throttlrCtx = { method: (method || "GET").toUpperCase(), url: String(url) };
  }
  return xhrOpen.call(this, method, url, ...rest);
};
const xhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = async function (...args: any[]) {
  const rule = enabled ? ((this as any).__throttleRule as Rule | undefined) : undefined;
  if (rule) {
    // Old timeout-based delay (commented out during strategy integration):
    // await delay(rule.delayMs);

    const method = (this as any)?.__throttlrCtx?.method || (this as any)?.__throttleRule?.method || "GET";
    const currentUrl = (this as any)?.__throttlrCtx?.url || (this as any)?.responseURL;
    const ctx: ThrottleContext = {
      url: currentUrl || url || "",
      method,
      throttleMs: rule.delayMs,
    };

    const id = Math.random().toString(36).slice(2);
    const startedAt = Date.now();
    try { reqStart({ id, url: ctx.url, path: pathOf(ctx.url), method, throttleMs: rule.delayMs, startedAt }); } catch {}
    if (THROTTLE_STRATEGY === "TIMEOUT") {
      await throttleWithTimeout(ctx);
    } else {
      try {
        await chrome.runtime.sendMessage({ type: "THROTTLE_STREAM_PRIME", ctx });
      } catch {
        // fall through
      }
    }
    try {
      this.addEventListener("loadend", () => {
        reqEnd({ id, finishedAt: Date.now() });
      }, { once: true });
    } catch {}
  }
  return xhrSend.apply(this, args as any);
};
