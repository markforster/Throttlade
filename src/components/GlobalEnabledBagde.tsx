import { Badge } from "react-bootstrap";
import { Power } from "react-bootstrap-icons";
import { useGlobalEnabled } from "../hooks/useGlobalEnabled";

export default function GlobalEnabledBadge() {
  const { enabled } = useGlobalEnabled();

  return <Badge bg={enabled ? "success" : "secondary"}>
    <Power className="me-1" size={14} aria-hidden="true" />
    {enabled ? "Enabled" : "Disabled"}
  </Badge>
}