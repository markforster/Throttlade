import React from "react";
import { Modal, Form, Row, Col, Button, Badge, Alert } from "react-bootstrap";
import { Plus, ExclamationTriangleFill } from "react-bootstrap-icons";

import type { Rule } from "../../types/types";
import { analyzeConflicts, type ConflictReport } from "../../utils/rules/analyze";

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
  rules: Rule[];
};

const createEmptyFormValues = (): RuleFormValues => ({
  pattern: "",
  method: undefined,
  delayMs: DEFAULT_DELAY,
  isRegex: false,
});

export default function AddRuleModal({ show, editingRule, onClose, onSubmit, rules }: AddRuleModalProps) {
  const [formValues, setFormValues] = React.useState<RuleFormValues>(createEmptyFormValues());
  const [previewUrl, setPreviewUrl] = React.useState<string>("");
  const [previewMethod, setPreviewMethod] = React.useState<string>("GET");

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

  const isPatternEmpty = !formValues.pattern.trim();
  const isRegexInvalid = React.useMemo(() => {
    if (!formValues.isRegex) return false;
    const pat = formValues.pattern;
    if (!pat.trim()) return false; // handled by required
    try {
      // eslint-disable-next-line no-new
      new RegExp(pat);
      return false;
    } catch {
      return true;
    }
  }, [formValues.isRegex, formValues.pattern]);
  const canSubmit = !isPatternEmpty && !isRegexInvalid;

  // Build a simulated list with the form values applied
  const simulatedList: Rule[] = React.useMemo(() => {
    const tempRule: Rule = {
      id: editingRule ? editingRule.id : "__NEW__",
      pattern: formValues.pattern.trim(),
      isRegex: formValues.isRegex,
      delayMs: Math.max(0, Math.round(formValues.delayMs || 0)),
      method: formValues.method,
    };
    if (editingRule) {
      return rules.map((r) => (r.id === editingRule.id ? tempRule : r));
    }
    // New rules appear first in current UX
    return [tempRule, ...rules];
  }, [rules, formValues, editingRule]);

  const conflictReport: ConflictReport | null = React.useMemo(() => {
    try {
      return analyzeConflicts(simulatedList);
    } catch {
      return null;
    }
  }, [simulatedList]);

  const activeRuleId = editingRule ? editingRule.id : "__NEW__";
  const conflict = conflictReport?.byRuleId[activeRuleId];
  const conflictLabel = conflict
    ? conflict.definiteBlockers.length > 0
      ? "Never matches"
      : conflict.possibleBlockers.length > 0
        ? "May not match"
        : null
    : null;
  const conflictReason = conflict && conflict.reasons[0] ? conflict.reasons[0].detail : null;

  const firstMatch = React.useMemo(() => {
    const url = previewUrl.trim();
    if (!url) return null;
    const m = (previewMethod || "GET").toUpperCase();
    const match = simulatedList.find((r) => {
      if (r.method && r.method.toUpperCase() !== m) return false;
      try {
        return r.isRegex
          ? new RegExp(r.pattern).test(url)
          : url.includes(r.pattern);
      } catch {
        return false;
      }
    });
    if (!match) return null;
    const index = simulatedList.findIndex((r) => r.id === match.id);
    return { index, rule: match };
  }, [previewUrl, previewMethod, simulatedList]);

  const handleChange =
    (field: keyof RuleFormValues) =>
      (
        event: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) => {
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
                isInvalid={isRegexInvalid}
              />
              {formValues.isRegex ? (
                <Form.Control.Feedback type="invalid">
                  Invalid regular expression. Please fix the pattern.
                </Form.Control.Feedback>
              ) : null}
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

            {conflictLabel ? (
              <Col xs={12}>
                <Alert variant={conflictLabel === "Never matches" ? "danger" : "warning"} className="py-2 mb-0">
                  <strong>{conflictLabel}.</strong>{" "}
                  {conflictReason ? <span>{conflictReason}</span> : null}
                </Alert>
              </Col>
            ) : null}

            <Col xs={12}>
              <div className="d-flex align-items-end gap-2 flex-wrap">
                <Form.Group className="flex-grow-1" controlId="preview-url">
                  <Form.Label className="mb-1">Preview URL</Form.Label>
                  <Form.Control
                    placeholder="https://example.com/api/users"
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                  />
                </Form.Group>
                <Form.Group style={{ minWidth: 140 }} controlId="preview-method">
                  <Form.Label className="mb-1">Method</Form.Label>
                  <Form.Select value={previewMethod} onChange={(e) => setPreviewMethod(e.target.value)}>
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </Form.Select>
                </Form.Group>
              </div>
              {previewUrl.trim() ? (
                <div className="small text-muted mt-1">
                  {firstMatch ? (
                    <>
                      Would match <strong>#{firstMatch.index + 1}</strong>: <strong>{firstMatch.rule.pattern}</strong>{" "}
                      <Badge bg={methodVariant(firstMatch.rule.method)} className="align-middle">
                        {firstMatch.rule.method || "Any"}
                      </Badge>
                    </>
                  ) : (
                    <span>No rule would match this request.</span>
                  )}
                </div>
              ) : null}
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" title={submitLabel} aria-label={submitLabel} disabled={!canSubmit}>
              <Plus className="me-1" size={16} />
              {submitLabel}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
