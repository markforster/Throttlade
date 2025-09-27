import { ensureSchemaMigration, getEffectiveState, repairCurrentProjectId } from "./utils/storage";
import { throttleWithStream, type ThrottleContext } from "./utils/throttling";
import type { LogLevel, RequestEnd, RequestStart } from "./utils/logger";
import { bgLog, dashboardPorts, pushToDashboards } from "./utils/ports";
import { PortMessage } from "./types";
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

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSchemaMigration().catch(() => {});
  await repairCurrentProjectId().catch(() => {});
  try { const eff = await getEffectiveState(); bgLog("info", "effective state (install)", eff, "bg"); } catch {}
  reinjectAll();
});
chrome.runtime.onStartup.addListener(async () => {
  await ensureSchemaMigration().catch(() => {});
  await repairCurrentProjectId().catch(() => {});
  try { const eff = await getEffectiveState(); bgLog("info", "effective state (startup)", eff, "bg"); } catch {}
  reinjectAll();
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_DASHBOARD_TAB") {
    openDashboardTab().then(() => sendResponse(true)).catch(() => sendResponse(false));
    return true; // keep channel open for async response
  }
  if (message?.type === "LOGGER_LOG") {
    const { level, msg, data, context } = message as { level: LogLevel; msg: string; data?: any; context?: string };
    bgLog(level, msg, data, context);
    sendResponse(true);
    return true;
  }
  if (message?.type === "LOGGER_CLEAR") {
    setLogs([]);
    pushToDashboards({ type: "LOGS_UPDATED", entries: LOGS });
    sendResponse(true);
    return true;
  }
  if (message?.type === "LOGGER_GET") {
    sendResponse({ entries: LOGS });
    return true;
  }
  if (message?.type === "REQ_TRACK_START") {
    const start = message.payload as RequestStart;
    inflight.set(start.id, { ...start });
    bgLog("info", "Request throttled", { path: start.path, method: start.method, delayMs: start.throttleMs, url: start.url });
    broadcastReqs();
    sendResponse(true);
    return true;
  }
  if (message?.type === "REQ_TRACK_END") {
    const end = message.payload as RequestEnd;
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
  }
  if (message?.type === "REQS_GET") {
    sendResponse({ inflight: Array.from(inflight.values()), recent });
    return true;
  }
  if (message?.type === "THROTTLE_STREAM_PRIME" && message.ctx) {
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
  }
  return undefined;
});

// Legacy popup behavior (kept for reference)
// chrome.action.onClicked.addListener(() => {
//   chrome.runtime.openOptionsPage();
// });
