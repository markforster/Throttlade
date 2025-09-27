import type { Rule } from "../types/types";
import { enabled } from "../utils/rules";
import { matches } from "../utils/rules/matches";
import { createThrottleSession } from "./throttleHelpers";

export function patchFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!enabled) return originalFetch(input, init);

    const url = typeof input === "string" ? input : (input as Request).url;
    const method = init?.method || (typeof input !== "string" ? (input as Request).method : undefined) || "GET";
    const rule = matches(url, method) as Rule | undefined;

    if (!rule) return originalFetch(input, init);

    const session = await createThrottleSession(url, method, rule.delayMs);

    try
    {
      const response = await originalFetch(input, init);
      session.complete();
      return response;
    }
    catch (error)
    {
      session.complete(error);
      throw error;
    }
  };

  return () => {
    window.fetch = originalFetch;
  };
}
