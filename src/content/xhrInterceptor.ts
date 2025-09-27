import type { Rule } from "../types/types";
import { enabled } from "../utils/rules";
import { matches } from "../utils/rules/matches";
import { createThrottleSession } from "./throttleHelpers";

export function patchXMLHttpRequest() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
    (this as any).__throttleRule = matches(url, method) as Rule | undefined;
    try
    {
      const abs = new URL(url, document.baseURI).toString();
      (this as any).__throttlrCtx = { method: (method || "GET").toUpperCase(), url: abs };
    }
    catch
    {
      (this as any).__throttlrCtx = { method: (method || "GET").toUpperCase(), url: String(url) };
    }
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = async function (...args: any[]) {
    const rule: Rule | undefined = enabled ? (this as any).__throttleRule : undefined;

    if (!rule) return originalSend.apply(this, args as any);

    const method = (this as any)?.__throttlrCtx?.method || (rule.method || "GET").toUpperCase();
    const currentUrl = (this as any)?.__throttlrCtx?.url || (this as any)?.responseURL || "";

    const session = await createThrottleSession(currentUrl, method, rule.delayMs);

    try
    {
      this.addEventListener("loadend", () => session.complete(), { once: true });
    }
    catch
    {
      session.complete();
    }

    try
    {
      return originalSend.apply(this, args as any);
    }
    catch (error)
    {
      session.complete(error);
      throw error;
    }
  };

  return () => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  };
}
