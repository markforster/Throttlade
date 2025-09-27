import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/bootstrap.css";
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
  Navbar,
  Form as BsForm,
  Modal,
  OverlayTrigger,
  Tooltip,
  Dropdown,
  Tabs,
  Tab,
  ProgressBar,
} from "react-bootstrap";

import type { Rule, Project, TrackedReq } from "./types";
import { Plus, Trash3, ExclamationTriangleFill, Power, QuestionCircle, FunnelFill, Asterisk, BracesAsterisk, CodeSlash, Pencil } from "react-bootstrap-icons";
import { methodVariant, methodIcon, matchModeBadgeClasses } from "./utils/rules-ui";
import type { LogEntry, LogLevel } from "./utils/logger";
import { useGlobalEnabled } from "./hooks/useGlobalEnabled";
import { safeStringify } from "./utils/safeStringify";
import { useProjectRules } from "./hooks/useProjectRules";
import { useCurrentProjectName } from "./hooks/useCurrentProjectName";
import { useProjectSelector } from "./hooks/useProjectSelector";

const LOGO_SIZE = 92;

function Dashboard() {
  const { rules, save, projectId } = useProjectRules();
  const { enabled, update } = useGlobalEnabled();
  const [isRegex, setIsRegex] = React.useState(false);

  useCurrentProjectName();

  const { projects, currentId, select } = useProjectSelector();

  const [showAdd, setShowAdd] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [showDelete, setShowDelete] = React.useState(false);
  // We'll add more methods later (OPTIONS, HEAD) later
  // const METHODS = React.useMemo(() => ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"], []);
  const METHODS = React.useMemo(() => ["GET", "POST", "PUT", "PATCH", "DELETE"], []);
  const [selectedMethods, setSelectedMethods] = React.useState<Set<string>>(new Set());

  const openAdd = () => { setNewProjectName(""); setShowAdd(true); };
  const closeAdd = () => setShowAdd(false);

  const saveNewProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const nextProject: Project = { id, name, enabled: true, rules: [] };
    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const merged = [nextProject, ...list];
    await chrome.storage.sync.set({ projects: merged, currentProjectId: id });
    setShowAdd(false);
  };

  const requestDeleteProject = () => setShowDelete(true);
  const closeDelete = () => setShowDelete(false);

  const confirmDeleteProject = async () => {
    if (!currentId) return;
    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const remaining = list.filter(p => p.id !== currentId);
    let nextList: Project[] = remaining;
    let nextCurrentId: string | undefined = remaining[0]?.id;
    if (remaining.length === 0)
    {
      const def: Project = { id: crypto.randomUUID(), name: "Default", enabled: true, rules: [] };
      nextList = [def];
      nextCurrentId = def.id;
    }
    await chrome.storage.sync.set({ projects: nextList, currentProjectId: nextCurrentId });
    setShowDelete(false);
  };

  // Toggle selected or specific project's enabled
  const setProjectEnabled = async (id: string, next: boolean) => {
    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const merged = list.map((p) => (p.id === id ? { ...p, enabled: next } : p));
    await chrome.storage.sync.set({ projects: merged });
  };

  // Custom project dropdown with inline toggle and per-item toggles
  function ProjectDropdown() {
    const current = projects.find(p => p.id === currentId);
    const displayName = current?.name || (projects[0]?.name ?? "(No projects)");
    const selectedEnabled = current?.enabled ?? true;
    const [open, setOpen] = React.useState(false);
    return (
      <Dropdown align="start" autoClose={false} show={open} onToggle={(isOpen) => setOpen(!!isOpen)}>
        <Dropdown.Toggle variant="outline-secondary" size="sm" aria-label="Select project" title="Select project">
          <span className="me-2">{displayName}</span>
          <BsForm.Check
            type="switch"
            id="selected-project-toggle"
            checked={selectedEnabled}
            onClick={(e: any) => e.stopPropagation()}
            onChange={(e: any) => { e.stopPropagation(); if (currentId) setProjectEnabled(currentId, e.target.checked); }}
            title="Toggle selected project"
            aria-label="Toggle selected project"
            className="d-inline align-middle"
          />
        </Dropdown.Toggle>
        <Dropdown.Menu style={{ minWidth: 280 }}>
          {projects.length === 0 ? (
            <Dropdown.ItemText className="text-muted">No projects</Dropdown.ItemText>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="d-flex align-items-center justify-content-between px-3 py-2">
                <Dropdown.Item
                  as="button"
                  className="p-0 text-start flex-grow-1 text-decoration-none"
                  onClick={() => { select(p.id); setOpen(false); }}
                  aria-label={`Select project ${p.name}`}
                >
                  {p.name || "(Unnamed)"}
                </Dropdown.Item>
                <BsForm.Check
                  type="switch"
                  id={`toggle-${p.id}`}
                  checked={!!p.enabled}
                  onClick={(e: any) => e.stopPropagation()}
                  onChange={(e: any) => { e.stopPropagation(); setProjectEnabled(p.id, e.target.checked); }}
                  title={`Toggle ${p.name || "project"}`}
                  aria-label={`Toggle ${p.name || "project"}`}
                />
              </div>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  const [editingRule, setEditingRule] = React.useState<Rule | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pattern = String(fd.get("pattern") ?? "").trim();
    const delayMs = Number(fd.get("delayMs") ?? 0);
    const methodRaw = String(fd.get("method") ?? "").toUpperCase();
    const method = methodRaw || undefined;
    const mode = String(fd.get("mode") ?? "pattern");
    const regexMode = mode === "regex";
    if (!pattern) return;

    if (editingRule)
    {
      const updated: Rule = {
        ...editingRule,
        pattern,
        isRegex: regexMode,
        delayMs: Math.max(0, Math.round(delayMs)),
        method,
      };
      const nextRules = rules.map((r) => (r.id === editingRule.id ? updated : r));
      save(nextRules);
    } else
    {
      const next: Rule = {
        id: crypto.randomUUID(),
        pattern,
        isRegex: regexMode,
        delayMs: Math.max(0, Math.round(delayMs)),
        method,
      };
      save([next, ...rules]);
    }
    e.currentTarget.reset();
    setIsRegex(false);
    setEditingRule(null);
    setShowAddRule(false);
  };

  const remove = (id: string) => save(rules.filter((r) => r.id !== id));
  const [pendingDelete, setPendingDelete] = React.useState<Rule | null>(null);

  const [showAddRule, setShowAddRule] = React.useState<boolean>(false);
  const openAddRule = () => { setEditingRule(null); setIsRegex(false); setShowAddRule(true); };
  const openEditRule = (r: Rule) => { setEditingRule(r); setIsRegex(Boolean(r.isRegex)); setShowAddRule(true); };
  const filteredRules = React.useMemo(() => {
    if (!selectedMethods || selectedMethods.size === 0) return rules;
    return rules.filter((r) => {
      const m = (r.method || 'GET').toUpperCase();
      return selectedMethods.has(m);
    });
  }, [rules, selectedMethods]);

  return (
    <>
      <Navbar bg="light" variant="light" className="border-bottom sticky-top">
        <Container className="d-flex align-items-center">
          <Navbar.Brand className="me-auto d-flex align-items-center">
            <img
              src="icons/web-app-manifest-192x192.png"
              alt=""
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              className="me-2"
              style={{ borderRadius: "0.25em", border: "solid 0.5px #0000" }}
            />
            Throttlade
          </Navbar.Brand>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              {/* <span className="text-muted">Global:</span> */}
              <Badge bg={enabled ? "success" : "secondary"}>
                <Power className="me-1" size={14} aria-hidden="true" />
                {enabled ? "Enabled" : "Disabled"}
              </Badge>
              <BsForm.Check
                type="switch"
                id="global-enabled-toggle"
                checked={enabled}
                onChange={(e) => update(e.target.checked)}
                title="Toggle global enable"
                aria-label="Toggle global enable"
              />
            </div>
          </div>
        </Container>
      </Navbar>

      {/* Sub-navbar: project context (single row: left selector/add, right status/toggle/delete) */}
      <div className="bg-light border-bottom subnav-sticky">
        <Container className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-primary" onClick={openAdd} title="Add project" aria-label="Add project">
              <Plus className="me-1" size={16} />
              Add project
            </Button>


          </div>

          <div className="d-flex align-items-center gap-2">
            <ProjectDropdown />
            <Button
              size="sm"
              variant="outline-danger"
              onClick={requestDeleteProject}
              disabled={!currentId || projects.length <= 1}
              title={projects.length <= 1 ? "Cannot delete the only project" : "Delete selected project"}
              aria-label="Delete selected project"
            >
              <Trash3 className="me-1" size={16} />
              {/* Delete project */}
            </Button>
          </div>
        </Container>
      </div>

      <Modal show={showAdd} onHide={closeAdd} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BsForm.Group controlId="new-project-name">
            <BsForm.Label>Name</BsForm.Label>
            <BsForm.Control
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Localhost, Staging, Prod"
              autoFocus
            />
          </BsForm.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
          <Button variant="primary" onClick={saveNewProject} disabled={!newProjectName.trim()}>Save</Button>
        </Modal.Footer>
      </Modal>

      {/* Add Rule Modal */}
      <Modal show={showAddRule} onHide={() => { setShowAddRule(false); setEditingRule(null); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingRule ? 'Edit rule' : 'Add rule'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={onSubmit}>
            <Row className="gy-3">
              <Col xs={12}>
                <Form.Group controlId="modal-rule-pattern">
                  <Form.Label>Pattern</Form.Label>
                  <Form.Control
                    name="pattern"
                    placeholder="/api/* or ^https://api\\.site\\.com"
                    required
                    defaultValue={editingRule?.pattern ?? ''}
                  />
                </Form.Group>
              </Col>

              <Col md={4} xs={12}>
                <Form.Group controlId="modal-rule-method">
                  <Form.Label>Method</Form.Label>
                  <Form.Select name="method" defaultValue={editingRule?.method ?? ''}>
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
                <Form.Group controlId="modal-rule-delay">
                  <Form.Label>Delay (ms)</Form.Label>
                  <Form.Control
                    name="delayMs"
                    type="number"
                    min={0}
                    step={50}
                    defaultValue={editingRule?.delayMs ?? 2000}
                  />
                </Form.Group>
              </Col>

              <Col md={4} xs={12}>
                <Form.Group controlId="modal-rule-mode">
                  <Form.Label>Match mode</Form.Label>
                  <Form.Select
                    name="mode"
                    defaultValue={editingRule?.isRegex ? 'regex' : 'pattern'}
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
                    <ExclamationTriangleFill className="me-1" size={14} aria-hidden="true" />
                    Regex mode: ensure the pattern is a valid JavaScript regular expression.
                  </Badge>
                </Col>
              ) : null}
            </Row>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" type="button" onClick={() => { setShowAddRule(false); setEditingRule(null); }}>Cancel</Button>
              <Button variant="primary" type="submit" title={editingRule ? 'Save rule' : 'Add rule'} aria-label={editingRule ? 'Save rule' : 'Add rule'}>
                <Plus className="me-1" size={16} />
                {editingRule ? 'Save rule' : 'Add rule'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDelete} onHide={closeDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this project? This removes its rules.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDelete}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteProject}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Confirm Delete Rule Modal */}
      <Modal show={!!pendingDelete} onHide={() => setPendingDelete(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete rule</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">Are you sure you want to delete this rule?</div>
          {pendingDelete && (
            <div className="small text-muted">
              <div><strong>Pattern:</strong> {pendingDelete.pattern}</div>
              <div><strong>Method:</strong> {pendingDelete.method || 'Any'}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (pendingDelete) remove(pendingDelete.id); setPendingDelete(null); }}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="py-4">
        <Stack gap={4}>

          <Tabs defaultActiveKey="rules" id="throttlr-tabs">
            <Tab eventKey="rules" title="Rules">
              <Card className="mt-3">
                <Card.Body>
                  <Stack gap={3}>
                    <div className="d-flex align-items-center justify-content-between">
                      <Card.Title className="h5 mb-0 d-flex align-items-center gap-2">
                        <OverlayTrigger
                          placement="right"
                          overlay={
                            <Tooltip id="rules-order-help">Rules are evaluated top-down. New rules appear first.</Tooltip>
                          }
                        >
                          <span role="img" aria-label="Rules ordering help" className="text-muted" style={{ cursor: 'help' }}>
                            <QuestionCircle size={16} />
                          </span>
                        </OverlayTrigger>
                        Current rules
                      </Card.Title>
                      <div className="d-flex align-items-center gap-2">
                        <Dropdown align="end" autoClose="outside">
                          <Dropdown.Toggle
                            variant={selectedMethods.size ? "primary" : "outline-secondary"}
                            size="sm"
                            aria-label="Filter by method"
                            title="Filter by method"
                          >
                            <FunnelFill size={16} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ minWidth: 240 }}>
                            <div className="px-3 py-2">
                              <div className="text-muted small mb-2">Filter by HTTP method</div>
                              {METHODS.map((m) => {
                                const id = `filter-${m}`;
                                const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                  const next = new Set(selectedMethods);
                                  if (e.target.checked) next.add(m); else next.delete(m);
                                  setSelectedMethods(next);
                                };
                                return (
                                  <div key={m} className="d-flex justify-content-between align-items-center w-100 mb-1" onClick={(e) => e.stopPropagation()}>
                                    <label htmlFor={id} className="form-check-label mb-0">{m}</label>
                                    <input
                                      id={id}
                                      type="checkbox"
                                      className="form-check-input ms-2"
                                      checked={selectedMethods.has(m)}
                                      onChange={handleChange}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                );
                              })}
                              <div className="d-flex justify-content-between gap-2 mt-2">
                                <Button size="sm" variant="outline-secondary" onClick={(e) => { e.stopPropagation(); setSelectedMethods(new Set()); }}>Clear</Button>
                                <Button size="sm" variant="outline-primary" onClick={(e) => { e.stopPropagation(); setSelectedMethods(new Set(METHODS)); }}>Select all</Button>
                              </div>
                            </div>
                          </Dropdown.Menu>
                        </Dropdown>
                        <Button variant="primary" size="sm" onClick={openAddRule} title="Add rule" aria-label="Add rule">
                          <Plus className="me-1" size={16} />
                          Add rule
                        </Button>
                      </div>
                    </div>

                    <Table striped bordered hover responsive size="sm" className="mb-0 rules-table">
                      <thead>
                        <tr>
                          <th scope="col" className="w-100">URL / Path</th>
                          <th scope="col" className="text-nowrap">Method</th>
                          <th scope="col" className="text-nowrap">Match Mode</th>
                          <th scope="col" className="text-end text-nowrap">Delay</th>
                          <th scope="col" className="text-end text-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRules.map((r) => (
                          <tr key={r.id}>
                            <td className="align-middle w-100"><span className="fw-semibold">{r.pattern}</span></td>
                            <td className="align-middle text-nowrap">
                              <Badge bg={methodVariant(r.method)}>
                                {methodIcon(r.method) ? (
                                  <span className="me-1" aria-hidden="true">{methodIcon(r.method)}</span>
                                ) : null}
                                {r.method || "Any"}
                              </Badge>
                            </td>
                            <td className="align-middle text-nowrap">
                              <Badge className={matchModeBadgeClasses(!!r.isRegex)}>
                                <span className="me-1" aria-hidden="true">
                                  {r.isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}
                                </span>
                                {r.isRegex ? "Regex" : "Wildcard"}
                              </Badge>
                            </td>
                            <td className="text-end align-middle text-nowrap">{r.delayMs} ms</td>
                            <td className="text-end align-middle text-nowrap">
                              <ButtonGroup size="sm">
                                <Button variant="outline-secondary" onClick={() => openEditRule(r)} title="Edit rule" aria-label="Edit rule">
                                  <Pencil className="me-1" size={16} />
                                  <span className="visually-hidden">Edit</span>
                                </Button>
                                <Button variant="outline-danger" onClick={() => setPendingDelete(r)} title="Delete rule" aria-label="Delete rule">
                                  <Trash3 className="me-1" size={16} />
                                  <span className="visually-hidden">Delete</span>
                                </Button>
                              </ButtonGroup>
                            </td>
                          </tr>
                        ))}
                        {rules.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">
                              No rules yet. Click "Add rule" to create one.
                            </td>
                          </tr>
                        )}
                        {rules.length > 0 && filteredRules.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">
                              No rules match the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Stack>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="requests" title="Requests">
              <RequestsTab />
            </Tab>

            <Tab eventKey="logs" title="Logs">
              <LogsTab />
            </Tab>
          </Tabs>
        </Stack>
      </Container>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Dashboard />);

