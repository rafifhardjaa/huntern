import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/polls?user_id=... -> polls with options + vote totals
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const { data: polls, error } = await supabaseAdmin
    .from("offer_polls")
    .select("id, title, created_at, poll_options(id, label, votes, job_application_id)")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(polls ?? []);
}

// POST /api/polls { user_id, title, options: [{ job_application_id, label }] }
export async function POST(request: Request) {
  let body: {
    user_id?: string;
    title?: string;
    options?: { job_application_id?: string; label?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  if (!body.title?.trim()) return Response.json({ error: "Title required" }, { status: 400 });
  const options = (body.options ?? []).filter((o) => o.label?.trim());
  if (options.length < 2) {
    return Response.json({ error: "Pick at least 2 offers to compare" }, { status: 400 });
  }

  const { data: poll, error: pollError } = await supabaseAdmin
    .from("offer_polls")
    .insert({ user_id: body.user_id, title: body.title.trim() })
    .select("id, title, created_at")
    .single();
  if (pollError || !poll) {
    return Response.json({ error: pollError?.message ?? "Failed to create poll" }, { status: 500 });
  }

  const { data: inserted, error: optError } = await supabaseAdmin
    .from("poll_options")
    .insert(
      options.map((o) => ({
        poll_id: poll.id,
        job_application_id: o.job_application_id ?? null,
        label: o.label!.trim(),
      }))
    )
    .select("id, label, votes, job_application_id");

  if (optError) {
    await supabaseAdmin.from("offer_polls").delete().eq("id", poll.id);
    return Response.json({ error: optError.message }, { status: 500 });
  }

  return Response.json({ ...poll, poll_options: inserted ?? [] }, { status: 201 });
}

// DELETE /api/polls?id=...&user_id=...
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const user_id = searchParams.get("user_id");
  if (!id || !user_id) return Response.json({ error: "id and user_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("offer_polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
