import type { Rule } from "../types/types";
import { setEnabled, setRules } from "../utils/rules";

export function registerStateSync() {
  chrome.storage.sync.get(["rules", "enabled"], (data) => {
    setRules((data.rules as Rule[]) ?? []);
    setEnabled(typeof data.enabled === "boolean" ? data.enabled : true);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.rules) setRules((changes.rules.newValue as Rule[]) ?? []);
    if (changes.enabled) setEnabled(typeof changes.enabled.newValue === "boolean" ? changes.enabled.newValue : true);
  });

  window.addEventListener("message", (event: MessageEvent) => {
    const payload = event.data as any;
    if (!payload || !payload.__THROTTLR__ || payload.type !== "STATE") return;
    if (Array.isArray(payload.rules)) setRules(payload.rules as Rule[]);
    if (typeof payload.enabled === "boolean") setEnabled(payload.enabled as boolean);
  });
}
