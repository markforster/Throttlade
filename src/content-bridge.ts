import { Rule } from "./types/types";
import { getEffectiveState } from "./utils/storage";
import { Logger } from "./utils/logger";

Logger.info("[bridge] loaded");

// Note: inpage.js is declared in manifest as a MAIN world content_script.
// Avoid manual injection here to prevent chrome-extension://invalid requests under strict CSP.

async function computeAndSend() {
  try {
    const eff = await getEffectiveState();
    const payload = {
      __THROTTLR__: true,
      type: "STATE" as const,
      rules: eff.rules as Rule[],
      enabled: eff.effectiveEnabled,
      projectId: eff.projectId,
    };
    Logger.debug("[bridge] posting STATE", payload);
    window.postMessage(payload, "*");
  } catch (e) {
    // Fallback to legacy keys if helper fails for any reason
    const { rules, enabled } = await chrome.storage.sync.get(["rules", "enabled"]);
    const payload = {
      __THROTTLR__: true,
      type: "STATE" as const,
      rules: (rules ?? []) as Rule[],
      enabled: typeof enabled === "boolean" ? enabled : true,
      projectId: null as string | null,
    };
    Logger.debug("[bridge] posting STATE (legacy fallback)", payload);
    window.postMessage(payload, "*");
  }
}

// inpage is loaded by the manifest; nothing to inject here

// Initial push
computeAndSend();

// Recompute on any relevant storage change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (
    changes.rules ||
    changes.enabled ||
    changes.projects ||
    changes.currentProjectId ||
    changes.globalEnabled ||
    changes.schemaVersion
  ) {
    computeAndSend();
  }
});

// Forward main-world requests to prime STREAM throttling to the background SW
window.addEventListener("message", (ev: MessageEvent) => {
  const d = ev.data as any;
  if (!d || !d.__THROTTLR__) return;
  if (d.type === "LOG" && d.level && d.msg) {
    try {
      chrome.runtime.sendMessage({ type: "LOGGER_LOG", level: d.level, msg: d.msg, data: d.data, context: d.context || "main" }, () => {
        try { (chrome.runtime as any)?.lastError; } catch {}
      });
    } catch {}
    return;
  }
  if (d.type === "REQ_TRACK_START" && d.payload) {
    try {
      chrome.runtime.sendMessage({ type: "REQ_TRACK_START", payload: d.payload }, () => {
        try { (chrome.runtime as any)?.lastError; } catch {}
      });
    } catch {}
    return;
  }
  if (d.type === "REQ_TRACK_END" && d.payload) {
    try {
      chrome.runtime.sendMessage({ type: "REQ_TRACK_END", payload: d.payload }, () => {
        try { (chrome.runtime as any)?.lastError; } catch {}
      });
    } catch {}
    return;
  }
  if (d.type === "THROTTLE_STREAM_PRIME" && d.ctx) {
    try {
      chrome.runtime.sendMessage({ type: "THROTTLE_STREAM_PRIME", ctx: d.ctx }, () => {
        // Ack back to the main world regardless of response to avoid dangling warnings
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          (chrome.runtime as any)?.lastError; // access to clear "Unchecked runtime.lastError" noise
        } catch {}
        try {
          window.postMessage({ __THROTTLR__: true, type: "THROTTLE_STREAM_PRIME_ACK", id: d.id || null }, "*");
        } catch {}
      });
    } catch {
      // ignore if not available
    }
  }
});
