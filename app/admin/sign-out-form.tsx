"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "./actions";

export function SignOutForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState(signOut, { error: null });
  return (
    <form action={action} className="mt-8">
      <button
        type="submit" disabled={pending}
        className="rounded-lg bg-indigo-700 px-4 py-3 font-normal text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:opacity-60"
      >
        {pending ? t("signingOut") : t("signOut")}
      </button>
      <p role="status" className="mt-3 text-sm text-red-800">{state.error ? t(state.error) : null}</p>
    </form>
  );
}
