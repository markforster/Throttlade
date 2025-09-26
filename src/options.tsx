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
  Navbar,
  Form as BsForm,
  Modal,
  Accordion,
} from "react-bootstrap";

import type { Rule, Project } from "./types";
import { Plus, Trash3, ExclamationTriangleFill, Power } from "react-bootstrap-icons";

const ENABLED_KEY = "enabled";
const GLOBAL_ENABLED_KEY = "globalEnabled"; // new schema
const RULES_KEY = "rules"; // legacy compatibility

function useProjectRules() {
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [projectId, setProjectId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const { projects, currentProjectId } = await chrome.storage.sync.get([
      "projects",
      "currentProjectId",
    ] as any);
    const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
    const selected: Project | undefined =
      typeof currentProjectId === "string"
        ? list.find((p) => p && p.id === currentProjectId)
        : list[0];
    setProjectId(selected?.id ?? null);
    setRules(selected?.rules ?? []);
  }, []);

  React.useEffect(() => {
    refresh();
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "sync") return;
      if (changes.projects || changes.currentProjectId) refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  const save = async (next: Rule[]) => {
    const { projects, currentProjectId } = await chrome.storage.sync.get([
      "projects",
      "currentProjectId",
    ] as any);
    const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
    const currentId: string | undefined =
      typeof currentProjectId === "string" ? currentProjectId : list[0]?.id;
    if (!currentId) return;
    const merged = list.map((p) => (p.id === currentId ? { ...p, rules: next } : p));
    // Keep legacy `rules` in sync for backward compatibility (safe to remove later)
    await chrome.storage.sync.set({ projects: merged, [RULES_KEY]: next });
    setRules(next);
  };

  return { rules, save, projectId };
}

function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    chrome.storage.sync.get([ENABLED_KEY, GLOBAL_ENABLED_KEY]).then((obj) => {
      const legacy = obj[ENABLED_KEY];
      const global = obj[GLOBAL_ENABLED_KEY];
      setEnabled(typeof global === "boolean" ? global : (typeof legacy === "boolean" ? legacy : true));
    });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "sync") return;
      if (changes[GLOBAL_ENABLED_KEY])
      {
        const next = changes[GLOBAL_ENABLED_KEY].newValue;
        if (typeof next === "boolean") setEnabled(next);
      } else if (changes[ENABLED_KEY])
      {
        const next = changes[ENABLED_KEY].newValue;
        if (typeof next === "boolean") setEnabled(next);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    chrome.storage.sync.set({ [ENABLED_KEY]: next, [GLOBAL_ENABLED_KEY]: next });
  };

  return { enabled, update };
}

