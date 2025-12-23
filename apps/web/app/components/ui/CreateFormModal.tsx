"use client";

import Modal from "./Modal";
import Form from "./Form";
import FormField from "./FormField";
import FormActions from "./FormActions";
import { STYLED_INPUT_STYLE } from "../../styles/constants";
import type { FormEvent, ReactNode } from "react";

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void;
  nameLabel: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  summaryLabel?: string;
  summaryValue?: string;
  onSummaryChange?: (value: string) => void;
  additionalFields?: ReactNode;
}

/**
 * Reusable modal for creating entities with name and optional summary fields.
 * Reduces duplication across campaign, session, story arc, etc. modals.
 */
export default function CreateFormModal({
  isOpen,
  onClose,
  title,
  submitLabel,
  onSubmit,
  nameLabel,
  nameValue,
  onNameChange,
  summaryLabel = "Summary",
  summaryValue,
  onSummaryChange,
  additionalFields
}: CreateFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant="styled">
      <Form onSubmit={onSubmit}>
        <FormField
          label={nameLabel}
          value={nameValue}
          onChange={onNameChange}
          style={STYLED_INPUT_STYLE}
        />
        {onSummaryChange && summaryValue !== undefined && (
          <FormField
            label={summaryLabel}
            value={summaryValue}
            onChange={onSummaryChange}
            type="textarea"
            rows={3}
            style={STYLED_INPUT_STYLE}
          />
        )}
        {additionalFields}
        <FormActions onCancel={onClose} submitLabel={submitLabel} variant="styled" />
      </Form>
    </Modal>
  );
}
