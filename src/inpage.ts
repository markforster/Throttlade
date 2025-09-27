// --- src/inpage.ts ---

import { Rule } from "./types";
import { THROTTLE_STRATEGY } from "./utils/featureFlags";
import { throttleWithTimeout, type ThrottleContext } from "./utils/throttling";
import { normalizeLogData, type RequestStart, type RequestEnd } from "./utils/logger";

let rules: Rule[] = [];
let enabled = true;

function log(level: "debug" | "info" | "warn" | "error", msg: string, data?: any) {
  try {
    const payload = data === undefined ? undefined : normalizeLogData(data);
    window.postMessage({ __THROTTLR__: true, type: "LOG", level, msg, data: payload, context: "inpage" }, "*");
  } catch {}
}
log("info", "Throttlr inpage script loaded");

function postBridge(type: "REQ_TRACK_START" | "REQ_TRACK_END", payload: RequestStart | RequestEnd) {
  try {
    window.postMessage({ __THROTTLR__: true, type, payload }, "*");
  } catch {}
}

function pathOf(url: string): string {
  try { return new URL(url, document.baseURI).pathname || url; } catch { return url; }
}
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function matches(url: string, method: string) {
  if (!enabled) return undefined;
  const upper = (method || "GET").toUpperCase();
  let u: URL;
  try { u = new URL(url, document.baseURI); } catch { return undefined; }

  for (const r of rules) {
    // method filter
    if (r.method && r.method.toUpperCase() !== upper) continue;

    const p = (r.pattern || "").trim();
    if (!p) continue;

    try {
      // --- Regex mode ---
      if (r.isRegex) {
        if (new RegExp(p).test(url)) return r;
        continue;
      }

      // --- Wildcard mode ---
      const hasURLPattern = typeof (window as any).URLPattern === "function";

      // FULL URL pattern (starts with http/https)
      if (/^https?:\/\//i.test(p)) {
        if (hasURLPattern) {
          const ru = new URL(p);
          const pat = new (window as any).URLPattern({
            protocol: ru.protocol.replace(":", ""),     // "http" | "https"
            hostname: ru.hostname,                      // "localhost"
            port: ru.port || undefined,                 // "3001"
            pathname: ru.pathname || "/"                // "/api/v1/volumes"
          });
          if (pat.test(url)) return r;
        } else {
          // Fallback: compare origin+pathname (ignore query by default)
          const ru = new URL(p);
          if (u.origin === ru.origin && u.pathname.startsWith(ru.pathname)) return r;
        }
        continue;
      }

      // PATH-ONLY pattern (e.g., "/api/v1/volumes" or "/api/*")
      if (hasURLPattern) {
        const pat = new (window as any).URLPattern({ pathname: p });
        if (pat.test(url)) return r;
      } else {
        // simple glob fallback: support "*" by converting to a regex
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp("^" + p.split("*").map(esc).join(".*") + "$");
        if (re.test(u.pathname)) return r;
      }

      // Final fallback: treat pattern as a substring match
      if (url.includes(p)) return r;
    } catch {
      // ignore invalid patterns and keep checking other rules
    }
  }
  return undefined;
}

// --- fetch patch ---
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  log("debug", "Throttlr fetch called", { input, init });
  const req =
    typeof input === "string"
      ? new Request(input, init)
      : input instanceof Request
      ? input
      : new Request(String(input), init);

  const rule = matches(req.url, req.method || "GET");
  if (rule) {
    log("info", "Throttlr fetch intercepted", { url: req.url, method: req.method, delayMs: rule.delayMs });
    const id = Math.random().toString(36).slice(2);
    const startedAt = Date.now();
    postBridge("REQ_TRACK_START", {
      id,
      url: req.url,
      path: pathOf(req.url),
      method: (req.method || "GET").toUpperCase(),
      throttleMs: rule.delayMs,
      startedAt,
    });
    // Old timeout-based delay (commented out during strategy integration):
    // await delay(rule.delayMs);

    const ctx: ThrottleContext = { url: req.url, method: req.method || "GET", throttleMs: rule.delayMs };
    if (THROTTLE_STRATEGY === "TIMEOUT") {
      await throttleWithTimeout(ctx);
    } else {
      // Main world cannot use chrome.*; ask bridge to prime streaming and await ACK to reduce race.
      const id = Math.random().toString(36).slice(2);
      const ack = new Promise<void>((resolve) => {
        const onMsg = (ev: MessageEvent) => {
          const m = ev.data;
          if (m && m.__THROTTLR__ && m.type === "THROTTLE_STREAM_PRIME_ACK" && m.id === id) {
            window.removeEventListener("message", onMsg);
            resolve();
          }
        };
        window.addEventListener("message", onMsg);
        // Safety: resolve after small delay even if no ack to avoid blocking
        setTimeout(() => { window.removeEventListener("message", onMsg); resolve(); }, 100);
      });
      window.postMessage({ __THROTTLR__: true, type: "THROTTLE_STREAM_PRIME", id, ctx }, "*");
      await ack;
    }
    try {
      const res = await originalFetch(req);
      postBridge("REQ_TRACK_END", { id, finishedAt: Date.now() });
      return res;
    } catch (e: any) {
      postBridge("REQ_TRACK_END", { id, finishedAt: Date.now(), error: e?.message || String(e) });
      throw e;
    }
  }
  return originalFetch(req);
};


