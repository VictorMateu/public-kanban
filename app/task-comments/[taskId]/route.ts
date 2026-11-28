import { z } from "zod";
import { getAdministrator } from "../../../lib/auth/server";
import { createPublicSupabaseClient } from "../../../lib/supabase/public";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { commentCountSchema, commentCursorSchema, commentPageSchema } from "../../../lib/tasks/comment-schemas";

const pageSize = 20;
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const taskId = z.uuid().safeParse((await params).taskId);
  const search = new URL(request.url).searchParams;
  const preview = search.get("preview") === "1";
  const cursor = search.has("before") || search.has("beforeId")
    ? commentCursorSchema.safeParse({ created_at: search.get("before"), id: search.get("beforeId") })
    : null;
  if (!taskId.success || cursor?.success === false) return new Response(null, { status: 400, headers });

  try {
    const client = preview ? await createServerSupabaseClient(true) : createPublicSupabaseClient();
    if (preview && !await getAdministrator(client)) return new Response(null, { status: 404, headers });
    if (search.get("count") === "1") {
      const { error, count } = await client.from("task_comments")
        .select("id", { count: "exact", head: true }).eq("task_id", taskId.data);
      if (error) return new Response(null, { status: 503, headers });
      return Response.json(commentCountSchema.parse({ count }), { headers });
    }
    let query = client.from("task_comments")
      .select("id, body, is_public, created_at, updated_at").eq("task_id", taskId.data)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize + 1);
    if (cursor) {
      const { created_at, id } = cursor.data;
      query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
    }
    const { data, error } = await query;
    if (error) return new Response(null, { status: 503, headers });
    const comments = data.slice(0, pageSize);
    const last = comments.at(-1);
    const page = commentPageSchema.parse({
      comments: comments.reverse(),
      next: data.length > pageSize && last ? { created_at: last.created_at, id: last.id } : null,
    });
    return Response.json(page, { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
