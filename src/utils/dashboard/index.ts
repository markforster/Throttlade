
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

// Legacy popup behavior (kept for reference)
// chrome.action.onClicked.addListener(() => {
//   chrome.runtime.openOptionsPage();
// });