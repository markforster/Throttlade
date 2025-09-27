import React from "react";
import { Modal, Button } from "react-bootstrap";
import type { Rule } from "../../types";

type DeleteRuleModalProps = {
  show: boolean;
  rule: Rule | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteRuleModal({ show, rule, onCancel, onConfirm }: DeleteRuleModalProps) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete rule</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2">Are you sure you want to delete this rule?</div>
        {rule ? (
          <div className="small text-muted">
            <div><strong>Pattern:</strong> {rule.pattern}</div>
            <div><strong>Method:</strong> {rule.method || 'Any'}</div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}
