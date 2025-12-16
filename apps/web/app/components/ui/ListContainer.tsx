"use client";

import type { ReactNode } from "react";
import EmptyState from "./EmptyState";

interface ListContainerProps {
  items: unknown[];
  emptyMessage: string;
  emptyVariant?: "default" | "muted";
  children: ReactNode; // The list content (ul with items)
  className?: string;
  "data-testid"?: string;
}

/**
 * Reusable list container component that handles empty state and list rendering
 */
export default function ListContainer({
  items,
  emptyMessage,
  emptyVariant = "default",
  children,
  className = "",
  "data-testid": testId
}: ListContainerProps) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} variant={emptyVariant} />;
  }

  return (
    <ul className={`space-y-2 ${className}`.trim()} data-testid={testId}>
      {children}
    </ul>
  );
}
