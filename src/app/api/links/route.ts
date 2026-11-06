import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

function genCode(length = 6): string {
  return randomBytes(length)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "x")
    .slice(0, length);
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// GET /api/links?user_id=... -> links with click counts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const { data: links, error } = await supabaseAdmin
    .from("resume_links")
    .select("id, title, original_url, short_code, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (links ?? []).map((l) => l.id);
  const counts: Record<string, number> = {};
  const byDevice: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
  if (ids.length > 0) {
    const { data: clicks, error: clickError } = await supabaseAdmin
      .from("link_clicks")
      .select("link_id, device_type, clicked_at")
      .in("link_id", ids)
      .order("clicked_at", { ascending: false })
      .limit(500);
    if (clickError) return Response.json({ error: clickError.message }, { status: 500 });
    for (const c of clicks ?? []) {
      counts[c.link_id] = (counts[c.link_id] ?? 0) + 1;
      const d = (c.device_type ?? "desktop").toLowerCase();
      byDevice[d] = (byDevice[d] ?? 0) + 1;
    }
  }

  return Response.json({
    links: (links ?? []).map((l) => ({ ...l, clicks: counts[l.id] ?? 0 })),
    stats: {
      total_clicks: Object.values(counts).reduce((s, n) => s + n, 0),
      by_device: [
        { device: "Desktop", clicks: byDevice.desktop ?? 0, fill: "#4F46E5" },
        { device: "Mobile", clicks: byDevice.mobile ?? 0, fill: "#10B981" },
        { device: "Tablet", clicks: byDevice.tablet ?? 0, fill: "#F59E0B" },
      ],
    },
  });
}

// POST /api/links { user_id, title, original_url } -> created link
export async function POST(request: Request) {
  let body: { user_id?: string; title?: string; original_url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  if (!body.title?.trim()) return Response.json({ error: "Title required" }, { status: 400 });
  const original_url = normalizeUrl(body.original_url ?? "");
  if (!original_url) return Response.json({ error: "Valid http(s) URL required" }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt++) {
    const short_code = genCode();
    const { data, error } = await supabaseAdmin
      .from("resume_links")
      .insert({
        user_id: body.user_id,
        title: body.title.trim(),
        original_url,
        short_code,
      })
      .select("id, title, original_url, short_code, created_at")
      .single();
    if (!error) return Response.json({ ...data, clicks: 0 }, { status: 201 });
    if (!/duplicate|unique/i.test(error.message)) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  return Response.json({ error: "Could not generate unique code, try again" }, { status: 500 });
}

// DELETE /api/links?id=...&user_id=... -> delete link (clicks cascade)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const user_id = searchParams.get("user_id");
  if (!id || !user_id) return Response.json({ error: "id and user_id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("resume_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
