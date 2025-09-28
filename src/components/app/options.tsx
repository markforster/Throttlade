import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./../../theme/bootstrap.css";
import "./../../theme/styles.css";
import {
  Container,
  Stack,
  Tabs,
  Tab,
} from "react-bootstrap";

import type { Rule, Project } from "../../types/types";
import { useProjectRules } from "../../hooks/useProjectRules";
import { useCurrentProjectName } from "../../hooks/useCurrentProjectName";
import { useProjectSelector } from "../../hooks/useProjectSelector";
import RulesTab from "../tabs/RulesTab";
import RequestsTab from "../tabs/RequestsTab";
import LogsTab from "../tabs/LogsTab";
import ProjectModal from "../ProjectModal";
import AddRuleModal, { RuleFormValues } from "../modals/AddRuleModal";
import DeleteProjectModal from "../modals/DeleteProjectModal";
import DeleteRuleModal from "../modals/DeleteRuleModal";
import ManageOrderModal from "../modals/ManageOrderModal";
import NavBar from "../NavBar";
import ProjectDropdown from "../ProjectDropdown";
import AddProjectButton from "../buttons/AddProjectButton";
import DeleteProjectButton from "../buttons/DeleteProjectButton";
import CloneProjectButton from "../buttons/CloneProjectButton";
import CloneProjectModal from "../modals/CloneProjectModal";


function Dashboard() {
  const { rules, save, projectId } = useProjectRules();

  useCurrentProjectName();

  const { projects, currentId, select } = useProjectSelector();

  const [showAdd, setShowAdd] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [showClone, setShowClone] = React.useState(false);
  const openAdd = () => { setShowAdd(true); };
  const closeAdd = () => setShowAdd(false);

  const requestDeleteProject = () => setShowDelete(true);
  const closeDelete = () => setShowDelete(false);
  const requestCloneProject = () => setShowClone(true);
  const closeClone = () => setShowClone(false);

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

  const setProjectEnabled = async (id: string, next: boolean) => {
    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const merged = list.map((p) => (p.id === id ? { ...p, enabled: next } : p));
    await chrome.storage.sync.set({ projects: merged });
  };
  const [editingRule, setEditingRule] = React.useState<Rule | null>(null);

  const handleRuleSubmit = (values: RuleFormValues) => {
    const normalizedDelay = Math.max(0, Math.round(values.delayMs || 0));

    if (editingRule)
    {
      const updated: Rule = {
        ...editingRule,
        pattern: values.pattern,
        isRegex: values.isRegex,
        delayMs: normalizedDelay,
        method: values.method,
      };
      const nextRules = rules.map((r) => (r.id === editingRule.id ? updated : r));
      save(nextRules);
    } else
    {
      const next: Rule = {
        id: crypto.randomUUID(),
        pattern: values.pattern,
        isRegex: values.isRegex,
        delayMs: normalizedDelay,
        method: values.method,
      };
      save([next, ...rules]);
    }

    setEditingRule(null);
    setShowAddRule(false);
  };

  const remove = (id: string) => save(rules.filter((r) => r.id !== id));
  const [pendingDelete, setPendingDelete] = React.useState<Rule | null>(null);

  const [showAddRule, setShowAddRule] = React.useState<boolean>(false);
  const openAddRule = () => { setEditingRule(null); setShowAddRule(true); };
  const openEditRule = (r: Rule) => { setEditingRule(r); setShowAddRule(true); };
  const closeAddRule = () => { setShowAddRule(false); setEditingRule(null); };
  const closeDeleteRuleModal = () => setPendingDelete(null);
  const confirmDeleteRule = () => {
    if (pendingDelete) remove(pendingDelete.id);
    setPendingDelete(null);
  };

  // Manage order modal
  const [showManageOrder, setShowManageOrder] = React.useState<boolean>(false);
  const openManageOrder = () => setShowManageOrder(true);
  const closeManageOrder = () => setShowManageOrder(false);
  const saveOrder = (next: Rule[]) => { save(next); setShowManageOrder(false); };

  return (
    <>
      <NavBar />
      <div className="bg-light border-bottom subnav-sticky">
        <Container className="d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
          <AddProjectButton openAdd={openAdd} />

          <div className="d-flex align-items-center gap-2">
            <ProjectDropdown setProjectEnabled={setProjectEnabled} />
            <CloneProjectButton
              requestClone={requestCloneProject}
              disabled={!currentId}
            />
            <DeleteProjectButton
              requestDeleteProject={requestDeleteProject}
              currentId={currentId}
              projects={projects} />
          </div>
        </Container>
      </div>

      <ProjectModal showAdd={showAdd} closeAdd={closeAdd} />
      <CloneProjectModal
        show={showClone}
        source={projects.find((p) => p.id === currentId) || null}
        projects={projects}
        onClose={closeClone}
      />

      <AddRuleModal
        show={showAddRule}
        editingRule={editingRule}
        onClose={closeAddRule}
        onSubmit={handleRuleSubmit}
      />

      <DeleteProjectModal
        show={showDelete}
        onCancel={closeDelete}
        onConfirm={confirmDeleteProject}
      />

      <DeleteRuleModal
        show={!!pendingDelete}
        rule={pendingDelete}
        onCancel={closeDeleteRuleModal}
        onConfirm={confirmDeleteRule}
      />

      <ManageOrderModal
        show={showManageOrder}
        rules={rules}
        onClose={closeManageOrder}
        onSave={saveOrder}
      />

      <Container className="py-4">
        <Stack gap={4}>
          <Tabs defaultActiveKey="rules" id="throttlr-tabs">
            <Tab eventKey="rules" title="Rules">
              <RulesTab
                rules={rules}
                onAddRule={openAddRule}
                onEditRule={openEditRule}
                onRequestDelete={(rule) => setPendingDelete(rule)}
                onManageOrder={openManageOrder}
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
