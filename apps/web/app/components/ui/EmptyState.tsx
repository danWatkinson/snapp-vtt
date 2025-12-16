"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  variant?: "default" | "muted"; // "default" uses snapp-muted, "muted" uses inline color
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable empty state component for displaying "no items" messages
 */
export default function EmptyState({
  message,
  variant = "default",
  className = "",
  children
}: EmptyStateProps) {
  const baseClasses = "text-sm";
  const variantClasses = variant === "default" ? "snapp-muted" : "";
  const combinedClasses = `${baseClasses} ${variantClasses} ${className}`.trim();
  
  const style = variant === "muted" ? { color: '#5a4232' } : undefined;
  
  return (
    <p className={combinedClasses} style={style}>
      {message}
      {children}
    </p>
  );
}
