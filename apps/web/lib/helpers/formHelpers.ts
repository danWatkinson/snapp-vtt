import type { ReturnType } from "../useFormState";

/**
 * Creates a setter function for a form field
 */
export function createFormFieldSetter<T extends Record<string, any>>(
  form: ReturnType<T>,
  fieldName: keyof T
) {
  return (value: T[keyof T]) => form.setField(fieldName, value);
}

/**
 * Creates multiple form field setters at once
 */
export function createFormFieldSetters<T extends Record<string, any>>(
  form: ReturnType<T>,
  fields: (keyof T)[]
) {
  const setters: Record<string, (value: any) => void> = {};
  fields.forEach((field) => {
    setters[`set${String(field).charAt(0).toUpperCase() + String(field).slice(1)}`] = createFormFieldSetter(form, field);
  });
  return setters as Record<string, (value: any) => void>;
}

/**
 * Creates a setter function for a selection field
 */
export function createSelectionSetter(
  setSelectionField: <K extends "worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId">(
    field: K,
    value: any
  ) => void,
  fieldName: "worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId"
) {
  return (value: string | null) => setSelectionField(fieldName, value);
}

/**
 * Creates multiple selection setters at once
 */
export function createSelectionSetters(
  setSelectionField: <K extends "worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId">(
    field: K,
    value: any
  ) => void,
  fields: ("worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId")[]
) {
  const setters: Record<string, (value: string | null) => void> = {};
  fields.forEach((field) => {
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/Id$/, "Id");
    setters[`setSelected${fieldName}`] = createSelectionSetter(setSelectionField, field);
  });
  return setters as Record<string, (value: string | null) => void>;
}

/**
 * Creates a modal open/close handler
 */
export function createModalHandler(
  openModal: (key: string) => void,
  closeModal: (key: string) => void,
  modalKey: string
) {
  return (open: boolean) => {
    if (open) {
      openModal(modalKey);
    } else {
      closeModal(modalKey);
    }
  };
}

/**
 * Creates multiple modal handlers at once
 */
export function createModalHandlers(
  openModal: (key: string) => void,
  closeModal: (key: string) => void,
  keys: string[]
) {
  const handlers: Record<string, (open: boolean) => void> = {};
  keys.forEach((key) => {
    const handlerName = `set${key.charAt(0).toUpperCase() + key.slice(1)}ModalOpen`;
    handlers[handlerName] = createModalHandler(openModal, closeModal, key);
  });
  return handlers as Record<string, (open: boolean) => void>;
}

/**
 * Gets a form field value
 */
export function getFormField<T extends Record<string, any>>(
  form: ReturnType<T>,
  fieldName: keyof T
): T[keyof T] {
  return form.form[fieldName];
}

/**
 * Gets all form field values as an object
 */
export function getFormValues<T extends Record<string, any>>(
  form: ReturnType<T>
): T {
  return form.form;
}
