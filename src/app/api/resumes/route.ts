import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_CONTENT_CHARS = 20000;

const RESUME_COLUMNS =
  "id, title, content, is_default, created_at, updated_at";

// GET /api/resumes?user_id=... -> saved resumes, default first
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("user_resumes")
    .select(RESUME_COLUMNS)
    .eq("user_id", user_id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/resumes { user_id, title?, content, is_default? }
// Without `id` this creates a resume; with `id` it updates that resume.
export async function POST(request: Request) {
  let body: {
    user_id?: string;
    id?: string;
    title?: string;
    content?: string;
    is_default?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const content = body.content?.trim() ?? "";
  if (content.length < 20) {
    return Response.json(
      { error: "Resume text is too short (minimum 20 characters)" },
      { status: 400 }
    );
  }
  if (content.length > MAX_CONTENT_CHARS) {
    return Response.json(
      { error: `Resume text is too long (max ${MAX_CONTENT_CHARS} characters)` },
      { status: 400 }
    );
  }

  const makeDefault = body.is_default ?? false;

  // Only one default per user, so clear the previous one first.
  if (makeDefault) {
    const { error: clearError } = await supabaseAdmin
      .from("user_resumes")
      .update({ is_default: false })
      .eq("user_id", body.user_id)
      .eq("is_default", true);
    if (clearError) return Response.json({ error: clearError.message }, { status: 500 });
  }

  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from("user_resumes")
      .update({
        title: body.title?.trim() || undefined,
        content,
        ...(makeDefault ? { is_default: true } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("user_id", body.user_id)
      .select(RESUME_COLUMNS)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  // First resume for the account becomes the default automatically.
  const { count } = await supabaseAdmin
    .from("user_resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", body.user_id);

  const { data, error } = await supabaseAdmin
    .from("user_resumes")
    .insert({
      user_id: body.user_id,
      title: body.title?.trim() || "My Resume",
      content,
      is_default: makeDefault || (count ?? 0) === 0,
    })
    .select(RESUME_COLUMNS)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

// DELETE /api/resumes?id=...&user_id=...
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const user_id = searchParams.get("user_id");
  if (!id || !user_id) {
    return Response.json({ error: "id and user_id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("user_resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
