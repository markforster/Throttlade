import React from "react";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Dropdown,
  OverlayTrigger,
  Stack,
  Table,
  Tooltip,
} from "react-bootstrap";
import { Plus, FunnelFill, QuestionCircle, Pencil, Trash3, Asterisk, BracesAsterisk } from "react-bootstrap-icons";

import type { Rule } from "../../types";
import { methodVariant, methodIcon, matchModeBadgeClasses } from "../../utils/rules-ui";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type RulesTabProps = {
  rules: Rule[];
  onAddRule: () => void;
  onEditRule: (rule: Rule) => void;
  onRequestDelete: (rule: Rule) => void;
};

export default function RulesTab({ rules, onAddRule, onEditRule, onRequestDelete }: RulesTabProps) {
  const [selectedMethods, setSelectedMethods] = React.useState<Set<string>>(new Set());

  const filteredRules = React.useMemo(() => {
    if (selectedMethods.size === 0) return rules;
    return rules.filter((r) => {
      const method = (r.method || "GET").toUpperCase();
      return selectedMethods.has(method);
    });
  }, [rules, selectedMethods]);

  const toggleMethod = (method: string, nextChecked: boolean) => {
    setSelectedMethods((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(method); else next.delete(method);
      return next;
    });
  };

  const clearFilters = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setSelectedMethods(new Set());
  };

  const selectAll = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    setSelectedMethods(new Set(METHODS));
  };

  return (
    <Card className="mt-3">
      <Card.Body>
        <Stack gap={3}>
          <div className="d-flex align-items-center justify-content-between">
            <Card.Title className="h5 mb-0 d-flex align-items-center gap-2">
              <OverlayTrigger
                placement="right"
                overlay={
                  <Tooltip id="rules-order-help">Rules are evaluated top-down. New rules appear first.</Tooltip>
                }
              >
                <span role="img" aria-label="Rules ordering help" className="text-muted" style={{ cursor: 'help' }}>
                  <QuestionCircle size={16} />
                </span>
              </OverlayTrigger>
              Current rules
            </Card.Title>
            <div className="d-flex align-items-center gap-2">
              <Dropdown align="end" autoClose="outside">
                <Dropdown.Toggle
                  variant={selectedMethods.size ? "primary" : "outline-secondary"}
                  size="sm"
                  aria-label="Filter by method"
                  title="Filter by method"
                >
                  <FunnelFill size={16} />
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ minWidth: 240 }}>
                  <div className="px-3 py-2">
                    <div className="text-muted small mb-2">Filter by HTTP method</div>
                    {METHODS.map((method) => {
                      const id = `filter-${method}`;
                      return (
                        <div
                          key={method}
                          className="d-flex justify-content-between align-items-center w-100 mb-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label htmlFor={id} className="form-check-label mb-0">{method}</label>
                          <input
                            id={id}
                            type="checkbox"
                            className="form-check-input ms-2"
                            checked={selectedMethods.has(method)}
                            onChange={(e) => toggleMethod(method, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                    <div className="d-flex justify-content-between gap-2 mt-2">
                      <Button size="sm" variant="outline-secondary" onClick={clearFilters}>Clear</Button>
                      <Button size="sm" variant="outline-primary" onClick={selectAll}>Select all</Button>
                    </div>
                  </div>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="primary" size="sm" onClick={onAddRule} title="Add rule" aria-label="Add rule">
                <Plus className="me-1" size={16} />
                Add rule
              </Button>
            </div>
          </div>

          <Table striped bordered hover responsive size="sm" className="mb-0 rules-table">
            <thead>
              <tr>
                <th scope="col" className="w-100">URL / Path</th>
                <th scope="col" className="text-nowrap">Method</th>
                <th scope="col" className="text-nowrap">Match Mode</th>
                <th scope="col" className="text-end text-nowrap">Delay</th>
                <th scope="col" className="text-end text-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="align-middle w-100"><span className="fw-semibold">{rule.pattern}</span></td>
                  <td className="align-middle text-nowrap">
                    <Badge bg={methodVariant(rule.method)}>
                      {methodIcon(rule.method) ? (
                        <span className="me-1" aria-hidden="true">{methodIcon(rule.method)}</span>
                      ) : null}
                      {rule.method || "Any"}
                    </Badge>
                  </td>
                  <td className="align-middle text-nowrap">
                    <Badge className={matchModeBadgeClasses(!!rule.isRegex)}>
                      <span className="me-1" aria-hidden="true">
                        {rule.isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}
                      </span>
                      {rule.isRegex ? "Regex" : "Wildcard"}
                    </Badge>
                  </td>
                  <td className="text-end align-middle text-nowrap">{rule.delayMs} ms</td>
                  <td className="text-end align-middle text-nowrap">
                    <ButtonGroup size="sm">
                      <Button variant="outline-secondary" onClick={() => onEditRule(rule)} title="Edit rule" aria-label="Edit rule">
                        <Pencil className="me-1" size={16} />
                        <span className="visually-hidden">Edit</span>
                      </Button>
                      <Button variant="outline-danger" onClick={() => onRequestDelete(rule)} title="Delete rule" aria-label="Delete rule">
                        <Trash3 className="me-1" size={16} />
                        <span className="visually-hidden">Delete</span>
                      </Button>
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No rules yet. Click "Add rule" to create one.
                  </td>
                </tr>
              )}
              {rules.length > 0 && filteredRules.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No rules match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Stack>
      </Card.Body>
    </Card>
  );
}
