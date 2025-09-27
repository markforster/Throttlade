import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/bootstrap.css";
import "./styles.css";
import {
  Form as BsForm,
  Dropdown,
} from "react-bootstrap";

import { useProjectSelector } from "./../hooks/useProjectSelector";


type ProjectDropdownProps = {
  setProjectEnabled: (id: string, next: boolean) => Promise<any>;
}

export default function ProjectDropdown({ setProjectEnabled }: ProjectDropdownProps) {
  const { projects, currentId, select } = useProjectSelector();

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