// --- XHR patch (re-check rules at send time) ---
const xhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
  log("debug", "Throttlr XMLHttpRequest intercepted", { method, url });
  log("debug", "Throttlr rules", rules);
  // Normalize to absolute URL and uppercase method so matching is consistent
  let absUrl = url;
  try {
    absUrl = new URL(url, document.baseURI).toString();
  } catch { /* keep as-is if URL constructor fails */ }

  (this as any).__throttlrCtx = {
    method: (method || "GET").toUpperCase(),
    url: absUrl,
  };

  return xhrOpen.apply(this, [method, url, ...rest]);
};

const xhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = async function (...args: any[]) {
  const ctx = (this as any).__throttlrCtx as { method: string; url: string } | undefined;
  log("debug", "Throttlr XMLHttpRequest send called", { args, ctx });

  // Re-evaluate the rule right before sending (more robust than caching in open)
  let rule: Rule | undefined;
  if (ctx) {
    rule = matches(ctx.url, ctx.method);
  }
  log("debug", "Throttlr XMLHttpRequest send rules?", { rules, ctx });
  log("info", "Throttlr XMLHttpRequest rule match", { rule, ctx });
  if (rule) {
    log("info", "Throttlr XHR delaying", { url: ctx!.url, method: ctx!.method, delayMs: rule.delayMs });
    // Old timeout-based delay (commented out during strategy integration):
    // await delay(rule.delayMs);

    const tctx: ThrottleContext = { url: ctx?.url || "", method: ctx?.method || "GET", throttleMs: rule.delayMs };
    const reqId = Math.random().toString(36).slice(2);
    const startedAt = Date.now();
    (this as any).__throttlrReqId = reqId;
    postBridge("REQ_TRACK_START", {
      id: reqId,
      url: tctx.url,
      path: pathOf(tctx.url),
      method: (tctx.method || "GET").toUpperCase(),
      throttleMs: rule.delayMs,
      startedAt,
    });
    const doneKey = "__throttlrFinished";
    try { delete (this as any)[doneKey]; } catch {}
    (this as any)[doneKey] = false;
    const finish = (err?: string) => {
      if ((this as any)[doneKey]) return;
      (this as any)[doneKey] = true;
      postBridge("REQ_TRACK_END", { id: reqId, finishedAt: Date.now(), ...(err ? { error: err } : {}) });
    };
    if (THROTTLE_STRATEGY === "TIMEOUT") {
      await throttleWithTimeout(tctx);
    } else {
      const id = Math.random().toString(36).slice(2);
      const ack = new Promise<void>((resolve) => {
        const onMsg = (ev: MessageEvent) => {
          const m = ev.data;
          if (m && m.__THROTTLR__ && m.type === "THROTTLE_STREAM_PRIME_ACK" && m.id === id) {
            window.removeEventListener("message", onMsg);
            resolve();
          }
        };
        window.addEventListener("message", onMsg);
        setTimeout(() => { window.removeEventListener("message", onMsg); resolve(); }, 100);
      });
      window.postMessage({ __THROTTLR__: true, type: "THROTTLE_STREAM_PRIME", id, ctx: tctx }, "*");
      await ack;
    }
    try {
      this.addEventListener("loadend", () => finish(), { once: true });
      this.addEventListener("error", () => finish("error"), { once: true });
      this.addEventListener("abort", () => finish("abort"), { once: true });
      this.addEventListener("timeout", () => finish("timeout"), { once: true });
    } catch {}
    try {
      return await xhrSend.apply(this, args as any);
    } catch (e: any) {
      finish(e?.message || "send error");
      throw e;
    }
  }

  return xhrSend.apply(this, args as any);
};


// Receive rules from the bridge
// window.addEventListener("message", (ev: MessageEvent) => {
//   const d = ev.data;
//   if (d && d.__THROTTLR__ && d.type === "RULES" && Array.isArray(d.rules)) {
//     rules = d.rules;
//   }
// });

window.addEventListener("message", (ev: MessageEvent) => {
  const d = ev.data;
  if (d && d.__THROTTLR__ && d.type === "STATE") {
    if (Array.isArray(d.rules)) {
      rules = d.rules;
      log("info", "[Throttlr][inpage] rules updated", rules);
    }
    if (typeof d.enabled === "boolean") {
      enabled = d.enabled;
      log("info", "[Throttlr][inpage] enabled updated", { enabled });
    }
  }
});
