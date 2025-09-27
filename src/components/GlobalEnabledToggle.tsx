import "bootstrap/dist/css/bootstrap.min.css";
import "./../theme/bootstrap.css";
import "./../theme/styles.css";
import {
  Form as BsForm,
} from "react-bootstrap";
import { useGlobalEnabled } from "../hooks/useGlobalEnabled";

export function GlobaleEnabledToggle() {
  const { enabled, update } = useGlobalEnabled();

  return <BsForm.Check
    type="switch"
    id="global-enabled-toggle"
    checked={enabled}
    onChange={(e) => update(e.target.checked)}
    title="Toggle global enable"
    aria-label="Toggle global enable"
  />
}