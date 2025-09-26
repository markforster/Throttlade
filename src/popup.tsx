import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Button, Form, Stack } from "react-bootstrap";

const ENABLED_KEY = "enabled";

function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    chrome.storage.sync
      .get(ENABLED_KEY)
      .then(({ [ENABLED_KEY]: value }) => {
        if (!mounted) return;
        setEnabled(typeof value === "boolean" ? value : true);
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
