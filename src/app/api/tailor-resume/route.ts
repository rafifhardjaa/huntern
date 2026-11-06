export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env.local." },
      { status: 503 }
    );
  }

  let body: { jobDescription?: string; resumeBullets?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobDescription = body.jobDescription?.trim() ?? "";
  const resumeBullets = body.resumeBullets?.trim() ?? "";

  if (jobDescription.length < 20) {
    return Response.json(
      { error: "Job description is too short (minimum 20 characters)" },
      { status: 400 }
    );
  }
  if (resumeBullets.length < 10) {
    return Response.json(
      { error: "Resume bullets are too short (minimum 10 characters)" },
      { status: 400 }
    );
  }

  try {
    const { tailorResume } = await import("@/lib/gemini");
    const tailored_bullets = await tailorResume(jobDescription, resumeBullets);
    if (tailored_bullets.length === 0) {
      return Response.json({ error: "AI returned no bullets, try again" }, { status: 500 });
    }
    return Response.json({ tailored_bullets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI tailoring failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
