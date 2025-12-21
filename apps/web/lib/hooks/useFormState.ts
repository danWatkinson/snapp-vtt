import { useState, useCallback } from "react";

/**
 * Hook to manage form state with convenient field setters.
 * Reduces boilerplate from repetitive `(value) => setForm(prev => ({ ...prev, field: value }))` patterns.
 * 
 * @example
 * const { form, setField, resetForm } = useFormState({ name: "", email: "" });
 * // Update a field: setField("name", "John")
 * // Reset form: resetForm()
 * // Reset to custom values: resetForm({ name: "", email: "" })
 */
export function useFormState<T extends Record<string, any>>(initialState: T) {
  const [form, setForm] = useState<T>(initialState);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    console.log('[useFormState] setField called:', {
      field: String(field),
      value,
      currentFormValue: form[field]
    });
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      console.log('[useFormState] setField updating form:', {
        field: String(field),
        prevValue: prev[field],
        newValue: value,
        updatedFormValue: updated[field]
      });
      return updated;
    });
  }, [form]);

  const resetForm = useCallback((newState?: Partial<T>) => {
    if (newState) {
      setForm((prev) => ({ ...prev, ...newState }));
    } else {
      setForm(initialState);
    }
  }, [initialState]);

  return {
    form,
    setForm,
    setField,
    resetForm
  };
}
