export type Credentials = { email: string; password: string };
export type AuthFormState = { error: "invalidCredentials" | "signInUnavailable" | "signOutFailed" | null };

// Minimal interface for authorization tests without replacing actual persistence.
export type PasswordClient = {
  auth: {
    signInWithPassword(credentials: Credentials): PromiseLike<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
    signOut(): PromiseLike<{ error: unknown }>;
  };
  rpc(name: "is_admin"): PromiseLike<{ data: boolean | null; error: unknown }>;
};

export function parseCredentials(formData: FormData): Credentials | null {
  const emailValue = formData.get("email");
  const password = formData.get("password");
  if (typeof emailValue !== "string" || typeof password !== "string") return null;

  const email = emailValue.trim();
  if (
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length === 0 || password.length > 1024
  ) return null;

  return { email, password };
}

export async function authenticateAdministrator(client: PasswordClient, formData: FormData) {
  const credentials = parseCredentials(formData);
  if (!credentials) return false;

  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.user) return false;

  let authorized = false;
  try {
    const result = await client.rpc("is_admin");
    authorized = !result.error && result.data === true;
    return authorized;
  } finally {
    // A valid identity without authorization must not retain a session in this app.
    if (!authorized) await client.auth.signOut();
  }
}
