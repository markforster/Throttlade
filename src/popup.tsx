import React from "react";
import { createRoot } from "react-dom/client";

const ENABLED_KEY = "enabled";

function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    chrome.storage.sync
      .get(ENABLED_KEY)
      .then(({ [ENABLED_KEY]: value }) => {
        if (!mounted) return;
        if (typeof value === "boolean") {
          setEnabled(value);
        } else {
          setEnabled(true);
        }
      });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync" && changes[ENABLED_KEY]) {
        const next = changes[ENABLED_KEY].newValue;
        if (typeof next === "boolean") {
          setEnabled(next);
        }
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    chrome.storage.sync.set({ [ENABLED_KEY]: next });
  };

  return { enabled, update };
}

function PopupShell() {
  const { enabled, update } = useGlobalEnabled();

  const onToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    update(event.target.checked);
  };

  const openDashboard = () => {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD_TAB" });
  };

  return (
    <div style={{ width: 260, padding: "12px 16px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Throttlr</h1>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        <span>Enable throttling</span>
      </label>

      <button type="button" onClick={openDashboard} style={{ width: "100%", padding: "8px 12px" }}>
        Open dashboard
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<PopupShell />);
