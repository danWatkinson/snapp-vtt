"use client";

import type { ReactNode } from "react";

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
  "aria-selected"?: boolean;
  "aria-label"?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "planning"; // "default" uses brown, "planning" uses yellow
}

/**
 * Reusable tab button component with consistent active/inactive styling
 */
export default function TabButton({
  isActive,
  onClick,
  children,
  "aria-selected": ariaSelected,
  "aria-label": ariaLabel,
  className = "",
  style,
  variant = "default"
}: TabButtonProps) {
  const defaultInactiveStyle = { color: "#3d2817" };
  const inactiveStyle = style || defaultInactiveStyle;
  
  const activeStyles = variant === "planning"
    ? {
        backgroundColor: "#facc15",
        color: "#3d2817",
        fontFamily: "'Cinzel', serif"
      }
    : {
        backgroundColor: "#6b5438",
        color: "#f4e8d0",
        fontFamily: "'Cinzel', serif"
      };
  
  const hoverClass = variant === "planning" 
    ? "hover:bg-amber-100/40" 
    : "hover:opacity-80";
  
  return (
    <button
      role="tab"
      type="button"
      aria-selected={ariaSelected ?? isActive}
      aria-label={ariaLabel}
      className={
        "rounded-full px-3 py-1 transition-colors " +
        (isActive ? "text-white" : `bg-transparent ${hoverClass}`) +
        (className ? ` ${className}` : "")
      }
      style={
        isActive
          ? activeStyles
          : inactiveStyle
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
