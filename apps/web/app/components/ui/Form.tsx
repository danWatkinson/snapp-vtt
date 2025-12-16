"use client";

import type { ReactNode, FormHTMLAttributes } from "react";

interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

/**
 * Reusable form component with consistent styling
 */
export default function Form({
  children,
  onSubmit,
  className = "",
  ...props
}: FormProps) {
  const baseClasses = "space-y-3";
  const combinedClasses = `${baseClasses} ${className}`.trim();
  
  return (
    <form
      className={combinedClasses}
      onSubmit={onSubmit}
      {...props}
    >
      {children}
    </form>
  );
}
