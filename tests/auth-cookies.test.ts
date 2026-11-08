import assert from "node:assert/strict";
import { test } from "node:test";
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { getAuthCookieOptions } from "../lib/supabase/cookie-options.ts";

for (const environment of ["production", "development", "test"] as const) {
  for (const runtime of ["server", "browser"] as const) {
    test(`${runtime} auth writes and clears cookies with the ${environment} transport policy`, async () => {
      const writes: { name: string; value: string; options: CookieOptions }[] = [];
      const jar = new Map<string, string>();
      const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
      const accessToken = `test-header.${payload}.test-signature`;
      const options = {
        cookieOptions: getAuthCookieOptions(environment),
        isSingleton: false,
        global: {
          // Exercise the installed SSR cookie adapter without contacting Auth or creating users.
          fetch: async () => Response.json({
            access_token: accessToken,
            refresh_token: "test-refresh-token",
            token_type: "bearer",
            expires_in: 3600,
            user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated" },
          }),
        },
        cookies: {
          getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
          setAll: (cookies: typeof writes) => {
            writes.push(...cookies);
            cookies.forEach(({ name, value }) => {
              if (value) jar.set(name, value);
              else jar.delete(name);
            });
          },
        },
      };
      const client = runtime === "server"
        ? createServerClient("https://example.supabase.co", "sb_publishable_test-only", options)
        : createBrowserClient("https://example.supabase.co", "sb_publishable_test-only", options);

      const { error } = await client.auth.signInWithPassword({ email: "owner@example.com", password: "test-only-password" });
      assert.equal(error, null);
      assert.ok(writes.some(({ value }) => value.length > 0));
      for (const { options } of writes) {
        assert.equal(options.secure, environment === "production");
        assert.equal(options.sameSite, "lax");
        assert.equal(options.path, "/");
        assert.equal(options.httpOnly, false);
      }

      writes.length = 0;
      const result = await client.auth.signOut({ scope: "local" });
      assert.equal(result.error, null);
      assert.ok(writes.some(({ value, options }) => value === "" && options.maxAge === 0));
      assert.ok(writes.every(({ options }) => options.secure === (environment === "production")));
      assert.equal(jar.size, 0);
    });
  }
}
