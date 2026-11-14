import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { authenticateAdministrator, type AuthFormState, type PasswordClient } from "../lib/auth/password.ts";

type Actions = {
  signIn(previous: AuthFormState, form: FormData): Promise<AuthFormState>;
  signOut(): Promise<AuthFormState>;
};

class Redirect extends Error {
  readonly destination: string;

  constructor(destination: string) {
    super(destination);
    this.destination = destination;
  }
}

// Run the real action module with framework adapters replaced, without a Next request or database writes.
const source = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(options: { authorized?: boolean; loginError?: boolean; logoutError?: boolean; unavailable?: boolean } = {}) {
  const events: string[] = [];
  const client: PasswordClient = {
    auth: {
      async signInWithPassword() {
        events.push("authenticate");
        return { data: { user: { id: "unit-test-owner" } }, error: options.loginError ? new Error("Unavailable") : null };
      },
      async signOut() {
        events.push("signOut");
        return { error: options.logoutError ? new Error("Unavailable") : null };
      },
    },
    async rpc() {
      events.push("authorize");
      return { data: options.authorized ?? true, error: null };
    },
  };
  const adapters: Record<string, unknown> = {
    "next/navigation": { redirect(destination: string) { events.push(`redirect:${destination}`); throw new Redirect(destination); } },
    "next/cache": { revalidatePath(path: string, type: string) { events.push(`revalidate:${path}:${type}`); } },
    "../../lib/auth/password": { authenticateAdministrator },
    "../../lib/supabase/server": {
      async createServerSupabaseClient(writableCookies: boolean) {
        assert.equal(writableCookies, true, "Session actions must be able to update cookies");
        if (options.unavailable) throw new Error("Unavailable");
        return client;
      },
    },
  };
  const actions = {} as Actions;
  compileFunction(compiled, ["exports", "require"])(actions, (name: string) => {
    assert.ok(Object.hasOwn(adapters, name), `Unexpected action dependency: ${name}`);
    return adapters[name];
  });
  return { actions, events };
}

function credentials() {
  const data = new FormData();
  data.set("email", "owner@example.com");
  data.set("password", "unit-test-password");
  return data;
}

function overviewRedirect(error: unknown) {
  return error instanceof Redirect && error.destination === "/";
}

test("successful owner login refreshes the shared shell before redirecting to Overview", async () => {
  const { actions, events } = setup();
  await assert.rejects(actions.signIn({ error: null }, credentials()), overviewRedirect);
  assert.deepEqual(events, ["authenticate", "authorize", "revalidate:/:layout", "redirect:/"]);
});

test("a non-administrator is signed out without redirecting or refreshing authenticated UI", async () => {
  const { actions, events } = setup({ authorized: false });
  assert.deepEqual(await actions.signIn({ error: null }, credentials()), { error: "invalidCredentials" });
  assert.deepEqual(events, ["authenticate", "authorize", "signOut"]);
});

test("failed login does not redirect or refresh the shell", async () => {
  const { actions, events } = setup({ loginError: true });
  assert.deepEqual(await actions.signIn({ error: null }, credentials()), { error: "invalidCredentials" });
  assert.deepEqual(events, ["authenticate"]);
});

test("unavailable login returns the existing localized error key", async () => {
  const { actions, events } = setup({ unavailable: true });
  assert.deepEqual(await actions.signIn({ error: null }, credentials()), { error: "signInUnavailable" });
  assert.deepEqual(events, []);
});

test("successful logout refreshes the shared shell before returning to the public Overview", async () => {
  const { actions, events } = setup();
  await assert.rejects(actions.signOut(), overviewRedirect);
  assert.deepEqual(events, ["signOut", "revalidate:/:layout", "redirect:/"]);
});

test("failed logout preserves the page and returns an error instead of claiming a public session", async () => {
  const { actions, events } = setup({ logoutError: true });
  assert.deepEqual(await actions.signOut(), { error: "signOutFailed" });
  assert.deepEqual(events, ["signOut"]);
});

test("unavailable logout returns an error without redirecting", async () => {
  const { actions, events } = setup({ unavailable: true });
  assert.deepEqual(await actions.signOut(), { error: "signOutFailed" });
  assert.deepEqual(events, []);
});
