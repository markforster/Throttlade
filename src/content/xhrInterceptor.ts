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
    // Ensure we satisfy TS typing for XHR.open: provide 'async' default
    const asyncFlag: boolean = (rest && rest.length > 0) ? Boolean(rest[0]) : true;
    const username: string | null | undefined = rest && rest.length > 1 ? (rest[1] as any) : null;
    const password: string | null | undefined = rest && rest.length > 2 ? (rest[2] as any) : null;
    const argsArr: [string, string | URL, boolean, (string | null)?, (string | null)?] = [
      method,
      url as any,
      asyncFlag,
      username as any,
      password as any,
    ];
    return originalOpen.apply(this as any, argsArr as any);
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
