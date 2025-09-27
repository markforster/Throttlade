import { ensureSchemaMigration, getEffectiveState, repairCurrentProjectId } from "../utils/storage";
import { bgLog } from "../utils/ports";

async function reinjectAll() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"],
      });
    } catch {
      // ignore non-permitted URLs
    }
  }
}

export async function initializeExtension(context: "install" | "startup") {
  await ensureSchemaMigration().catch(() => {});
  await repairCurrentProjectId().catch(() => {});
  try {
    const eff = await getEffectiveState();
    bgLog("info", `effective state (${context})`, eff, "bg");
  } catch {
    // swallow logging errors
  }
  await reinjectAll().catch(() => {});
}

export function registerLifecycleHandlers() {
  chrome.runtime.onInstalled.addListener(() => {
    initializeExtension("install").catch(() => {});
  });
  chrome.runtime.onStartup.addListener(() => {
    initializeExtension("startup").catch(() => {});
  });
}
