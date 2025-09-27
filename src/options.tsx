import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/bootstrap.css";
import "./styles.css";
import {
  Button,
  Badge,
  Col,
  Container,
  Form,
  Row,
  Stack,
  Navbar,
  Form as BsForm,
  Modal,
  Dropdown,
  Tabs,
  Tab,
} from "react-bootstrap";

import type { Rule, Project } from "./types";
import { Plus, Trash3, ExclamationTriangleFill } from "react-bootstrap-icons";
import { useProjectRules } from "./hooks/useProjectRules";
import { useCurrentProjectName } from "./hooks/useCurrentProjectName";
import { useProjectSelector } from "./hooks/useProjectSelector";
import Brand from "./components/Brand";
import GlobalEnabledBadge from "./components/GlobalEnabledBagde";
import { GlobaleEnabledToggle } from "./components/GlobalEnabledToggle";
import ProjectModal from "./components/ProjectModal";
import RulesTab from "./components/tabs/RulesTab";
import RequestsTab from "./components/tabs/RequestsTab";
import LogsTab from "./components/tabs/LogsTab";


function Dashboard() {
  const { rules, save, projectId } = useProjectRules();
  // const { enabled, update } = useGlobalEnabled();
  const [isRegex, setIsRegex] = React.useState(false);

  useCurrentProjectName();

  const { projects, currentId, select } = useProjectSelector();

  const [showAdd, setShowAdd] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [showDelete, setShowDelete] = React.useState(false);
  const openAdd = () => { setNewProjectName(""); setShowAdd(true); };
  const closeAdd = () => setShowAdd(false);



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
  return (
    <>
      <Navbar bg="light" variant="light" className="border-bottom sticky-top">
        <Container className="d-flex align-items-center">
          <Brand />
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <GlobalEnabledBadge />
              <GlobaleEnabledToggle />
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

      <ProjectModal showAdd={showAdd} closeAdd={closeAdd} />

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
              <RulesTab
                rules={rules}
                onAddRule={openAddRule}
                onEditRule={openEditRule}
                onRequestDelete={(rule) => setPendingDelete(rule)}
              />
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
