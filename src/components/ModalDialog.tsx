import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalDialogProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  backdropClassName?: string;
  panelClassName?: string;
  backdropStyle?: CSSProperties;
  panelStyle?: CSSProperties;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
    const style = window.getComputedStyle(element);
    return !element.hasAttribute("hidden") &&
      style.display !== "none" &&
      style.visibility !== "hidden";
  });
}

export function ModalDialog({
  titleId,
  onClose,
  children,
  backdropClassName = "",
  panelClassName = "",
  backdropStyle,
  panelStyle,
}: ModalDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const initialFocus = panelRef.current?.querySelector<HTMLElement>(
      "[data-modal-initial-focus]"
    );
    (initialFocus ?? panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = focusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !focusable.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={`modal-dialog-backdrop ${backdropClassName}`.trim()}
      style={{ ...styles.backdrop, ...backdropStyle }}
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`modal-dialog-panel ${panelClassName}`.trim()}
        style={{ ...styles.panel, ...panelStyle }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, sans-serif",
  },
  panel: {
    background: "#fff",
    borderRadius: 12,
    width: "90%",
    maxHeight: "85dvh",
    overflowY: "auto",
    boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
    position: "relative",
  },
};
