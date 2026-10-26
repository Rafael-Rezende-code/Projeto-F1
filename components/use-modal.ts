"use client";

import { useEffect, type RefObject } from "react";

// Comportamento de diálogo modal reaproveitado (menu, busca, lightbox): foco inicial, foco preso
// dentro do painel, Esc fecha, a página atrás não rola e o foco volta para quem abriu.
export function useModal(open: boolean, panelRef: RefObject<HTMLElement | null>, onClose: () => void, initialFocus?: string) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel?.querySelector<HTMLElement>("[data-autofocus]");
    window.requestAnimationFrame(() => target?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, panelRef, onClose, initialFocus]);
}
