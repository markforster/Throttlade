import { THROTTLE_STRATEGY } from "../utils/featureFlags";
import { pathOf } from "../utils/pathOf";
import { reqEnd, reqStart } from "../utils/requests";
import { throttleWithTimeout, type ThrottleContext } from "../utils/throttling";

export type ThrottleSession = {
  ctx: ThrottleContext;
  complete: (error?: unknown) => void;
};

export async function createThrottleSession(url: string, method: string, delayMs: number): Promise<ThrottleSession> {
  const normalizedMethod = (method || "GET").toUpperCase();
  const ctx: ThrottleContext = { url, method: normalizedMethod, throttleMs: delayMs };
  const id = Math.random().toString(36).slice(2);
  const startedAt = Date.now();

  reqStart({
    id,
    url,
    path: pathOf(url),
    method: normalizedMethod,
    throttleMs: delayMs,
    startedAt,
  });

  if (THROTTLE_STRATEGY === "TIMEOUT")
  {
    await throttleWithTimeout(ctx);
  } else
  {
    try {
      await chrome.runtime.sendMessage({ type: "THROTTLE_STREAM_PRIME", ctx });
    } catch
    {
      // If messaging fails, continue without stream throttling.
    }
  }

  const complete = (error?: unknown) => {
    const payload: { id: string; finishedAt: number; error?: string } = {
      id,
      finishedAt: Date.now(),
    };
    if (error)
    {
      payload.error = error instanceof Error ? error.message : String(error);
    }
    reqEnd(payload);
  };

  return { ctx, complete };
}
