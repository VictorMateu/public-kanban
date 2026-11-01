type PublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export function getSupabaseConfig(env: PublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
}) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("Falta configurar la URL y la clave publicable de Supabase.");
  }

  const parsedUrl = new URL(url);
  if (
    !["https:", "http:"].includes(parsedUrl.protocol) ||
    parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash ||
    parsedUrl.pathname !== "/"
  ) {
    throw new Error("La URL de Supabase debe ser el origen HTTP o HTTPS del proyecto.");
  }

  // Esta base requiere las nuevas claves publicables, nunca claves privilegiadas.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("Usa una clave publicable de Supabase (sb_publishable_...).");
  }

  return { url: parsedUrl.origin, key };
}

export function isSupabaseConfigured() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
