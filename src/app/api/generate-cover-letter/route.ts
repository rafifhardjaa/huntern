export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env.local." },
      { status: 503 }
    );
  }

  let body: { jobDescription?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobDescription = body.jobDescription?.trim() ?? "";
  if (jobDescription.length < 20) {
    return Response.json(
      { error: "Job description is too short (minimum 20 characters)" },
      { status: 400 }
    );
  }

  try {
    // Dynamic import so a missing key only fails at request time, not at build
    const { generateCoverLetter } = await import("@/lib/gemini");
    const result = await generateCoverLetter(jobDescription);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