function RequestsTab() {
  const [inflight, setInflight] = React.useState<TrackedReq[]>([]);
  const [recent, setRecent] = React.useState<TrackedReq[]>([]);
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: "throttlr-dashboard" });
    const onMessage = (msg: any) => {
      if (msg?.type === "REQS_UPDATED")
      {
        setInflight(Array.isArray(msg.inflight) ? msg.inflight : []);
        setRecent(Array.isArray(msg.recent) ? msg.recent : []);
      }
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({ type: "REQS_GET" });
    const iv = setInterval(() => setTick(v => (v + 1) & 1023), 100);
    return () => {
      try { port.onMessage.removeListener(onMessage); port.disconnect(); } catch { }
      clearInterval(iv);
    };
  }, []);

  const now = Date.now();

  const renderRow = (r: TrackedReq, done: boolean) => {
    const pct = done ? 100 : Math.max(0, Math.min(100, r.throttleMs > 0 ? ((now - r.startedAt) / r.throttleMs) * 100 : 0));
    const label = done ? "Done" : `${Math.min(100, Math.max(0, pct)).toFixed(0)}%`;
    return (
      <div key={r.id} className={`d-flex align-items-center justify-content-between py-2 ${done ? 'text-muted' : ''}`}>
        <div className="me-3 text-truncate" style={{ minWidth: 140 }}>
          <Badge bg={methodVariant(r.method)} className="me-2">{r.method}</Badge>
          <span title={r.url} className="text-truncate d-inline-block" style={{ maxWidth: 360 }}>{r.path || r.url}</span>
        </div>
        <div className="flex-grow-1">
          <ProgressBar now={pct} label={label} style={{ height: 18 }} variant={done ? 'success' : undefined} animated={!done} />
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-3">
      <Card.Body>
        <Card.Title as="h2" className="h6 mb-3">In-flight</Card.Title>
        {inflight.length === 0 ? (
          <div className="text-muted">No active requests</div>
        ) : inflight.map(r => renderRow(r, false))}

        <hr />
        <Card.Title as="h2" className="h6 mb-3">Recent (last 50)</Card.Title>
        {recent.length === 0 ? (
          <div className="text-muted">No recent requests</div>
        ) : recent.map(r => renderRow(r, true))}
      </Card.Body>
    </Card>
  );
}

