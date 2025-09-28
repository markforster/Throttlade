import React from "react";
import { Button, Form as BsForm, Modal } from "react-bootstrap";
import type { Project } from "../../types/types";

type EditProjectModalProps = {
  show: boolean;
  project: Project | null;
  projects: Project[];
  onClose: () => void;
};

export default function EditProjectModal({ show, project, projects, onClose }: EditProjectModalProps) {
  const [name, setName] = React.useState("");
  const [existingNames, setExistingNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (show && project) {
      setName(project.name || "");
      const others = projects
        .filter((p) => p.id !== project.id)
        .map((p) => (p.name || "").trim())
        .filter(Boolean);
      setExistingNames(others);
    } else {
      setName("");
      setExistingNames([]);
    }
  }, [show, project, projects]);

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const existingLower = React.useMemo(() => new Set(existingNames.map((n) => n.toLowerCase())), [existingNames]);
  const isEmpty = trimmed.length === 0;
  const isDuplicate = trimmed.length > 0 && existingLower.has(lower);
  const isInvalid = isEmpty || isDuplicate;

  const save = async () => {
    if (!project) return;
    if (isInvalid) return;

    const { projects: existing } = await chrome.storage.sync.get(["projects"] as any);
    const list: Project[] = Array.isArray(existing) ? (existing as Project[]) : [];
    const merged = list.map((p) => (p.id === project.id ? { ...p, name: trimmed } : p));
    await chrome.storage.sync.set({ projects: merged });
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <BsForm.Group controlId="edit-project-name">
          <BsForm.Label>Name</BsForm.Label>
          <BsForm.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
            isInvalid={isInvalid}
          />
          <BsForm.Control.Feedback type="invalid">
            {isEmpty ? "Please enter a project name." : isDuplicate ? "A project with this name already exists." : null}
          </BsForm.Control.Feedback>
        </BsForm.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={isInvalid || !project}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
