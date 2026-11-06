import { supabaseAdmin } from "@/lib/supabase-admin";

// CORS headers so the Chrome extension can POST from any origin during dev.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Job pages usually title themselves "<Position> at <Company> · <Board>".
// Splitting on that pattern gives a usable fallback when the AI comes back empty.
function splitJobTitle(pageTitle: string): { company: string; position: string } {
  const cleaned = pageTitle
    .split(/\s*[|·•–—-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (cleaned.length === 0) return { company: "", position: "" };

  const head = cleaned[0];
  const atMatch = head.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
  if (atMatch) {
    return { position: atMatch[1].trim(), company: atMatch[2].trim() };
  }
  if (cleaned.length >= 2) {
    return { position: head, company: cleaned[1] };
  }
  return { company: "", position: head };
}

function guessCompanyFromTitle(pageTitle: string): string {
  return splitJobTitle(pageTitle).company;
}

function guessTitleFromTitle(pageTitle: string): string {
  return splitJobTitle(pageTitle).position;
}

// POST /api/clipper { rawText, user_id, page_url? }
// Parses raw job-board text with Gemini and saves it as a wishlist application.
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env.local." },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  let body: { rawText?: string; user_id?: string; page_url?: string; page_title?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const rawText = body.rawText?.trim() ?? "";
  if (rawText.length < 50) {
    return Response.json(
      { error: "Scraped text is too short (minimum 50 characters)" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const user_id = body.user_id?.trim() ?? "";
  if (!isUuid(user_id)) {
    return Response.json(
      { error: "Valid user_id required (copy it from Settings → Clipper Setup)" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userError || !userData?.user) {
      return Response.json({ error: "Unknown user_id" }, { status: 401, headers: CORS_HEADERS });
    }

    const { extractJobInput } = await import("@/lib/gemini");
    const extracted = await extractJobInput(rawText.slice(0, 12000));

    // The page title often survives a bad extraction, so use it as a fallback
    // rather than storing "Unknown position".
    const pageTitle = body.page_title?.trim() ?? "";
    const company =
      extracted.company_name ||
      (pageTitle ? guessCompanyFromTitle(pageTitle) : "") ||
      "Unknown company";
    const position = extracted.position_title || (pageTitle ? guessTitleFromTitle(pageTitle) : "") || "Unknown position";
    const description = [extracted.job_description, body.page_url ? `\n\nSource: ${body.page_url}` : ""]
      .join("")
      .slice(0, 4000);

    const { data, error } = await supabaseAdmin
      .from("job_applications")
      .insert({
        user_id,
        company_name: company,
        position_title: position,
        status: "wishlist",
        job_description: description || null,
      })
      .select("id, company_name, position_title, status, created_at")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
    }

    return Response.json({ success: true, job: data }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clipper failed";
    return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
