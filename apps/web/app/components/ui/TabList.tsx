"use client";

import type { ReactNode, HTMLAttributes } from "react";

interface TabListProps extends Omit<HTMLAttributes<HTMLElement>, "role" | "aria-label"> {
  children: ReactNode;
  "aria-label": string;
  variant?: "default" | "planning" | "filter"; // Different tab container styles
  flexWrap?: boolean;
  className?: string;
}

/**
 * Reusable tab list component that wraps tab navigation
 */
export default function TabList({
  children,
  "aria-label": ariaLabel,
  variant = "default",
  flexWrap = false,
  className = "",
  ...props
}: TabListProps) {
  const baseClasses = "inline-flex gap-2 rounded-full p-1 text-xs";
  const variantClasses = {
    default: "snapp-tabs",
    planning: "snapp-tabs snapp-planning-tabs",
    filter: "snapp-filter-tabs"
  };
  const wrapClass = flexWrap ? "flex-wrap" : "";
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${wrapClass} ${className}`.trim();
  
  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={combinedClasses}
      {...props}
    >
      {children}
    </nav>
  );
}
