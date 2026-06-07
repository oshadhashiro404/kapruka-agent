"use client";

import { useCallback, useEffect, useId, useRef } from "react";

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  panelClassName?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AccessibleDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = "",
  panelClassName = "",
  returnFocusRef,
}: AccessibleDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusable = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      returnFocusRef?.current ??
      (document.activeElement as HTMLElement | null);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      trapFocus(e);
    };

    document.addEventListener("keydown", onKeyDown);
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      const target = returnFocusRef?.current ?? previousFocusRef.current;
      target?.focus?.();
    };
  }, [open, onClose, trapFocus, returnFocusRef]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={`fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[70] w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-surface border border-border shadow-2xl ${panelClassName}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div>
            <h2 id={titleId} className="font-semibold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="font-sinhala text-xs text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-muted hover:text-foreground hover:bg-elevated text-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label={`Close ${title.toLowerCase()}`}
          >
            ×
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto px-4 py-4 min-h-0 ${className}`}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border">{footer}</div>
        )}
      </div>
    </>
  );
}
