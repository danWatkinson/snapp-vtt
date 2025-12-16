"use client";

import type { ReactNode, SectionHTMLAttributes, FormHTMLAttributes } from "react";

interface SectionProps extends SectionHTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: "default" | "styled" | "secondary"; // "default" uses snapp-panel, "styled" uses inline styles, "secondary" uses snapp-panel-secondary
  className?: string;
  as?: "section" | "form";
  onSubmit?: FormHTMLAttributes<HTMLFormElement>["onSubmit"];
}

/**
 * Reusable section component with consistent panel styling
 */
export default function Section({
  children,
  variant = "default",
  className = "",
  as = "section",
  onSubmit,
  ...props
}: SectionProps) {
  const baseClasses = "space-y-3 rounded-lg border p-4";
  const variantClasses = {
    default: "snapp-panel",
    styled: "",
    secondary: "snapp-panel-secondary"
  };
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
  
  const style = variant === "styled" 
    ? { borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }
    : undefined;
  
  if (as === "form") {
    return (
      <form
        className={combinedClasses}
        style={style}
        onSubmit={onSubmit}
        {...(props as FormHTMLAttributes<HTMLFormElement>)}
      >
        {children}
      </form>
    );
  }
  
  return (
    <section
      className={combinedClasses}
      style={style}
      {...props}
    >
      {children}
    </section>
  );
}
