import { ensureSchemaMigration } from "./storage";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSchemaMigration().catch(() => {});
  reinjectAll();
});
chrome.runtime.onStartup.addListener(async () => {
  await ensureSchemaMigration().catch(() => {});
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
  return undefined;
});

// Legacy popup behavior (kept for reference)
// chrome.action.onClicked.addListener(() => {
//   chrome.runtime.openOptionsPage();
// });
