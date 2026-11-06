import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
});

export interface ExtractedJob {
  company_name: string;
  position_title: string;
  cover_letter: string;
}

const SYSTEM_PROMPT = `You are an assistant for a job application tracker. Given a job posting text, do two things:
1. Extract the company name and the position/job title.
2. Write a concise, professional cover letter draft (150-200 words, first person) tailored to that posting for an internship applicant.

Respond with ONLY a JSON object (no markdown fences, no extra text) in this exact shape:
{"company_name": "...", "position_title": "...", "cover_letter": "..."}
If a field cannot be determined, use an empty string for it.`;

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function generateCoverLetter(jobDescription: string): Promise<ExtractedJob> {
  const result = await geminiModel.generateContent(
    `${SYSTEM_PROMPT}\n\nJOB POSTING:\n${jobDescription}`
  );
  const parsed = JSON.parse(stripFences(result.response.text().trim())) as Partial<ExtractedJob>;

  return {
    company_name: parsed.company_name?.trim() ?? "",
    position_title: parsed.position_title?.trim() ?? "",
    cover_letter: parsed.cover_letter?.trim() ?? "",
  };
}

export interface ExtractedJobInput {
  company_name: string;
  position_title: string;
  job_description: string;
}

const EXTRACT_PROMPT = `You are a data extraction assistant for a job application tracker. Given raw text copied from a job board (it may contain navigation junk, ads, or formatting noise), extract the hiring company name and the position/job title.

Respond with ONLY a JSON object (no markdown fences, no extra text) in this exact shape:
{"company_name": "...", "position_title": "..."}
If a field cannot be determined, use an empty string for it.`;

export async function extractJobInput(rawText: string): Promise<ExtractedJobInput> {
  const result = await geminiModel.generateContent(
    `${EXTRACT_PROMPT}\n\nRAW JOB BOARD TEXT:\n${rawText}`
  );
  const parsed = JSON.parse(stripFences(result.response.text().trim())) as Partial<ExtractedJobInput>;

  return {
    company_name: parsed.company_name?.trim() ?? "",
    position_title: parsed.position_title?.trim() ?? "",
    job_description: rawText.trim().slice(0, 4000),
  };
}

const TAILOR_PROMPT = `You are a resume optimization assistant. Given a JOB POSTING and the applicant's current RESUME BULLET POINTS, rewrite the bullets so they mirror the posting's keywords, skills, and requirements while staying truthful to the original experience. Output 4-6 concise, metric-driven bullets starting with strong action verbs.

Respond with ONLY a JSON object (no markdown fences, no extra text) in this exact shape:
{"tailored_bullets": ["...", "..."]}`;

export async function tailorResume(
  jobDescription: string,
  resumeBullets: string
): Promise<string[]> {
  const result = await geminiModel.generateContent(
    `${TAILOR_PROMPT}\n\nJOB POSTING:\n${jobDescription}\n\nRESUME BULLET POINTS:\n${resumeBullets}`
  );
  const parsed = JSON.parse(stripFences(result.response.text().trim())) as {
    tailored_bullets?: string[];
  };

  return (parsed.tailored_bullets ?? []).map((b) => b.trim()).filter(Boolean);
}

const PREP_PROMPT = `You are an interview coach preparing a candidate for a specific role. Given the job posting, generate 8 realistic questions they are likely to be asked.

Split them into three categories:
- "behavioral": 3 questions about past experience, teamwork, conflict, and motivation. Answerable with the STAR method.
- "technical": 3 to 4 questions probing the specific skills and tools the posting asks for.
- "culture": 2 questions about fit, values, and why this company.

Keep each question under 25 words. Do not include answers.

Respond with ONLY a JSON object (no markdown fences, no extra text) in this exact shape:
{"questions": [{"type": "behavioral", "question": "..."}]}
Allowed types are exactly "behavioral", "technical", "culture".`;

const PREP_TYPES = ["behavioral", "technical", "culture"] as const;

export interface InterviewQuestion {
  type: (typeof PREP_TYPES)[number];
  question: string;
}

export async function generateInterviewQuestions(
  jobDescription: string,
  positionTitle: string,
  companyName: string
): Promise<InterviewQuestion[]> {
  const result = await geminiModel.generateContent(
    `${PREP_PROMPT}\n\nROLE: ${positionTitle}\nCOMPANY: ${companyName}\n\nJOB POSTING:\n${jobDescription}`
  );
  const parsed = JSON.parse(stripFences(result.response.text().trim())) as {
    questions?: { type?: string; question?: string }[];
  };

  return (parsed.questions ?? [])
    .filter((q): q is { type: string; question: string } => Boolean(q?.question?.trim()))
    .map((q) => ({
      type: PREP_TYPES.includes(q.type as InterviewQuestion["type"])
        ? (q.type as InterviewQuestion["type"])
        : "behavioral",
      question: q.question.trim(),
    }));
}
