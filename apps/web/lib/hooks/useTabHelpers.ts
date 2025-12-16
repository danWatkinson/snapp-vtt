import {
  createFormFieldSetters,
  createSelectionSetters,
  createModalHandlers,
  getFormValues
} from "../helpers/formHelpers";
import type { useFormState } from "../useFormState";
import type { useSelection } from "../useSelection";

interface FormConfig<T extends Record<string, any>> {
  form: ReturnType<typeof useFormState<T>>;
  fields: (keyof T)[];
  prefix: string; // e.g., "world", "entity" - used to prefix setter/value names
}

interface UseTabHelpersConfig {
  forms: Record<string, FormConfig<any>>;
  selections?: ("worldId" | "campaignId" | "storyArcId" | "sessionId" | "eventId")[];
  modals?: string[];
  setSelectionField: ReturnType<typeof useSelection>["setSelectionField"];
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  selectedIds?: Record<string, string | null>;
  modalsState?: Record<string, boolean>;
}

/**
 * Hook that consolidates common tab setup logic:
 * - Creates form field setters and values
 * - Creates selection setters
 * - Creates modal handlers
 * 
 * Returns an object with all helpers, using prefixed names to avoid conflicts.
 */
export function useTabHelpers(config: UseTabHelpersConfig) {
  const { forms, selections = [], modals = [], setSelectionField, openModal, closeModal, selectedIds = {}, modalsState = {} } = config;

  // Build form setters and values with prefixes
  const formSetters: Record<string, any> = {};
  const formValues: Record<string, any> = {};

  Object.entries(forms).forEach(([key, { form, fields, prefix }]) => {
    // Create setters for this form
    const setters = createFormFieldSetters(form, fields);
    
    // Prefix the setter names (e.g., "setName" -> "setWorldName")
    // Handle special case: if prefix ends with the field name, don't duplicate
    Object.entries(setters).forEach(([setterName, setterFn]) => {
      const fieldName = setterName.replace(/^set/, "");
      const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      const capitalizedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      
      // Check if prefix already contains the field name (e.g., "newUser" + "username" -> "newUsername")
      let prefixedSetterName: string;
      if (prefix.toLowerCase().endsWith(fieldName.toLowerCase())) {
        // Prefix already contains field, just capitalize prefix
        prefixedSetterName = `set${capitalizedPrefix}`;
      } else {
        prefixedSetterName = `set${capitalizedPrefix}${capitalizedField}`;
      }
      formSetters[prefixedSetterName] = setterFn;
    });

    // Get form values and prefix them
    const values = getFormValues(form);
    Object.entries(values).forEach(([fieldName, value]) => {
      const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      
      // Check if prefix already contains the field name
      let prefixedValueName: string;
      if (prefix.toLowerCase().endsWith(fieldName.toLowerCase())) {
        prefixedValueName = prefix;
      } else {
        prefixedValueName = `${prefix}${capitalizedField}`;
      }
      formValues[prefixedValueName] = value;
    });
  });

  // Create selection setters
  const selectionSetters = selections.length > 0
    ? createSelectionSetters(setSelectionField, selections)
    : {};

  // Create modal handlers
  const modalHandlers = modals.length > 0
    ? createModalHandlers(openModal, closeModal, modals)
    : {};

  // Extract selection states automatically
  const selectionStates: Record<string, string | null> = {};
  selections.forEach((selectionKey) => {
    const stateKey = `selected${selectionKey.charAt(0).toUpperCase() + selectionKey.slice(1).replace(/Id$/, "Id")}`;
    selectionStates[stateKey] = selectedIds[selectionKey] ?? null;
  });

  // Extract modal states automatically
  const modalStates: Record<string, boolean> = {};
  modals.forEach((modalKey) => {
    const stateKey = `${modalKey}ModalOpen`;
    modalStates[stateKey] = modalsState[modalKey] ?? false;
  });

  return {
    formSetters,
    formValues,
    selectionSetters,
    modalHandlers,
    selectionStates,
    modalStates
  };
}
