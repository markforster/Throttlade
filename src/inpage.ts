// --- src/inpage.ts ---

import { Rule } from "./types";

let rules: Rule[] = [];
let enabled = true;

console.log("Throttlr inpage script loaded");
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
  console.log("Throttlr fetch called", input, init);
  const req =
    typeof input === "string"
      ? new Request(input, init)
      : input instanceof Request
      ? input
      : new Request(String(input), init);

  const rule = matches(req.url, req.method || "GET");
  if (rule) {
    console.log("Throttlr fetch intercepted", req.url, { method: req.method, delayMs: rule.delayMs });
    await delay(rule.delayMs);
  }
  return originalFetch(req);
};


// --- XHR patch (re-check rules at send time) ---
const xhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
  console.log("Throttlr XMLHttpRequest intercepted", { method, url });
  console.log('Throttlr rules:', rules);
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
  console.log("Throttlr XMLHttpRequest send called", args, ctx);

  // Re-evaluate the rule right before sending (more robust than caching in open)
  let rule: Rule | undefined;
  if (ctx) {
    rule = matches(ctx.url, ctx.method);
  }
  console.log("Throttlr XMLHttpRequest send rules?", rules, ctx);
  console.log("Throttlr XMLHttpRequest send rule match?", rule, ctx);
  if (rule) {
    console.log("Throttlr XHR delaying", { url: ctx!.url, method: ctx!.method, delayMs: rule.delayMs });
    await delay(rule.delayMs);
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
      console.log("[Throttlr][inpage] rules updated", rules);
    }
    if (typeof d.enabled === "boolean") {
      enabled = d.enabled;
      console.log("[Throttlr][inpage] enabled updated", enabled);
    }
  }
});
