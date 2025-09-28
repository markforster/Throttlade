import React from "react";
import { Button, Form as BsForm, Modal } from "react-bootstrap";
import type { Project } from "../../types/types";

export default function ProjectModal({ showAdd, closeAdd }: { showAdd: boolean, closeAdd: () => void; }) {

  const [newProjectName, setNewProjectName] = React.useState("");
  const [existingNames, setExistingNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    let mounted = true;
    if (showAdd) {
      (async () => {
        try {
          const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
          const list = Array.isArray(existing) ? (existing as { name?: string }[]) : [];
          if (mounted) setExistingNames(list.map((p) => (p.name || "").trim()).filter(Boolean));
        } catch {
          if (mounted) setExistingNames([]);
        }
      })();
    } else {
      setNewProjectName("");
      setExistingNames([]);
    }
    return () => { mounted = false; };
  }, [showAdd]);

  const trimmed = newProjectName.trim();
  const lower = trimmed.toLowerCase();
  const existingLower = React.useMemo(() => new Set(existingNames.map((n) => n.toLowerCase())), [existingNames]);
  const isEmpty = trimmed.length === 0;
  const isDuplicate = trimmed.length > 0 && existingLower.has(lower);
  const isInvalid = isEmpty || isDuplicate;

  const saveNewProject = async () => {
    const name = trimmed;
    if (!name || isDuplicate) return;
    const id = crypto.randomUUID();
    const nextProject: Project = { id, name, enabled: true, rules: [] };
    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const merged = [nextProject, ...list];
    await chrome.storage.sync.set({ projects: merged, currentProjectId: id });
    // setShowAdd(false);
    closeAdd();
  };

  return <Modal show={showAdd} onHide={closeAdd} centered>
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
          isInvalid={isInvalid}
        />
        <BsForm.Control.Feedback type="invalid">
          {isEmpty ? "Please enter a project name." : isDuplicate ? "A project with this name already exists." : null}
        </BsForm.Control.Feedback>
      </BsForm.Group>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
      <Button variant="primary" onClick={saveNewProject} disabled={isInvalid}>Save</Button>
    </Modal.Footer>
  </Modal>
}
