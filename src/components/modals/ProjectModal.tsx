import React from "react";
import { Button, Form as BsForm, Modal } from "react-bootstrap";
import type { Project } from "../../types/types";

export default function ProjectModal({ showAdd, closeAdd }: { showAdd: boolean, closeAdd: () => void; }) {

  const [newProjectName, setNewProjectName] = React.useState("");

  const saveNewProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
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
        />
      </BsForm.Group>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
      <Button variant="primary" onClick={saveNewProject} disabled={!newProjectName.trim()}>Save</Button>
    </Modal.Footer>
  </Modal>
}
