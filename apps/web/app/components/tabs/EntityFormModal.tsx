import Modal from "../ui/Modal";
import Form from "../ui/Form";
import FormField from "../ui/FormField";
import FormActions from "../ui/FormActions";
import EntityFormFields from "./EntityFormFields";
import { STYLED_INPUT_STYLE } from "../../styles/constants";
import type { WorldEntity } from "../../../lib/clients/worldClient";
import type { FormEvent } from "react";

type EntityType = "location" | "creature" | "faction" | "event";

interface EntityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  entities: WorldEntity[];
  // Form values
  name: string;
  summary: string;
  relationshipTargetId: string;
  relationshipType: string;
  locationId: string;
  beginningTimestamp: string;
  endingTimestamp: string;
  // Form setters
  onNameChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onRelationshipTargetChange: (value: string) => void;
  onRelationshipTypeChange: (value: string) => void;
  onLocationIdChange: (value: string) => void;
  onBeginningTimestampChange: (value: string) => void;
  onEndingTimestampChange: (value: string) => void;
  // Form submission
  onSubmit: (e: FormEvent) => void;
}

/**
 * Modal component for creating entities.
 * Handles different form fields based on entity type.
 */
export default function EntityFormModal({
  isOpen,
  onClose,
  entityType,
  entities,
  name,
  summary,
  relationshipTargetId,
  relationshipType,
  locationId,
  beginningTimestamp,
  endingTimestamp,
  onNameChange,
  onSummaryChange,
  onRelationshipTargetChange,
  onRelationshipTypeChange,
  onLocationIdChange,
  onBeginningTimestampChange,
  onEndingTimestampChange,
  onSubmit
}: EntityFormModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${entityType}`}
      variant="styled"
      aria-label={`Add ${entityType}`}
    >
      <Form onSubmit={onSubmit}>
        <FormField
          label={`${entityType} name`}
          value={name}
          onChange={onNameChange}
          inputClassName="capitalize"
          style={STYLED_INPUT_STYLE}
        />
        <FormField
          label="Summary"
          value={summary}
          onChange={onSummaryChange}
          type="textarea"
          rows={3}
          style={STYLED_INPUT_STYLE}
        />
        <EntityFormFields
          entityType={entityType}
          entities={entities}
          relationshipTargetId={relationshipTargetId}
          relationshipType={relationshipType}
          onRelationshipTargetChange={onRelationshipTargetChange}
          onRelationshipTypeChange={onRelationshipTypeChange}
          locationId={locationId}
          onLocationIdChange={onLocationIdChange}
          beginningTimestamp={beginningTimestamp}
          endingTimestamp={endingTimestamp}
          onBeginningTimestampChange={onBeginningTimestampChange}
          onEndingTimestampChange={onEndingTimestampChange}
        />
        <FormActions
          onCancel={onClose}
          submitLabel={`Save ${entityType}`}
          variant="styled"
        />
      </Form>
    </Modal>
  );
}
