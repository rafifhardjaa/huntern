import { supabaseAdmin } from "@/lib/supabase-admin";

export const EXPENSE_CATEGORIES = [
  "subscriptions",
  "courses",
  "transport",
  "meals",
  "other",
] as const;

// GET /api/expenses?user_id=... -> expense rows, newest first
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("id, title, amount_cents, category, spent_on, created_at")
    .eq("user_id", user_id)
    .order("spent_on", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/expenses { user_id, title, amount (in major units, e.g. 12.50), category, spent_on }
export async function POST(request: Request) {
  let body: {
    user_id?: string;
    title?: string;
    amount?: number;
    category?: string;
    spent_on?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  if (!body.title?.trim()) return Response.json({ error: "Title required" }, { status: 400 });
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  const category = (body.category ?? "other").toLowerCase();
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  const spent_on = body.spent_on ?? new Date().toISOString().slice(0, 10);
  if (Number.isNaN(Date.parse(spent_on))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      user_id: body.user_id,
      title: body.title.trim(),
      amount_cents: Math.round(amount * 100),
      category,
      spent_on,
    })
    .select("id, title, amount_cents, category, spent_on, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

// DELETE /api/expenses?id=...&user_id=...
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const user_id = searchParams.get("user_id");
  if (!id || !user_id) return Response.json({ error: "id and user_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
