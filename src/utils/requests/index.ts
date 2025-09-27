import { pushToDashboards } from "../ports";
import type { LogEntry, LogLevel, RequestEnd, RequestStart } from "../log/logger"

export type Tracked = RequestStart & { finishedAt?: number; error?: string };
export const REQ_RECENT_CAP = 50;
export const inflight = new Map<string, Tracked>();

export let recent: Tracked[] = [];
export function broadcastReqs() {
  try {
    pushToDashboards({
      type: "REQS_UPDATED",
      inflight: Array.from(inflight.values()),
      recent,
    });
  } catch {}
}

export function setRecent(set: Tracked[]) {
  recent = set;
}

export function reqStart(payload: RequestStart) {
  try { chrome.runtime.sendMessage({ type: "REQ_TRACK_START", payload }); } catch {}
}

export function reqEnd(payload: RequestEnd) {
  try { chrome.runtime.sendMessage({ type: "REQ_TRACK_END", payload }); } catch {}
}