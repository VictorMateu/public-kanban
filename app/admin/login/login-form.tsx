"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: null });
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Correo electrónico</label>
        <input
          id="email" name="email" type="email" autoComplete="username" required maxLength={254}
          className="mt-2 w-full rounded-lg border border-slate-400 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
        <input
          id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024}
          className="mt-2 w-full rounded-lg border border-slate-400 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        />
      </div>
      <p role="status" aria-live="polite" className="text-sm text-red-800">{state.error}</p>
      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-medium text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:opacity-60"
      >
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
