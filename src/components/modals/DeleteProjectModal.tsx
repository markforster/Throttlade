import React from "react";
import { Modal, Button } from "react-bootstrap";

type DeleteProjectModalProps = {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteProjectModal({ show, onCancel, onConfirm }: DeleteProjectModalProps) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to delete this project? This removes its rules.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}
