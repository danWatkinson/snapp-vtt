"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "muted";
  size?: "xs" | "sm" | "md";
  type?: "button" | "submit" | "reset";
}

/**
 * Reusable button component with consistent styling variants
 */
export default function Button({
  children,
  variant = "primary",
  size = "sm",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "rounded font-semibold hover:opacity-90 transition-opacity";
  
  const sizeClasses = {
    xs: "px-3 py-1 text-xs",
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base"
  };
  
  const variantClasses = {
    primary: "snapp-primary-btn",
    secondary: "bg-transparent border border-[#8b6f47] text-[#3d2817] hover:bg-amber-50",
    muted: "bg-transparent text-[#5a4232] hover:bg-amber-50"
  };
  
  const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();
  
  return (
    <button
      type={type}
      className={combinedClasses}
      {...props}
    >
      {children}
    </button>
  );
}
