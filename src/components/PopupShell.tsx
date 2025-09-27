import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./../theme/bootstrap.css";
import "./../styles.css";
import { Card, Button, Form, Stack } from "react-bootstrap";
import { useGlobalEnabled } from "./../hooks/useGlobalEnabled";

export function PopupShell() {
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
            <Card.Title as="h1" className="h5 mb-0">Throttlade</Card.Title>
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
