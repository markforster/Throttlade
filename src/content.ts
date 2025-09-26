import { Rule } from "./types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


let rules: Rule[] = [];
let enabled = true;

// load rules on script start + listen for updates
chrome.storage.sync.get(["rules", "enabled"], (data) => {
  rules = data.rules ?? [];
  enabled = typeof data.enabled === "boolean" ? data.enabled : true;
});
chrome.storage.onChanged.addListener((c) => {
  if (c.rules) rules = c.rules.newValue ?? [];
  if (c.enabled) enabled = typeof c.enabled.newValue === "boolean" ? c.enabled.newValue : true;
});

function matches(url: string, method: string) {
  if (!enabled) return undefined;
  return rules.find(r => {
    if (r.method && r.method.toUpperCase() !== method.toUpperCase()) return false;
    return r.isRegex
      ? new RegExp(r.pattern).test(url)
      : url.includes(r.pattern);
  });
}

// fetch patch
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!enabled) return originalFetch(input, init);
  const url = typeof input === "string" ? input : (input as Request).url;
  const method = (init?.method || (typeof input !== "string" && (input as Request).method) || "GET");
  const rule = matches(url, method);
  if (rule) await delay(rule.delayMs);
  return originalFetch(input, init);
};

// XHR patch
const xhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
  (this as any).__throttleRule = matches(url, method);
  return xhrOpen.call(this, method, url, ...rest);
};
const xhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = async function (...args: any[]) {
  const rule = enabled ? ((this as any).__throttleRule as Rule | undefined) : undefined;
  if (rule) await delay(rule.delayMs);
  return xhrSend.apply(this, args as any);
};
