import React from "react";
import { Button, Form as BsForm, Modal } from "react-bootstrap";
import type { Project, Rule } from "../../types/types";

type CloneProjectModalProps = {
  show: boolean;
  source: Project | null;
  projects: Project[];
  onClose: () => void;
};

function uniqueCopyName(base: string, existing: string[]): string {
  const set = new Set(existing.map((n) => n.toLowerCase()));
  let name = `${base}_copy`;
  let i = 2;
  while (set.has(name.toLowerCase())) {
    name = `${base}_copy${i}`;
    i += 1;
  }
  return name;
}

export default function CloneProjectModal({ show, source, projects, onClose }: CloneProjectModalProps) {
  const [name, setName] = React.useState("");
  const [existingNames, setExistingNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (show && source) {
      const names = projects.map((p) => (p.name || "").trim()).filter(Boolean);
      setExistingNames(names);
      const suggested = uniqueCopyName(source.name || "Project", names);
      setName(suggested);
    } else {
      setName("");
      setExistingNames([]);
    }
  }, [show, source, projects]);

  const trimmed = name.trim();
  const isEmpty = trimmed.length === 0;
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const isInvalid = isEmpty || isDuplicate;

  const handleConfirm = async () => {
    if (!source) return;
    if (isInvalid) return;

    const newId = crypto.randomUUID();
    const clonedRules: Rule[] = (source.rules || []).map((r) => ({
      ...r,
      id: crypto.randomUUID(),
    }));
    const clone: Project = {
      id: newId,
      name: trimmed,
      enabled: source.enabled,
      rules: clonedRules,
    };

    // Insert after the source project
    const idx = projects.findIndex((p) => p.id === source.id);
    const nextProjects = projects.slice();
    const insertAt = idx >= 0 ? idx + 1 : 0;
    nextProjects.splice(insertAt, 0, clone);

    await chrome.storage.sync.set({ projects: nextProjects, currentProjectId: newId });
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Clone project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <BsForm.Group controlId="clone-project-name">
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
        <Button variant="primary" onClick={handleConfirm} disabled={isInvalid || !source}>Create copy</Button>
      </Modal.Footer>
    </Modal>
  );
}

