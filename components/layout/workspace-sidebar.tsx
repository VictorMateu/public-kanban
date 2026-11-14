"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export function WorkspaceSidebar({ brand, children, label }: { brand: ReactNode; children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = `workspace-menu-${useId()}`;
  const t = useTranslations("Navigation");

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  return (
    <aside
      ref={sidebarRef}
      aria-label={label}
      className="workspace-sidebar"
      onClick={event => {
        if (open && event.target instanceof Element && event.target.closest("a[href]")) {
          setOpen(false);
          if (toggleRef.current?.getClientRects().length) toggleRef.current.focus();
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          if (toggleRef.current?.getClientRects().length) toggleRef.current.focus();
        }
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        {brand}
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          data-open={open}
          aria-controls={panelId}
          aria-label={t(open ? "closeMenu" : "openMenu")}
          onClick={() => setOpen(!open)}
          className="workspace-menu-toggle flex size-11 shrink-0 items-center justify-center rounded-full border border-border/15 bg-surface/80 text-foreground hover:bg-accent/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false" className="size-6">
            <path d="M6 8.5h12" className="workspace-menu-stroke workspace-menu-stroke-top" />
            <path d="M6 15.5h12" className="workspace-menu-stroke workspace-menu-stroke-bottom" />
          </svg>
        </button>
      </div>
      <div
        id={panelId}
        data-open={open}
        className="workspace-sidebar-panel"
      >
        {children}
      </div>
    </aside>
  );
}
