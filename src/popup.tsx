import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import { Card, Button, Form, Stack } from "react-bootstrap";

const ENABLED_KEY = "enabled"; // legacy/global toggle key used by older code
const GLOBAL_ENABLED_KEY = "globalEnabled"; // new schema key used by project model

function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    chrome.storage.sync
      .get([ENABLED_KEY, GLOBAL_ENABLED_KEY])
      .then(({ [ENABLED_KEY]: legacy, [GLOBAL_ENABLED_KEY]: global }) => {
        if (!mounted) return;
        // Prefer new schema key when present, otherwise fall back to legacy
        const val = (typeof global === "boolean") ? global : (typeof legacy === "boolean" ? legacy : true);
        setEnabled(val);
      });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync") {
        if (changes[GLOBAL_ENABLED_KEY]) {
          const next = changes[GLOBAL_ENABLED_KEY].newValue;
          if (typeof next === "boolean") setEnabled(next);
        } else if (changes[ENABLED_KEY]) {
          // If only legacy key changed, mirror it
          const next = changes[ENABLED_KEY].newValue;
          if (typeof next === "boolean") setEnabled(next);
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
    // Write both keys to keep old/new paths in sync
    chrome.storage.sync.set({ [ENABLED_KEY]: next, [GLOBAL_ENABLED_KEY]: next });
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
    <Card className="shadow-sm" style={{ width: 280 }}>
      <Card.Body>
        <Stack gap={3}>
          <div>
            <Card.Title as="h1" className="h5 mb-0">Throttlr</Card.Title>
            <Card.Subtitle className="text-muted">Control request throttling</Card.Subtitle>
          </div>

          <Form>
            <Form.Check
              type="switch"
              id="throttlr-enabled-toggle"
              label="Enable throttling"
              checked={enabled}
              onChange={onToggle}
            />
          </Form>

          <Button variant="primary" onClick={openDashboard}>
            Open dashboard
          </Button>
        </Stack>
      </Card.Body>
    </Card>
  );
}

createRoot(document.getElementById("root")!).render(<PopupShell />);
