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
