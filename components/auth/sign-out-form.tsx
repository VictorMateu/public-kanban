"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "../../app/admin/actions";

export function SignOutForm({ className = "mt-4" }: { className?: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(signOut, { error: null });
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.error && !pending) submitRef.current?.focus();
  }, [state.error, pending]);

  return (
    <form action={action} className={className}>
      <button
        ref={submitRef}
        type="submit" disabled={pending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/10 bg-surface-warm px-4 py-3 text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="size-5 shrink-0">
          <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4M8 12h10" />
        </svg>
        {pending ? t("signingOut") : t("signOut")}
      </button>
      <p role="status" aria-live="polite" className={state.error ? "mt-3 text-sm text-foreground" : undefined}>{state.error ? t(state.error) : null}</p>
    </form>
  );
}
