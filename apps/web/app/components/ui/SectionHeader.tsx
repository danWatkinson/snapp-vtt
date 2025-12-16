"use client";

import type { ReactNode } from "react";
import Heading from "./Heading";
import Button from "./Button";

interface SectionHeaderProps {
  children: ReactNode; // The heading content
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  action?: {
    label: string;
    onClick: () => void;
    size?: "xs" | "sm" | "md";
    "data-testid"?: string;
  };
  headingStyle?: React.CSSProperties;
  className?: string;
}

/**
 * Reusable section header component with heading and optional action button
 */
export default function SectionHeader({
  children,
  level = 2,
  action,
  headingStyle,
  className = ""
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`.trim()}>
      <Heading level={level} style={headingStyle}>
        {children}
      </Heading>
      {action && (
        <Button
          size={action.size || "sm"}
          onClick={action.onClick}
          data-testid={action["data-testid"]}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
