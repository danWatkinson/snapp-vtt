"use client";

import type { ReactNode, LiHTMLAttributes } from "react";

interface ListItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "role"> {
  children: ReactNode;
  variant?: "default" | "styled"; // "default" uses snapp-panel, "styled" uses inline styles
  className?: string;
}

/**
 * Reusable list item component with consistent styling
 */
export default function ListItem({
  children,
  variant = "default",
  className = "",
  ...props
}: ListItemProps) {
  const baseClasses = "rounded border p-3 text-sm";
  const variantClasses = variant === "default" ? "snapp-panel" : "";
  const combinedClasses = `${baseClasses} ${variantClasses} ${className}`.trim();
  
  const style = variant === "styled" 
    ? { borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }
    : undefined;
  
  return (
    <li
      role="listitem"
      className={combinedClasses}
      style={style}
      {...props}
    >
      {children}
    </li>
  );
}
