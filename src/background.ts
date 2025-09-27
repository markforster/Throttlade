import { ensureSchemaMigration, getEffectiveState, repairCurrentProjectId } from "./utils/storage";
import { throttleWithStream, type ThrottleContext } from "./utils/throttling";
import type { LogLevel, RequestEnd, RequestStart } from "./utils/logger";
import { bgLog, dashboardPorts, pushToDashboards } from "./utils/ports";
import { PortMessage } from "./types/types";
import { broadcastReqs, inflight, recent, REQ_RECENT_CAP, setRecent, Tracked } from "./utils/requests";
import { LOGS, setLogs } from "./utils/log";


chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "throttlr-dashboard") return;
  dashboardPorts.add(port);
  port.postMessage({ type: "REQS_UPDATED", inflight: Array.from(inflight.values()), recent });
  port.postMessage({ type: "LOGS_UPDATED", entries: LOGS });
  port.onDisconnect.addListener(() => {
    dashboardPorts.delete(port);
  });
  port.onMessage.addListener((msg: PortMessage) => {
    if (!msg) return;
    if (msg.type === "LOGGER_CLEAR") {
      setLogs([]);
      pushToDashboards({ type: "LOGS_UPDATED", entries: LOGS });
    }
    if (msg.type === "REQS_GET") {
      port.postMessage({ type: "REQS_UPDATED", inflight: Array.from(inflight.values()), recent });
    }
    if (msg.type === "LOGGER_GET") {
      port.postMessage({ type: "LOGS_UPDATED", entries: LOGS });
    }
  });
});

async function initializeExtension(context: "install" | "startup") {
  await ensureSchemaMigration().catch(() => {});
  await repairCurrentProjectId().catch(() => {});
  try { const eff = await getEffectiveState(); bgLog("info", `effective state (${context})`, eff, "bg"); } catch {}
  await reinjectAll();
}

chrome.runtime.onInstalled.addListener(() => {
  initializeExtension("install").catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  initializeExtension("startup").catch(() => {});
});

async function reinjectAll() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"]
        });
      } catch { /* ignore non-permitted URLs */ }
    }
  }
}

async function openDashboardTab() {
  const targetUrl = chrome.runtime.getURL("options.html");
  const [existing] = await chrome.tabs.query({ url: targetUrl });
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url: targetUrl });
}

type RuntimeMessage = { type?: string; [key: string]: unknown };
type MessageHandler = (message: RuntimeMessage, sendResponse: (response?: any) => void) => boolean | void | Promise<boolean | void>;

export const messageHandlers: Record<string, MessageHandler> = {
  OPEN_DASHBOARD_TAB: (_message, sendResponse) =>
    openDashboardTab().then(() => sendResponse(true)).catch(() => sendResponse(false)),

  LOGGER_LOG: (message, sendResponse) => {
    const { level, msg, data, context } = message as { level: LogLevel; msg: string; data?: any; context?: string };
    bgLog(level, msg, data, context);
    sendResponse(true);
    return true;
  },

  LOGGER_CLEAR: (_message, sendResponse) => {
    setLogs([]);
    pushToDashboards({ type: "LOGS_UPDATED", entries: LOGS });
    sendResponse(true);
    return true;
  },

  LOGGER_GET: (_message, sendResponse) => {
    sendResponse({ entries: LOGS });
    return true;
  },

  REQ_TRACK_START: (message, sendResponse) => {
    const start = (message as { payload: RequestStart }).payload;
    inflight.set(start.id, { ...start });
    bgLog("info", "Request throttled", { path: start.path, method: start.method, delayMs: start.throttleMs, url: start.url });
    broadcastReqs();
    sendResponse(true);
    return true;
  },

  REQ_TRACK_END: (message, sendResponse) => {
    const end = (message as { payload: RequestEnd }).payload;
    const current = inflight.get(end.id);
    if (current) {
      inflight.delete(end.id);
      const done: Tracked = { ...current, finishedAt: end.finishedAt, error: end.error };
      recent.unshift(done);
      if (recent.length > REQ_RECENT_CAP) setRecent(recent.slice(0, REQ_RECENT_CAP));
      const duration = end.finishedAt && current.startedAt ? end.finishedAt - current.startedAt : undefined;
      bgLog(end.error ? "error" : "info", end.error ? "Request failed" : "Request completed", {
        path: current.path,
        method: current.method,
        delayMs: current.throttleMs,
        url: current.url,
        durationMs: duration,
        error: end.error,
      });
    }
    broadcastReqs();
    sendResponse(true);
    return true;
  },

  REQS_GET: (_message, sendResponse) => {
    sendResponse({ inflight: Array.from(inflight.values()), recent });
    return true;
  },

  THROTTLE_STREAM_PRIME: (message, sendResponse) => {
    if (!message.ctx) {
      sendResponse({ started: false });
      return true;
    }
    try {
      const ctx = message.ctx as ThrottleContext;
      // Start stream throttling asynchronously; respond immediately so callers can proceed.
      // Do not await here to avoid holding the message channel for the entire transfer.
      throttleWithStream(ctx).catch(() => {});
      sendResponse({ started: true });
    } catch {
      sendResponse({ started: false });
    }
    return true;
  },
};

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (!message?.type) return undefined;
  const handler = messageHandlers[message.type];
  if (!handler) return undefined;
  try {
    const result = handler(message, sendResponse);
    if (result instanceof Promise) {
      result.catch(() => {
        try { sendResponse(false); } catch { /* no-op */ }
      });
      return true;
    }
    return result === true;
  } catch {
    try { sendResponse(false); } catch { /* no-op */ }
    return false;
  }
});

// Legacy popup behavior (kept for reference)
// chrome.action.onClicked.addListener(() => {
//   chrome.runtime.openOptionsPage();
// });
