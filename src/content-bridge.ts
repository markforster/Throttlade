import { Rule } from "./types";

console.log("[Throttlr][bridge] loaded");

function injectInpage() {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("inpage.js");
  s.type = "text/javascript";
  (document.documentElement || document.head || document.body).appendChild(s);
  s.remove();
}

let currentRules: Rule[] = [];
let currentEnabled = true;

function sendState() {
  console.log("[Throttlr][bridge] posting STATE", { rules: currentRules, enabled: currentEnabled });
  window.postMessage({ __THROTTLR__: true, type: "STATE", rules: currentRules, enabled: currentEnabled }, "*");
}

injectInpage();

// Load once on start
chrome.storage.sync.get(["rules", "enabled"]).then(({ rules, enabled }) => {
  currentRules = rules ?? [];
  currentEnabled = typeof enabled === "boolean" ? enabled : true;
  sendState();
});

// Keep updated
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  let updated = false;
  if (changes.rules) {
    currentRules = changes.rules.newValue ?? [];
    updated = true;
  }
  if (changes.enabled) {
    currentEnabled = typeof changes.enabled.newValue === "boolean" ? changes.enabled.newValue : true;
    updated = true;
  }
  if (updated) sendState();
});
