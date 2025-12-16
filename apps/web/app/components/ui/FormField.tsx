"use client";

import type { ChangeEvent, ReactNode } from "react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface FormFieldProps {
  label: string;
  value: string | number | string[];
  onChange: (value: string) => void;
  type?: "text" | "password" | "email" | "number" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  inputClassName?: string;
  "data-testid"?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
  options?: SelectOption[]; // For select type
}

/**
 * Reusable form field component that combines label and input/textarea
 */
export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  rows,
  className = "",
  inputClassName = "",
  "data-testid": testId,
  children,
  style,
  options = []
}: FormFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const baseInputClasses = "mt-1 w-full rounded border px-2 py-1 text-sm snapp-input";
  const inputClasses = `${baseInputClasses} ${inputClassName}`.trim();

  return (
    <label className={`block text-sm ${className}`.trim()}>
      {label}
      {type === "textarea" ? (
        <textarea
          className={inputClasses}
          value={Array.isArray(value) ? value.join(", ") : value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          rows={rows || 3}
          data-testid={testId}
          style={style}
        />
      ) : type === "select" ? (
        <select
          className={inputClasses}
          value={Array.isArray(value) ? value.join(", ") : value}
          onChange={handleChange}
          required={required}
          data-testid={testId}
          style={style}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={inputClasses}
          value={Array.isArray(value) ? value.join(", ") : value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          data-testid={testId}
          style={style}
        />
      )}
      {children}
    </label>
  );
}
