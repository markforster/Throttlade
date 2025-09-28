import { Button } from "react-bootstrap";
import { Files } from "react-bootstrap-icons";

type CloneProjectButtonProps = {
  requestClone: () => void;
  disabled?: boolean;
};

export default function CloneProjectButton({ requestClone, disabled }: CloneProjectButtonProps) {
  return (
    <Button
      size="sm"
      variant="outline-primary"
      onClick={requestClone}
      disabled={!!disabled}
      title={disabled ? "No project selected" : "Clone selected project"}
      aria-label="Clone selected project"
    >
      <Files className="me-1" size={16} />
    </Button>
  );
}

