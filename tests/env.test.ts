import assert from "node:assert/strict";
import { test } from "node:test";
import { getSupabaseConfig } from "../lib/supabase/env.ts";

test("accepts the publishable key and a project origin", () => {
  assert.deepEqual(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_test-only " }), {
    url: "https://example.supabase.co", key: "sb_publishable_test-only",
  });
});

test("allows the local Supabase origin", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    const url = `http://${host}:54321`;
    assert.equal(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only" }).url, url);
  }
});

test("rejects unencrypted non-loopback connections, including deceptive hostnames", () => {
  for (const host of ["example.supabase.co", "192.168.1.10", "0.0.0.0", "localhost.example.com", "127.0.0.1.example.com", "[::ffff:192.168.1.10]"]) {
    assert.throws(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: `http://${host}:54321`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only" }));
  }
});

test("fails closed for missing configuration and privileged or legacy keys", () => {
  assert.throws(() => getSupabaseConfig({}));
  for (const key of ["", "sb_secret_do-not-use", "service_role", "eyJhbGciOiJIUzI1NiJ9.test.signature"]) {
    assert.throws(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }));
  }
});

test("rejects URLs with credentials, query strings, fragments, paths, or non HTTP protocols", () => {
  for (const url of ["invalid", "ftp://example.com", "https://user:password@example.com", "https://example.com/?key=secret", "https://example.com/#secret", "https://example.com/rest/v1"]) {
    assert.throws(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only" }));
  }
});
