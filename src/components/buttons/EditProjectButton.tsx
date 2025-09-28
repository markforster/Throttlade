import { Button } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import type { Project } from "../../types/types";

type EditProjectButtonProps = {
  requestEditProject: () => void;
  project: Project | null;
};

export default function EditProjectButton({ requestEditProject, project }: EditProjectButtonProps) {
  const disabled = !project;
  return (
    <Button
      size="sm"
      variant="outline-secondary"
      onClick={requestEditProject}
      disabled={disabled}
      title={disabled ? "Select a project to edit" : "Edit selected project"}
      aria-label="Edit selected project"
    >
      <PencilSquare className="me-1" size={16} />
    </Button>
  );
}