function Dashboard() {
  const { rules, save, projectId } = useProjectRules();
  const { enabled, update } = useGlobalEnabled();
  const [isRegex, setIsRegex] = React.useState(false);

  function useCurrentProjectName() {
    const [name, setName] = React.useState<string>("Default");
    React.useEffect(() => {
      const compute = async () => {
        const { projects, currentProjectId } = await chrome.storage.sync.get([
          "projects",
          "currentProjectId",
        ] as any);
        const list = Array.isArray(projects) ? projects as any[] : [];
        const current = typeof currentProjectId === "string"
          ? list.find(p => p && p.id === currentProjectId)
          : list[0];
        setName(current?.name || (list.length ? "(Unnamed project)" : "Default"));
      };
      compute();
      const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
        if (area !== "sync") return;
        if (changes.projects || changes.currentProjectId) compute();
      };
      chrome.storage.onChanged.addListener(onChanged);
      return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);
    return name;
  }

  const projectName = useCurrentProjectName();

  function useProjectSelector() {
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [currentId, setCurrentId] = React.useState<string>("");
    const [currentEnabled, setCurrentEnabled] = React.useState<boolean>(true);

    React.useEffect(() => {
      const read = async () => {
        const { projects, currentProjectId } = await chrome.storage.sync.get([
          "projects",
          "currentProjectId",
        ] as any);
        const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
        setProjects(list);
        const selected: Project | undefined =
          typeof currentProjectId === "string"
            ? list.find((p) => p && p.id === currentProjectId)
            : list[0];
        const id: string = selected?.id ?? "";
        setCurrentId(id);
        setCurrentEnabled(selected?.enabled ?? true);
      };
      read();
      const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
        if (area !== "sync") return;
        if (changes.projects || changes.currentProjectId) read();
      };
      chrome.storage.onChanged.addListener(onChanged);
      return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);

    const select = (id: string) => {
      setCurrentId(id);
      if (id) chrome.storage.sync.set({ currentProjectId: id });
    };

    React.useEffect(() => {
      const selected = projects.find((p) => p.id === currentId);
      setCurrentEnabled(selected?.enabled ?? true);
    }, [projects, currentId]);

    return { projects, currentId, currentEnabled, select };
  }

  const { projects, currentId, currentEnabled, select } = useProjectSelector();

  const [showAdd, setShowAdd] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [showDelete, setShowDelete] = React.useState(false);

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

  const [addOpen, setAddOpen] = React.useState<boolean>(false);
  React.useEffect(() => {
    setAddOpen(rules.length === 0);
  }, [projectId, rules.length]);

  return (
    <>
      <Navbar bg="light" variant="light" className="border-bottom sticky-top">
        <Container className="d-flex align-items-center">
          <Navbar.Brand className="me-auto">Throttlr</Navbar.Brand>
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
            {/* <span className="text-muted">Status:</span> */}
            {/* <Badge bg={currentEnabled ? "success" : "secondary"}>
              {currentEnabled ? "Enabled" : "Disabled"}
            </Badge> */}
            <BsForm.Check
              type="switch"
              id="project-enabled-toggle"
              checked={currentEnabled}
              onChange={async (e) => {
                const next = e.target.checked;
                if (!currentId) return;
                const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
                const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
                const merged = list.map((p) => (p.id === currentId ? { ...p, enabled: next } : p));
                await chrome.storage.sync.set({ projects: merged });
              }}
              title="Toggle project enable"
              aria-label="Toggle project enable"
              disabled={!currentId}
            />
            {/* <span className="text-muted">Project:</span> */}
            <BsForm.Select
              size="sm"
              className={`w-auto ${currentEnabled ? 'border-success' : 'border-secondary'}`}
              value={currentId}
              onChange={(e) => select(e.target.value)}
              disabled={projects.length === 0}
              title="Select project"
              aria-label="Select project"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map((p) => {
                  const prefix = p.enabled ? '🟢 ' : '🔴 ';
                  return (
                    <option key={p.id} value={p.id}>
                      {prefix}{p.name || "(Unnamed)"}
                    </option>
                  );
                })
              )}
            </BsForm.Select>

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

      <Container className="py-4">
        <Stack gap={4}>

          { /* Collapse by default unless the selected project has no rules. */}
          { /* Controlled so it reacts when switching projects. */}
          <Card>
            <Card.Body>
              <Stack gap={3}>
                <div>
                  <Card.Title className="h5 mb-0">Current rules</Card.Title>
                  <Card.Text className="text-muted mb-0">
                    Rules are evaluated top-down. New rules appear first.
                  </Card.Text>
                </div>

                <Accordion
                  activeKey={addOpen ? "add" : undefined}
                  onSelect={() => setAddOpen((v) => !v)}
                  alwaysOpen={false}
                >
                  <Accordion.Item eventKey="add">
                    <Accordion.Header>Add rule</Accordion.Header>
                    <Accordion.Body>
                      <Stack gap={3}>
                        <Card.Text className="text-muted mb-0">
                          Wildcard patterns use `*` (e.g. `/api/*`). Switch to regex for advanced matching.
                        </Card.Text>

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
                                  <ExclamationTriangleFill className="me-1" size={14} aria-hidden="true" />
                                  Regex mode: ensure the pattern is a valid JavaScript regular expression.
                                </Badge>
                              </Col>
                            ) : null}

                            <Col xs={12}>
                              <Button variant="primary" type="submit" title="Add rule" aria-label="Add rule">
                                <Plus className="me-1" size={16} />
                                Add rule
                              </Button>
                            </Col>
                          </Row>
                        </Form>
                      </Stack>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>

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
                            <Button variant="outline-danger" onClick={() => remove(r.id)} title="Delete rule" aria-label="Delete rule">
                              <Trash3 className="me-1" size={16} />
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
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Dashboard />);
