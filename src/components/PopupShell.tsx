import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Button, Form, Stack } from "react-bootstrap";
import { useGlobalEnabled } from "./../hooks/useGlobalEnabled";

const LOGO_SIZE = 28;

export function PopupShell() {
  const { enabled, update } = useGlobalEnabled();

  function onToggle(event: React.ChangeEvent<HTMLInputElement>) {
    update(event.target.checked);
  };

  function openDashboard() {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD_TAB" });
  };

  return (
    <Card className="shadow-sm" style={{ width: 280 }}>
      <Card.Body>
        <Stack gap={3}>
          <div>
            <Card.Title as="h1" className="h5 mb-0">
              <img
                src="icons/web-app-manifest-192x192.png"
                alt=""
                width={LOGO_SIZE}
                height={LOGO_SIZE}
                className="me-2"
                style={{ borderRadius: "0.25em", border: "solid 0.5px #0000" }}
              />
              Throttlade</Card.Title>
            <hr />
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
