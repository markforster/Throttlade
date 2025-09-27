import React from "react";
import { Modal, Form, Row, Col, Button, Badge } from "react-bootstrap";
import { Plus, ExclamationTriangleFill } from "react-bootstrap-icons";

import type { Rule } from "../../types";

const DEFAULT_DELAY = 2000;

export type RuleFormValues = {
  pattern: string;
  method?: string;
  delayMs: number;
  isRegex: boolean;
};

type AddRuleModalProps = {
  show: boolean;
  editingRule: Rule | null;
  onClose: () => void;
  onSubmit: (values: RuleFormValues) => void;
};

const createEmptyFormValues = (): RuleFormValues => ({
  pattern: "",
  method: undefined,
  delayMs: DEFAULT_DELAY,
  isRegex: false,
});

export default function AddRuleModal({ show, editingRule, onClose, onSubmit }: AddRuleModalProps) {
  const [formValues, setFormValues] = React.useState<RuleFormValues>(createEmptyFormValues());

  React.useEffect(() => {
    if (editingRule)
    {
      setFormValues({
        pattern: editingRule.pattern,
        method: editingRule.method ? editingRule.method.toUpperCase() : undefined,
        delayMs: editingRule.delayMs ?? DEFAULT_DELAY,
        isRegex: !!editingRule.isRegex,
      });
    } else if (show)
    {
      setFormValues(createEmptyFormValues());
    }
  }, [editingRule, show]);

  const handleChange = (field: keyof RuleFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = event.target;
    setFormValues((prev) => {
      if (field === "delayMs")
      {
        const parsed = Number(value);
        return { ...prev, delayMs: Number.isNaN(parsed) ? DEFAULT_DELAY : parsed };
      }
      if (field === "method")
      {
        const methodValue = value.trim();
        return { ...prev, method: methodValue ? methodValue.toUpperCase() : undefined };
      }
      if (field === "isRegex")
      {
        return { ...prev, isRegex: value === "regex" };
      }
      return { ...prev, [field]: value } as RuleFormValues;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pattern = formValues.pattern.trim();
    if (!pattern) return;

    onSubmit({
      pattern,
      method: formValues.method,
      delayMs: Math.max(0, Math.round(formValues.delayMs || 0)),
      isRegex: formValues.isRegex,
    });
    setFormValues(createEmptyFormValues());
  };

  const submitLabel = editingRule ? "Save rule" : "Add rule";
  const modalTitle = editingRule ? "Edit rule" : "Add rule";

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="gy-3">
            <Col xs={12}>
              <Form.Group controlId="modal-rule-pattern">
                <Form.Label>Pattern</Form.Label>
                <Form.Control
                  name="pattern"
                  placeholder="/api/* or ^https://api\\.site\\.com"
                  required
                  value={formValues.pattern}
                  onChange={handleChange("pattern")}
                />
              </Form.Group>
            </Col>

            <Col md={4} xs={12}>
              <Form.Group controlId="modal-rule-method">
                <Form.Label>Method</Form.Label>
                <Form.Select
                  name="method"
                  value={formValues.method ?? ""}
                  onChange={handleChange("method")}
                >
                  <option value="">Any</option>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4} xs={12}>
              <Form.Group controlId="modal-rule-delay">
                <Form.Label>Delay (ms)</Form.Label>
                <Form.Control
                  name="delayMs"
                  type="number"
                  min={0}
                  step={50}
                  value={Number.isFinite(formValues.delayMs) ? formValues.delayMs : DEFAULT_DELAY}
                  onChange={handleChange("delayMs")}
                />
              </Form.Group>
            </Col>

            <Col md={4} xs={12}>
              <Form.Group controlId="modal-rule-mode">
                <Form.Label>Match mode</Form.Label>
                <Form.Select
                  name="mode"
                  value={formValues.isRegex ? "regex" : "pattern"}
                  onChange={handleChange("isRegex")}
                >
                  <option value="pattern">Wildcard</option>
                  <option value="regex">Regex</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {formValues.isRegex ? (
              <Col xs={12}>
                <Badge bg="warning" text="dark">
                  <ExclamationTriangleFill className="me-1" size={14} aria-hidden="true" />
                  Regex mode: ensure the pattern is a valid JavaScript regular expression.
                </Badge>
              </Col>
            ) : null}
          </Row>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" title={submitLabel} aria-label={submitLabel}>
              <Plus className="me-1" size={16} />
              {submitLabel}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
