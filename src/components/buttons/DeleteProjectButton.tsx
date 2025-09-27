import { Button } from "react-bootstrap";
import { Trash3 } from "react-bootstrap-icons";
import { Project } from "../../types/types";

type DeleteProjectButtonProps = {
  requestDeleteProject: () => void;
  currentId: string;
  projects: Project[];
}
export default function DeleteProjectButton({
  requestDeleteProject, currentId, projects
}: DeleteProjectButtonProps) {
  return <Button
    size="sm"
    variant="outline-danger"
    onClick={requestDeleteProject}
    disabled={!currentId || projects.length <= 1}
    title={projects.length <= 1 ? "Cannot delete the only project" : "Delete selected project"}
    aria-label="Delete selected project"
  >
    <Trash3 className="me-1" size={16} />
  </Button>
}