// ---- Logs Tab ----
function LogsTab() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: "throttlr-dashboard" });
    const onMessage = (msg: any) => {
      if (msg?.type === "LOGS_UPDATED") setLogs(Array.isArray(msg.entries) ? msg.entries : []);
    };
    port.onMessage.addListener(onMessage);
    port.postMessage({ type: "LOGGER_GET" });
    return () => {
      try { port.onMessage.removeListener(onMessage); port.disconnect(); } catch { }
    };
  }, []);

  const levelVariant = (lvl: LogLevel) => {
    switch (lvl)
    {
      case 'debug': return 'secondary';
      case 'info': return 'primary';
      case 'warn': return 'warning';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const clear = () => {
    try { chrome.runtime.sendMessage({ type: "LOGGER_CLEAR" }); } catch { }
  };

  return (
    <Card className="mt-3">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <Card.Title as="h2" className="h6 mb-0">Logs (latest 100)</Card.Title>
          <Button size="sm" variant="outline-secondary" onClick={clear}>Clear</Button>
        </div>
        {logs.length === 0 ? (
          <div className="text-muted">No logs</div>
        ) : (
          <div className="small" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {logs.slice().reverse().map(l => (
              <div key={l.id} className="d-flex align-items-start gap-2 py-1 border-bottom">
                <Badge bg={levelVariant(l.level)}>{l.level}</Badge>
                <div className="text-muted" style={{ minWidth: 120 }}>
                  {new Date(l.ts).toLocaleTimeString()}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{l.msg}</div>
                  {l.data ? (
                    <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{safeStringify(l.data)}</pre>
                  ) : null}
                  {l.context ? (
                    <div className="text-muted">{l.context}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
