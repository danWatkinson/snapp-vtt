"use client";

import type { ReactNode } from "react";
import { STYLED_PANEL_STYLE, STYLED_TITLE_STYLE } from "../../styles/constants";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "default" | "styled"; // "default" uses snapp-panel, "styled" uses inline styles
  closeOnBackdropClick?: boolean;
  "aria-label"?: string;
}

/**
 * Reusable modal component that standardizes modal structure
 * Supports two styling variants: default (snapp-panel) and styled (inline styles)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = "default",
  closeOnBackdropClick = false,
  "aria-label": ariaLabel
}: ModalProps) {
  if (!isOpen) return null;

  const backdropClasses = "fixed inset-0 z-50 flex items-center justify-center bg-black/60";
  const dialogClasses = "w-full max-w-md rounded-lg border p-4 shadow-lg";
  
  const dialogStyle = variant === "styled" 
    ? STYLED_PANEL_STYLE
    : undefined;
  
  const dialogClassName = variant === "default" 
    ? `${dialogClasses} snapp-panel`
    : dialogClasses;

  const titleStyle = variant === "styled"
    ? STYLED_TITLE_STYLE
    : { fontFamily: "'Cinzel', serif" };

  const titleClassName = variant === "default"
    ? "text-lg font-medium mb-3 snapp-heading"
    : "text-lg font-medium mb-3";

  const handleBackdropClick = closeOnBackdropClick ? onClose : undefined;
  const handleDialogClick = closeOnBackdropClick 
    ? (e: React.MouseEvent) => e.stopPropagation()
    : undefined;

  return (
    <div
      className={backdropClasses}
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        className={dialogClassName}
        style={dialogStyle}
        onClick={handleDialogClick}
      >
        <h2 className={titleClassName} style={titleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
