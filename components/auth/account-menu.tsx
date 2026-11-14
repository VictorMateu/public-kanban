"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import styles from "./account-menu.module.css";
import { AccountIcon } from "./account-icon";

export function AccountMenu({ children }: { children: ReactNode }) {
  const t = useTranslations("Auth");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pinned = useRef(false);
  const id = useId();
  const close = useCallback(() => {
    pinned.current = false;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close();
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="relative z-[6]"
      onPointerEnter={event => {
        if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) setOpen(true);
      }}
      onPointerLeave={event => {
        if (!pinned.current && !event.currentTarget.contains(document.activeElement)) close();
      }}
      onBlur={event => {
        // Disabling the submit button during logout must not hide pending/error feedback.
        if (event.relatedTarget === null && event.target instanceof HTMLButtonElement && event.target.disabled) return;
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={event => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
          toggleRef.current?.focus();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-label={t("accountMenu")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          // A click pins a hover-open panel so moving the pointer will not dismiss it.
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
        className={`${styles.trigger} flex size-11 items-center justify-center rounded-full border border-border/20 bg-positive text-foreground shadow-panel hover:bg-surface-positive focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus`}
      >
        <AccountIcon />
      </button>
      <section id={id} hidden={!open} aria-labelledby={`${id}-title`} className={styles.panel}>
        <div className="rounded-3xl border border-border/15 bg-surface p-4 shadow-panel sm:p-5">
          <h2 id={`${id}-title`} className="text-2xl">{t("accountTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{t("accountDescription")}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
