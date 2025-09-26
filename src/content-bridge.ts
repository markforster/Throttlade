import { Rule } from "./types";
import { getEffectiveState } from "./storage";

console.log("[Throttlr][bridge] loaded");

function injectInpage() {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inpage.js");
  s.type = "text/javascript";
  (document.documentElement || document.head || document.body).appendChild(s);
  s.remove();
}

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
    console.log("[Throttlr][bridge] posting STATE", payload);
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
    console.log("[Throttlr][bridge] posting STATE (legacy fallback)", payload);
    window.postMessage(payload, "*");
  }
}

injectInpage();

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
  if (d.type === "THROTTLE_STREAM_PRIME" && d.ctx) {
    try {
      chrome.runtime.sendMessage({ type: "THROTTLE_STREAM_PRIME", ctx: d.ctx }, () => {
        // Ack back to the main world so it can proceed
        try {
          window.postMessage({ __THROTTLR__: true, type: "THROTTLE_STREAM_PRIME_ACK", id: d.id || null }, "*");
        } catch {}
      });
    } catch {
      // ignore if not available
    }
  }
});
