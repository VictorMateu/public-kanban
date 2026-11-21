import { z } from "zod";
import { getAdministrator } from "../../../lib/auth/server";
import { createPublicSupabaseClient } from "../../../lib/supabase/public";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { isSupabaseConfigured } from "../../../lib/supabase/env";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success || !isSupabaseConfigured()) return new Response(null, { status: 404, headers });
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  try {
    // A public request never gains privileges from an administrator cookie.
    const client = preview ? await createServerSupabaseClient(true) : createPublicSupabaseClient();
    if (preview && !await getAdministrator(client)) return new Response(null, { status: 404, headers });
    const { data: asset, error } = await client.from("project_assets").select("object_path, mime_type, byte_size").eq("id", id.data).eq("status", "ready").maybeSingle();
    if (error || !asset) return new Response(null, { status: 404, headers });
    // Storage RLS rechecks project visibility and only permits downloads, never URL signing.
    const file = await client.storage.from("project-images").download(asset.object_path);
    if (file.error || !file.data) return new Response(null, { status: 404, headers });
    return new Response(file.data, { headers: { ...headers, "Content-Type": asset.mime_type, "Content-Disposition": "inline" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
