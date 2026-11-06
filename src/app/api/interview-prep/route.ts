export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "AI is not configured. Set GEMINI_API_KEY in .env.local." },
      { status: 503 }
    );
  }

  let body: { jobDescription?: string; positionTitle?: string; companyName?: string };
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

  const positionTitle = body.positionTitle?.trim() || "this role";
  const companyName = body.companyName?.trim() || "the company";

  try {
    const { generateInterviewQuestions } = await import("@/lib/gemini");
    const questions = await generateInterviewQuestions(
      jobDescription,
      positionTitle,
      companyName
    );
    if (questions.length === 0) {
      return Response.json({ error: "AI returned no questions, try again" }, { status: 500 });
    }
    return Response.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
