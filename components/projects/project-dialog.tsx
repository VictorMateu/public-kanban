"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

export function ProjectDialog({ id, title, closeLabel, open, busy = false, onClose, onAfterClose, triggerRef, children, leadingAction, actions }: {
  id: string; title: string; closeLabel: string; open: boolean; busy?: boolean;
  onClose: () => void; onAfterClose?: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>; children: ReactNode; leadingAction?: ReactNode; actions?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (!open) {
      if (modal.open) {
        modal.close();
        triggerRef.current?.focus();
      }
      return;
    }
    if (!modal.open) modal.showModal();
    heading.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, title, triggerRef]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]',
    )].filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) {
      event.preventDefault();
      heading.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <dialog ref={dialog} id={id} aria-labelledby={id + "-heading"} onKeyDown={handleDialogKeyDown} closedby={busy ? "none" : "closerequest"}
    onKeyDownCapture={(event) => {
      if (event.key === "Escape") {
        const modal = event.currentTarget;
        if ((CSS.supports("selector(:popover-open)") && modal.querySelector(":popover-open")) ||
            (CSS.supports("selector(select:open)") && modal.querySelector("select:open"))) return;
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }
    }}
    onCancel={(event) => {
      // File inputs also emit bubbling cancel events when their picker is dismissed.
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      if (!busy) onClose();
    }}
    onClose={() => {
      if (!dialog.current?.open) {
        onClose();
        onAfterClose?.();
        triggerRef.current?.focus();
      }
    }}
    className="project-dialog m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-3xl border border-border/20 bg-surface p-0 text-left text-foreground shadow-panel backdrop:bg-foreground/40">
    {open && <>
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/15 bg-surface-warm/60 px-5 py-4 sm:px-7">
        <h2 ref={heading} tabIndex={-1} id={id + "-heading"} className="min-w-0 text-3xl wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{title}</h2>
        <button type="button" disabled={busy} onClick={onClose} aria-label={closeLabel} title={closeLabel} className="editor-tool project-close-icon shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="project-dialog-body min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">{children}</div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border/15 bg-surface-warm/60 px-5 py-4 sm:px-7">
        {leadingAction}
        <button type="button" disabled={busy} onClick={onClose} className="project-secondary-action">{closeLabel}</button>
        {actions}
      </footer>
    </>}
  </dialog>;
}
