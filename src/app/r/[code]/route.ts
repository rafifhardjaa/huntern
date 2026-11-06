import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function deviceType(ua: string): string {
  const s = ua.toLowerCase();
  if (/tablet|ipad/.test(s)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(s)) return "mobile";
  return "desktop";
}

// GET /r/:code -> log click, redirect to original URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: link } = await supabaseAdmin
    .from("resume_links")
    .select("id, original_url")
    .eq("short_code", code)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Short link not found" }, { status: 404 });
  }

  const ua = request.headers.get("user-agent") ?? "";
  await supabaseAdmin.from("link_clicks").insert({
    link_id: link.id,
    user_agent: ua.slice(0, 500),
    device_type: deviceType(ua),
  });

  return NextResponse.redirect(link.original_url, 302);
}
