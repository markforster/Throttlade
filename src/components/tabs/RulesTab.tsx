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
  Form as BsForm,
  InputGroup,
} from "react-bootstrap";
import { Plus, FunnelFill, QuestionCircle, Pencil, Trash3, Asterisk, BracesAsterisk, XCircle, ExclamationOctagon, ExclamationTriangle } from "react-bootstrap-icons";

import type { Rule } from "../../types/types";
import { methodVariant, methodIcon, matchModeBadgeClasses } from "../../utils/rules-ui";
import { analyzeConflicts, type RuleConflict } from "../../utils/rules/analyze";
import { parseSearchTokens, matchesSearch } from "./RulesTab.search";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const METHOD_GROUP_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "ANY"] as const;
const MODE_GROUP_ORDER = ["WILDCARD", "REGEX"] as const;

type GroupBy = "none" | "method" | "mode";

type RulesTabProps = {
  rules: Rule[];
  onAddRule: () => void;
  onEditRule: (rule: Rule) => void;
  onRequestDelete: (rule: Rule) => void;
  onManageOrder: () => void;
  onReorderRules?: (next: Rule[]) => void;
};

type GroupSection = {
  key: string;
  label: string;
  badge: React.ReactNode;
  rules: Rule[];
};

export default function RulesTab({ rules, onAddRule, onEditRule, onRequestDelete, onManageOrder, onReorderRules }: RulesTabProps) {
  const [selectedMethods, setSelectedMethods] = React.useState<Set<string>>(new Set());
  const [searchText, setSearchText] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("none");

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchText), 150);
    return () => window.clearTimeout(handle);
  }, [searchText]);

  const parsedTokens = React.useMemo(() => parseSearchTokens(debouncedSearch), [debouncedSearch]);

  const indexLookup = React.useMemo(() => {
    const lookup = new Map<string, number>();
    rules.forEach((rule, idx) => lookup.set(rule.id, idx));
    return lookup;
  }, [rules]);

  const filteredRules = React.useMemo(() => {
    let list = rules;
    if (selectedMethods.size > 0)
    {
      list = list.filter((r) => {
        const method = (r.method || "GET").toUpperCase();
        return selectedMethods.has(method);
      });
    }
    if (parsedTokens.length === 0) return list;
    return list.filter((r) => matchesSearch(r, parsedTokens));
  }, [rules, selectedMethods, parsedTokens]);

  const report = React.useMemo(() => {
    try
    {
      return analyzeConflicts(rules);
    } catch
    {
      return null;
    }
  }, [rules]);

  const moveAboveBlocker = (rule: Rule, conflict: RuleConflict) => {
    if (!onReorderRules) return;
    const reason = conflict.reasons[0];
    if (!reason) return;
    const from = rules.findIndex((r) => r.id === rule.id);
    if (from === -1) return;
    const to = Math.max(0, Math.min(reason.blockerIndex, rules.length - 1));
    if (from === to) return;
    const next = rules.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorderRules(next);
  };
  const renderConflictBadge = (conflict?: RuleConflict, ruleId?: string, rule?: Rule) => {
    if (!conflict) return null;
    const hasDef = conflict.definiteBlockers.length > 0;
    const hasPos = !hasDef && conflict.possibleBlockers.length > 0;
    if (!hasDef && !hasPos) return null;
    const label = hasDef ? "Never matches" : "May not match";
    const variant = hasDef ? "danger" : "warning";
    const reason = conflict.reasons[0];
    const tip = reason ? `${label} — blocked by #${reason.blockerIndex + 1}. ${reason.detail}` : label;
    const overlay = (<Tooltip id={`tt-row-${ruleId}`}>{tip}</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={overlay} delay={{ show: 150, hide: 0 }}>
        <div className="d-inline-flex align-items-center gap-2">
          <Badge
            bg={variant}
            className="d-inline-flex align-items-center justify-content-center p-1 conflict-badge-icon"
            title={label}
            aria-label={label}
          >
            {hasDef ? <ExclamationOctagon size={14} className="conflict-icon-outline" /> : <ExclamationTriangle size={14} className="conflict-icon-outline" />}
          </Badge>
          {reason && onReorderRules ? (
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={(e) => { e.stopPropagation(); if (rule) moveAboveBlocker(rule, conflict); }}
            >
              Move above blocker
            </Button>
          ) : null}
        </div>
      </OverlayTrigger>
    );
  };

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

  const noRules = rules.length === 0;
  const noMatches = !noRules && filteredRules.length === 0;

  const tableHeader = (
    <thead>
      <tr>
        <th scope="col" className="text-nowrap col-index" aria-label="Order"></th>
        <th scope="col" className="text-nowrap col-method">Method</th>
        <th scope="col" className="w-100">URL / Path</th>
        <th scope="col" className="text-nowrap">Match Mode</th>
        <th scope="col" className="text-end text-nowrap">Delay (ms)</th>
        <th scope="col" className="text-nowrap text-end">Enabled</th>
        <th scope="col" className="text-end text-nowrap">Actions</th>
      </tr>
    </thead>
  );

  const renderRow = (rule: Rule) => {
    const originalIndex = (indexLookup.get(rule.id) ?? 0) + 1;
    const conflict = report ? report.byRuleId[rule.id] : undefined;
    return (
      <tr key={rule.id} className={rule.enabled === false ? "text-muted" : undefined}>
        <td className="text-nowrap col-index">
          <span className="fw-semibold">#{originalIndex}</span>
        </td>
        <td className="align-middle text-nowrap col-method">
          <Badge bg={methodVariant(rule.method)} className="method-badge text-uppercase" title={rule.method}>
            {methodIcon(rule.method) ? (
              <span className="me-1" aria-hidden="true">{methodIcon(rule.method)}</span>
            ) : null}
            {rule.method || "Any"}
          </Badge>
        </td>
        <td className="align-middle w-100">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold">{rule.pattern}</span>
            <span className="ms-auto">{rule.enabled === false ? null : renderConflictBadge(conflict, rule.id, rule)}</span>
          </div>
        </td>
        <td className="align-middle text-nowrap">
          <Badge className={matchModeBadgeClasses(!!rule.isRegex)}>
            <span className="me-1" aria-hidden="true">
              {rule.isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}
            </span>
            {rule.isRegex ? "Regex" : "Wildcard"}
          </Badge>
        </td>
        <td className="text-end align-middle text-nowrap">{rule.delayMs}</td>
        <td className="text-end align-middle text-nowrap">
          <BsForm.Check
            type="switch"
            id={`rule-enabled-${rule.id}`}
            checked={rule.enabled !== false}
            onChange={(e: any) => {
              if (!onReorderRules) return;
              const next = rules.map((r) => (r.id === rule.id ? { ...r, enabled: e.target.checked } : r));
              onReorderRules(next);
            }}
            title={rule.enabled === false ? "Enable rule" : "Disable rule"}
            aria-label={rule.enabled === false ? "Enable rule" : "Disable rule"}
          />
        </td>
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
    );
  };

  const groupedSections = React.useMemo<GroupSection[]>(() => {
    if (groupBy === "none") return [];
    const map = new Map<string, Rule[]>();
    const keyForRule = groupBy === "method"
      ? (rule: Rule) => (rule.method ? rule.method.toUpperCase() : "ANY")
      : (rule: Rule) => (rule.isRegex ? "REGEX" : "WILDCARD");

    filteredRules.forEach((rule) => {
      const key = keyForRule(rule);
      const bucket = map.get(key);
      if (bucket) bucket.push(rule);
      else map.set(key, [rule]);
    });

    console.log('>>>filteredRules', filteredRules);

    const baseOrder = groupBy === "method" ? Array.from(METHOD_GROUP_ORDER) : Array.from(MODE_GROUP_ORDER);
    const keys = Array.from(map.keys());
    const orderedKeys: string[] = [];
    baseOrder.forEach((key) => {
      if (map.has(key)) orderedKeys.push(key);
    });
    keys.sort();
    keys.forEach((key) => {
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    });

    return orderedKeys.map<GroupSection>((key) => {
      const rulesInGroup = (map.get(key) ?? []).slice();
      rulesInGroup.sort((a, b) => (indexLookup.get(a.id) ?? 0) - (indexLookup.get(b.id) ?? 0));

      if (groupBy === "method")
      {
        const methodKey = key === "ANY" ? undefined : key;
        const badge = (
          <Badge bg={methodVariant(methodKey)} className="method-badge text-uppercase">
            {methodIcon(methodKey) ? <span className="me-1" aria-hidden="true">{methodIcon(methodKey)}</span> : null}
            {methodKey || "Any"}
          </Badge>
        );
        return {
          key: `method-${key}`,
          label: methodKey || "Any",
          badge,
          rules: rulesInGroup,
        };
      }

      const isRegex = key === "REGEX";
      const badge = (
        <Badge className={matchModeBadgeClasses(isRegex)}>
          <span className="me-1" aria-hidden="true">{isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}</span>
          {isRegex ? "Regex" : "Wildcard"}
        </Badge>
      );
      return {
        key: `mode-${key}`,
        label: isRegex ? "Regex" : "Wildcard",
        badge,
        rules: rulesInGroup,
      };
    });
  }, [filteredRules, groupBy, indexLookup]);

  const renderEmptyRow = (message: string) => (
    <tr>
      <td colSpan={7} className="text-center text-muted py-4">{message}</td>
    </tr>
  );

  return (
    <Card className="mt-3">
      <Card.Body>
        <Stack gap={3}>
          <div className="d-flex align-items-center justify-content-between">
            <Card.Title className="h6 mb-0 d-flex align-items-center gap-2 flex-grow-1">
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
              <InputGroup size="sm" className="search-input-group">
                <BsForm.Control
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search rules (pattern, method, mode)"
                  aria-label="Search rules"
                />
                {searchText ? (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchText("")}
                    aria-label="Clear search"
                  >
                    <XCircle size={16} />
                  </Button>
                ) : null}
              </InputGroup>
              <span className="text-muted small">{filteredRules.length} of {rules.length}</span>
            </Card.Title>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={onManageOrder}
                title="Manage rule order"
                aria-label="Manage rule order"
              >
                Manage order
              </Button>
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
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="outline-secondary"
                  size="sm"
                  aria-label="Group rules"
                  title="Group rules"
                >
                  Group by
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item active={groupBy === "none"} onClick={() => setGroupBy("none")}>None</Dropdown.Item>
                  <Dropdown.Item active={groupBy === "method"} onClick={() => setGroupBy("method")}>Method</Dropdown.Item>
                  <Dropdown.Item active={groupBy === "mode"} onClick={() => setGroupBy("mode")}>Match mode</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="primary" size="sm" onClick={onAddRule} title="Add rule" aria-label="Add rule">
                <Plus className="me-1" size={16} />
                Add rule
              </Button>
            </div>
          </div>

          {groupBy === "none" ? (
            <Table striped bordered hover responsive size="sm" className="mb-0 rules-table">
              {tableHeader}
              <tbody>
                {noRules
                  ? renderEmptyRow("No rules yet. Click \"Add rule\" to create one.")
                  : noMatches
                    ? renderEmptyRow("No rules match the selected filters.")
                    : filteredRules.map(renderRow)}
              </tbody>
            </Table>
          ) : (
            <div>
              {noRules ? (
                <div className="text-center text-muted py-4">No rules yet. Click "Add rule" to create one.</div>
              ) : noMatches ? (
                <div className="text-center text-muted py-4">No rules match the selected filters.</div>
              ) : (
                groupedSections.map((section) => (
                  <div key={section.key} className="rules-group mb-4">
                    <div className="rules-group-header d-flex align-items-center justify-content-between gap-2">
                      <div className="d-flex align-items-center gap-2">
                        {section.badge}
                        <span className="fw-semibold">{section.label}</span>
                      </div>
                      <span className="text-muted small">{section.rules.length} {section.rules.length === 1 ? "rule" : "rules"}</span>
                    </div>
                    <Table striped bordered hover responsive size="sm" className="mb-0 rules-table">
                      {tableHeader}
                      <tbody>{section.rules.map(renderRow)}</tbody>
                    </Table>
                  </div>
                ))
              )}
            </div>
          )}
        </Stack>
      </Card.Body>
    </Card>
  );
}
