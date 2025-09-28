import React from "react";
import { Modal, Button, ListGroup, Badge, ButtonGroup } from "react-bootstrap";
import type { Rule } from "../../types/types";
import { methodVariant, methodIcon, matchModeBadgeClasses } from "../../utils/rules-ui";
import { ArrowUp, ArrowDown, Asterisk, BracesAsterisk, GripVertical } from "react-bootstrap-icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ManageOrderModalProps = {
  show: boolean;
  rules: Rule[];
  onClose: () => void;
  onSave: (next: Rule[]) => void;
};

function SortableRuleItem({
  rule,
  index,
  total,
  onMove,
}: {
  rule: Rule;
  index: number;
  total: number;
  onMove: (index: number, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1051 : undefined,
    cursor: "default",
  };

  return (
    <ListGroup.Item ref={setNodeRef} style={style} className="d-flex align-items-center justify-content-between gap-2">
      <div className="d-flex align-items-center gap-2 flex-wrap me-auto">
        <span className="fw-semibold text-truncate">{rule.pattern}</span>
      </div>
      <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
        <Badge bg={methodVariant(rule.method)}>
          {methodIcon(rule.method) ? <span className="me-1" aria-hidden>{methodIcon(rule.method)}</span> : null}
          {rule.method || "Any"}
        </Badge>
        <Badge className={matchModeBadgeClasses(!!rule.isRegex)}>
          <span className="me-1" aria-hidden>
            {rule.isRegex ? <BracesAsterisk size={14} /> : <Asterisk size={14} />}
          </span>
          {rule.isRegex ? "Regex" : "Wildcard"}
        </Badge>
        <Badge bg="secondary" title="Delay">{rule.delayMs} ms</Badge>
        <ButtonGroup size="sm" hidden={true}>
          <Button
            variant="outline-secondary"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move up"
            title="Move up"
          >
            <ArrowUp size={16} />
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Move down"
            title="Move down"
          >
            <ArrowDown size={16} />
          </Button>
        </ButtonGroup>
        <span
          {...attributes}
          {...listeners}
          role="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          style={{ cursor: "grab" }}
        >
          <GripVertical size={18} className="text-muted" />
        </span>
      </div>
    </ListGroup.Item>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setList((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id);
      const newIndex = prev.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = () => onSave(list);

  return (
    <Modal show={show} onHide={onClose} centered scrollable size="lg" dialogClassName="manage-order-modal">
      <Modal.Header closeButton>
        <Modal.Title>Manage rule order</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {list.length === 0 ? (
          <div className="text-muted text-center py-3">No rules to reorder.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={list.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ListGroup>
                {list.map((r, idx) => (
                  <SortableRuleItem
                    key={r.id}
                    rule={r}
                    index={idx}
                    total={list.length}
                    onMove={move}
                  />
                ))}
              </ListGroup>
            </SortableContext>
          </DndContext>
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
