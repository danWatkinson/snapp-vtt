"use client";

interface FormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "default" | "styled"; // "default" uses snapp classes, "styled" uses inline styles
  cancelLabel?: string;
}

/**
 * Reusable form action buttons (Cancel and Submit)
 * Standardizes the common pattern of form action buttons
 */
export default function FormActions({
  onCancel,
  submitLabel,
  isLoading = false,
  disabled = false,
  variant = "default",
  cancelLabel = "Cancel"
}: FormActionsProps) {
  const isDisabled = disabled || isLoading;
  const submitText = isLoading ? `${submitLabel.replace(/^(Save|Create|Add)/, "").trim() || "Saving"}…` : submitLabel;

  if (variant === "styled") {
    return (
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="rounded px-3 py-1 text-sm hover:opacity-80"
          style={{ color: '#5a4232' }}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90"
          style={{ backgroundColor: '#6b5438', color: '#f4e8d0', fontFamily: "'Cinzel', serif" }}
          disabled={isDisabled}
        >
          {submitText}
        </button>
      </div>
    );
  }

  // Default variant uses snapp classes
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        className="rounded px-3 py-1 text-sm hover:opacity-80 snapp-muted"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className="rounded px-3 py-1 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed snapp-primary-btn"
        disabled={isDisabled}
      >
        {submitText}
      </button>
    </div>
  );
}
