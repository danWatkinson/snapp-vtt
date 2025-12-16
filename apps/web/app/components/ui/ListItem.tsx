"use client";

import type { ReactNode, LiHTMLAttributes } from "react";

interface ListItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "role"> {
  children: ReactNode;
  variant?: "default" | "styled" | "timeline"; // "default" uses snapp-panel, "styled" uses inline styles, "timeline" uses emerald timeline styling
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
  const baseClasses = "rounded border text-sm";
  const paddingClass = variant === "timeline" ? "p-2" : "p-3";
  const variantClasses = variant === "default" ? "snapp-panel" : "";
  const combinedClasses = `${baseClasses} ${paddingClass} ${variantClasses} ${className}`.trim();
  
  const style = variant === "styled" 
    ? { borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }
    : variant === "timeline"
    ? { borderColor: '#6b5438', backgroundColor: 'rgba(107, 84, 56, 0.2)' }
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
