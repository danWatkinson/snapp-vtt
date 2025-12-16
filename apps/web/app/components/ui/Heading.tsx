"use client";

import type { ReactNode } from "react";

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable heading component that standardizes headings with Cinzel font
 * Defaults to level 2 with snapp-heading class
 */
export default function Heading({
  level = 2,
  children,
  className = "",
  style
}: HeadingProps) {
  const baseClasses = "text-lg font-medium snapp-heading";
  const combinedClasses = className ? `${baseClasses} ${className}`.trim() : baseClasses;
  const defaultStyle = { fontFamily: "'Cinzel', serif" };
  const combinedStyle = style ? { ...defaultStyle, ...style } : defaultStyle;

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={combinedClasses} style={combinedStyle}>
      {children}
    </Tag>
  );
}
