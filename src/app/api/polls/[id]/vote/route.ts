import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/polls/:id/vote { optionId } — public, one increment per call
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params;

  let body: { optionId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.optionId) return Response.json({ error: "optionId required" }, { status: 400 });

  const { data: option, error: readError } = await supabaseAdmin
    .from("poll_options")
    .select("id, votes")
    .eq("id", body.optionId)
    .eq("poll_id", pollId)
    .single();

  if (readError || !option) {
    return Response.json({ error: "Option not found" }, { status: 404 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("poll_options")
    .update({ votes: option.votes + 1 })
    .eq("id", option.id);

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ success: true, votes: option.votes + 1 });
}
