"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "../actions";
import { SIGN_IN_FIELDS } from "../../../lib/auth/password";

export function LoginForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(signIn, { error: null });
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-normal">{t("email")}</label>
        <input
          id="email" name={SIGN_IN_FIELDS.email} type="email" autoComplete="username" required maxLength={254}
          className="mt-2 min-h-11 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-normal">{t("password")}</label>
        <input
          id="password" name={SIGN_IN_FIELDS.password} type="password" autoComplete="current-password" required maxLength={1024}
          className="mt-2 min-h-11 w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </div>
      <p role="status" aria-live="polite" className={state.error ? "rounded-xl border border-border/25 bg-surface-warm p-3 text-sm text-foreground" : undefined}>{state.error ? t(state.error) : null}</p>
      <button
        type="submit" disabled={pending}
        className="min-h-11 w-full rounded-xl border border-border/15 bg-accent px-4 py-3 text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? t("signingIn") : t("signIn")}
      </button>
    </form>
  );
}
