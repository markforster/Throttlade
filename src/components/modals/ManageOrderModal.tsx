import React from "react";
import { Modal, Button, ListGroup, Badge, ButtonGroup } from "react-bootstrap";
import type { Rule } from "../../types/types";
import { methodVariant, methodIcon, matchModeBadgeClasses } from "../../utils/rules-ui";
import { ArrowUp, ArrowDown, Asterisk, BracesAsterisk } from "react-bootstrap-icons";

type ManageOrderModalProps = {
  show: boolean;
  rules: Rule[];
  onClose: () => void;
  onSave: (next: Rule[]) => void;
};

export default function ManageOrderModal({ show, rules, onClose, onSave }: ManageOrderModalProps) {
  const [list, setList] = React.useState<Rule[]>(rules);

  React.useEffect(() => {
    if (show) setList(rules);
  }, [show, rules]);

  const move = (index: number, delta: number) => {
    setList((prev) => {
      const next = prev.slice();
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const handleSave = () => onSave(list);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage rule order</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {list.length === 0 ? (
          <div className="text-muted text-center py-3">No rules to reorder.</div>
        ) : (
          <ListGroup>
            {list.map((r, idx) => (
              <ListGroup.Item key={r.id} className="d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-semibold">{r.pattern}</span>
                  <Badge bg={methodVariant(r.method)}>
                    {methodIcon(r.method) ? <span className="me-1" aria-hidden>{methodIcon(r.method)}</span> : null}
                    {r.method || "Any"}
                  </Badge>
                  <Badge className={matchModeBadgeClasses(!!r.isRegex)}>
                    <span className="me-1" aria-hidden>
                      {r.isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}
                    </span>
                    {r.isRegex ? "Regex" : "Wildcard"}
                  </Badge>
                  <Badge bg="secondary" title="Delay">{r.delayMs} ms</Badge>
                </div>
                <ButtonGroup size="sm">
                  <Button
                    variant="outline-secondary"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    title="Move up"
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => move(idx, 1)}
                    disabled={idx === list.length - 1}
                    aria-label="Move down"
                    title="Move down"
                  >
                    <ArrowDown size={16} />
                  </Button>
                </ButtonGroup>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        <div className="text-muted small mt-2">Top items have higher match priority.</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={list.length === 0}>Save order</Button>
      </Modal.Footer>
    </Modal>
  );
}

