export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env.local." },
      { status: 503 }
    );
  }

  let body: { rawText?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawText = body.rawText?.trim() ?? "";
  if (rawText.length < 20) {
    return Response.json(
      { error: "Pasted text is too short (minimum 20 characters)" },
      { status: 400 }
    );
  }

  try {
    const { extractJobInput } = await import("@/lib/gemini");
    const result = await extractJobInput(rawText);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
