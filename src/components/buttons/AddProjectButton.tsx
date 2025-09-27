import { Button } from "react-bootstrap";
import { Plus } from "react-bootstrap-icons";

type AddProjectButtonProps = {
  openAdd: () => void;
}
export default function AddProjectButton({ openAdd }: AddProjectButtonProps) {
  return <div className="d-flex align-items-center gap-2">
    <Button size="sm" variant="outline-primary" onClick={openAdd} title="Add project" aria-label="Add project">
      <Plus className="me-1" size={16} />
      Add project
    </Button>
  </div>
}