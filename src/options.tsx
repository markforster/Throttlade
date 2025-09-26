import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import {
  Button,
  ButtonGroup,
  Badge,
  Card,
  Col,
  Container,
  Form,
  Row,
  Stack,
  Table,
} from "react-bootstrap";

import type { Rule } from "./types";

const ENABLED_KEY = "enabled";
const RULES_KEY = "rules";

function useStorageRules() {
  const [rules, setRules] = React.useState<Rule[]>([]);

  React.useEffect(() => {
    chrome.storage.sync.get(RULES_KEY).then(({ [RULES_KEY]: stored }) => setRules(stored ?? []));

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync" && changes[RULES_KEY]) {
        setRules(changes[RULES_KEY].newValue ?? []);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const save = (next: Rule[]) => chrome.storage.sync.set({ [RULES_KEY]: next });

  return { rules, save };
}

function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    chrome.storage.sync.get(ENABLED_KEY).then(({ [ENABLED_KEY]: value }) => {
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
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    chrome.storage.sync.set({ [ENABLED_KEY]: next });
  };

  return { enabled, update };
}

function Dashboard() {
  const { rules, save } = useStorageRules();
  const { enabled, update } = useGlobalEnabled();
  const [isRegex, setIsRegex] = React.useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pattern = String(fd.get("pattern") ?? "").trim();
    const delayMs = Number(fd.get("delayMs") ?? 0);
    const method = String(fd.get("method") ?? "").toUpperCase() || undefined;
    const mode = String(fd.get("mode") ?? "pattern");
    const regexMode = mode === "regex";
    if (!pattern) return;

    const next: Rule = {
      id: crypto.randomUUID(),
      pattern,
      isRegex: regexMode,
      delayMs: Math.max(0, Math.round(delayMs)),
      method,
    };
    save([next, ...rules]);
    e.currentTarget.reset();
    setIsRegex(false);
  };

  const remove = (id: string) => save(rules.filter((r) => r.id !== id));

  return (
    <Container className="py-4">
      <Stack gap={4}>
        <Card>
          <Card.Body>
            <Stack gap={3}>
              <div>
                <Card.Title as="h1" className="h4 mb-1">Throttlr rules</Card.Title>
                <Card.Subtitle className="text-muted">
                  Create and manage artificial latency for matching endpoints.
                </Card.Subtitle>
              </div>

              <Form.Check
                type="switch"
                id="dashboard-enabled-toggle"
                label="Enable throttling globally"
                checked={enabled}
                onChange={(event) => update(event.target.checked)}
              />
            </Stack>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Stack gap={3}>
              <div>
                <Card.Title className="h5 mb-1">Add rule</Card.Title>
                <Card.Text className="text-muted mb-0">
                  Wildcard patterns use `*` (e.g. `/api/*`). Switch to regex for advanced matching.
                </Card.Text>
              </div>

              <Form onSubmit={onSubmit}>
                <Row className="gy-3">
                  <Col xs={12}>
                    <Form.Group controlId="rule-pattern">
                      <Form.Label>Pattern</Form.Label>
                      <Form.Control
                        name="pattern"
                        placeholder="/api/* or ^https://api\\.site\\.com"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4} xs={12}>
                    <Form.Group controlId="rule-method">
                      <Form.Label>Method</Form.Label>
                      <Form.Select name="method" defaultValue="">
                        <option value="">Any</option>
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>PATCH</option>
                        <option>DELETE</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} xs={12}>
                    <Form.Group controlId="rule-delay">
                      <Form.Label>Delay (ms)</Form.Label>
                      <Form.Control
                        name="delayMs"
                        type="number"
                        min={0}
                        step={50}
                        defaultValue={2000}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4} xs={12}>
                    <Form.Group controlId="rule-mode">
                      <Form.Label>Match mode</Form.Label>
                      <Form.Select
                        name="mode"
                        defaultValue="pattern"
                        onChange={(event) => setIsRegex(event.target.value === "regex")}
                      >
                        <option value="pattern">Wildcard</option>
                        <option value="regex">Regex</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {isRegex ? (
                    <Col xs={12}>
                      <Badge bg="warning" text="dark">
                        Regex mode: ensure the pattern is a valid JavaScript regular expression.
                      </Badge>
                    </Col>
                  ) : null}

                  <Col xs={12}>
                    <Button variant="primary" type="submit">
                      Add rule
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Stack>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Stack gap={3}>
              <div>
                <Card.Title className="h5 mb-0">Current rules</Card.Title>
                <Card.Text className="text-muted mb-0">
                  Rules are evaluated top-down. New rules appear first.
                </Card.Text>
              </div>

              <Table striped bordered hover responsive size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col" className="text-end">Delay</th>
                    <th scope="col" className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Stack gap={1}>
                          <span className="fw-semibold">{r.pattern}</span>
                          <div className="text-muted small">
                            {r.method ? <Badge bg="secondary" className="me-1">{r.method}</Badge> : null}
                            <Badge bg={r.isRegex ? "info" : "success"}>{r.isRegex ? "Regex" : "Wildcard"}</Badge>
                          </div>
                        </Stack>
                      </td>
                      <td className="text-end align-middle">{r.delayMs} ms</td>
                      <td className="text-end align-middle">
                        <ButtonGroup size="sm">
                          <Button variant="outline-danger" onClick={() => remove(r.id)}>
                            Delete
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted py-4">
                        No rules yet. Add your first rule above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Stack>
          </Card.Body>
        </Card>
      </Stack>
    </Container>
  );
}

createRoot(document.getElementById("root")!).render(<Dashboard />);
