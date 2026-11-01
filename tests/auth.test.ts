import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticateAdministrator, parseCredentials, type PasswordClient } from "../lib/auth/password.ts";

function form(email: string | Blob = "owner@example.com", password = " unchanged password ") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

function client(options: { loginError?: boolean; user?: boolean; admin?: boolean | null; rpcError?: boolean; rpcThrows?: boolean } = {}) {
  const calls: string[] = [];
  const value: PasswordClient = {
    auth: {
      async signInWithPassword(credentials) {
        calls.push("signIn");
        assert.equal(credentials.password, " unchanged password ");
        return { data: { user: options.user === false ? null : { id: "verified-user" } }, error: options.loginError ? new Error("denied") : null };
      },
      async signOut() { calls.push("signOut"); return { error: null }; },
    },
    async rpc(name) {
      assert.equal(name, "is_admin");
      calls.push("authorize");
      if (options.rpcThrows) throw new Error("unavailable");
      return { data: options.admin === undefined ? false : options.admin, error: options.rpcError ? new Error("denied") : null };
    },
  };
  return { value, calls };
}

test("trims the email and preserves the password exactly", () => {
  assert.deepEqual(parseCredentials(form(" owner@example.com ")), {
    email: "owner@example.com", password: " unchanged password ",
  });
});

test("rejects missing, oversized, malformed, and file credentials", () => {
  const cases = [new FormData(), form("invalid"), form("a b@example.com"), form("owner@example.com", ""), form("a".repeat(255) + "@example.com"), form("owner@example.com", "p".repeat(1025)), form(new Blob(["owner@example.com"]))];
  for (const data of cases) assert.equal(parseCredentials(data), null);
});

test("invalid input does not call Supabase Auth", async () => {
  const stub = client();
  assert.equal(await authenticateAdministrator(stub.value, form("invalid")), false);
  assert.deepEqual(stub.calls, []);
});

test("requires both successful authentication and a user", async () => {
  for (const options of [{ loginError: true }, { user: false }]) {
    const stub = client(options);
    assert.equal(await authenticateAdministrator(stub.value, form()), false);
    assert.deepEqual(stub.calls, ["signIn"]);
  }
});

test("accepts only an explicit database authorization", async () => {
  const stub = client({ admin: true });
  assert.equal(await authenticateAdministrator(stub.value, form()), true);
  assert.deepEqual(stub.calls, ["signIn", "authorize"]);
});

test("signs out an authenticated identity without administrator authorization", async () => {
  for (const options of [{ admin: false }, { admin: null }, { admin: true, rpcError: true }]) {
    const stub = client(options);
    assert.equal(await authenticateAdministrator(stub.value, form()), false);
    assert.deepEqual(stub.calls, ["signIn", "authorize", "signOut"]);
  }
});

test("a failed authorization request also cleans up the session", async () => {
  const stub = client({ rpcThrows: true });
  await assert.rejects(authenticateAdministrator(stub.value, form()), /unavailable/);
  assert.deepEqual(stub.calls, ["signIn", "authorize", "signOut"]);
});
