import type { JobStatus } from "@/types/database";
import { JOB_STATUSES } from "@/types/database";

const COMPANIES = [
  "Tokopedia",
  "Gojek",
  "Shopee",
  "Traveloka",
  "Bukalapak",
  "OVO",
  "Dana",
  "Ruangguru",
];

const POSITIONS = [
  "Frontend Developer Intern",
  "Backend Engineer Intern",
  "UI/UX Design Intern",
  "Data Analyst Intern",
  "Mobile Developer Intern",
  "QA Engineer Intern",
];

const DESCRIPTIONS = [
  "Build responsive interfaces with React and Next.js. Collaborate with designers and ship features to millions of users.",
  "Design and maintain REST APIs with Node.js and PostgreSQL. Write tests and review pull requests.",
  "Create wireframes and prototypes in Figma. Run usability tests and iterate on feedback.",
  "Analyze product metrics with SQL and Python. Build dashboards and present insights weekly.",
];

const LETTERS = [
  "I am excited to apply for this internship. My coursework and personal projects align closely with the requirements, and I learn new stacks quickly.",
  null,
  "As a final-year student passionate about product development, I would love to contribute while growing alongside your engineering team.",
  null,
];

// Deterministic PRNG so recruiters get stable fixtures per seed
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakeId(rand: () => number): string {
  const hex = () =>
    Math.floor(rand() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
  const h = hex() + hex() + hex() + hex();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// GET /api/dev/jobs?count=5&seed=42 -> deterministic fake job cards
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(Math.max(parseInt(searchParams.get("count") ?? "5", 10) || 5, 1), 25);
  const seedParam = parseInt(searchParams.get("seed") ?? "", 10);
  const seed = Number.isFinite(seedParam) ? seedParam : 42;
  const rand = mulberry32(seed);

  const now = Date.now();
  const jobs = Array.from({ length: count }, (_, i) => {
    const status = JOB_STATUSES[Math.floor(rand() * JOB_STATUSES.length)] as JobStatus;
    const created = new Date(now - Math.floor(rand() * 30) * 24 * 3600 * 1000).toISOString();
    return {
      id: fakeId(rand),
      company_name: COMPANIES[Math.floor(rand() * COMPANIES.length)],
      position_title: POSITIONS[Math.floor(rand() * POSITIONS.length)],
      status,
      job_description: DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)],
      ai_cover_letter: LETTERS[Math.floor(rand() * LETTERS.length)],
      created_at: created,
      updated_at: created,
      _mock: true,
      _index: i,
    };
  });

  return Response.json({ count: jobs.length, seed, jobs });
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

type Rand = () => number;

const PLACEHOLDER_FNS: Record<string, (rand: Rand) => JsonValue> = {
  $id: (rand) => fakeId(rand),
  $company: (rand) => COMPANIES[Math.floor(rand() * COMPANIES.length)],
  $position: (rand) => POSITIONS[Math.floor(rand() * POSITIONS.length)],
  $status: (rand) => JOB_STATUSES[Math.floor(rand() * JOB_STATUSES.length)],
  $description: (rand) => DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)],
  $letter: (rand) => LETTERS[Math.floor(rand() * LETTERS.length)],
  $date: (rand) =>
    new Date(Date.now() - Math.floor(rand() * 30) * 24 * 3600 * 1000).toISOString(),
};

function renderString(template: string, rand: Rand): JsonValue {
  // Exact placeholder keeps its native type (e.g. null letter)
  if (Object.hasOwn(PLACEHOLDER_FNS, template)) {
    return PLACEHOLDER_FNS[template](rand);
  }
  // Embedded placeholders interpolate as text
  return template.replace(
    /\$(id|company|position|status|description|letter|date)\b/g,
    (match) => String(PLACEHOLDER_FNS[match](rand) ?? "")
  );
}

function renderTemplate(node: JsonValue, rand: Rand): JsonValue {
  if (typeof node === "string") return renderString(node, rand);
  if (Array.isArray(node)) return node.map((item) => renderTemplate(item, rand));
  if (node !== null && typeof node === "object") {
    const out: JsonObject = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = renderTemplate(value, rand);
    }
    return out;
  }
  return node;
}

// POST /api/dev/jobs { template, count?, seed? } -> array of rendered templates.
// Template supports $id $company $position $status $description $letter $date,
// either as whole values (native types kept) or embedded in strings.
export async function POST(request: Request) {
  let body: { template?: JsonValue; count?: number; seed?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.template === undefined || body.template === null) {
    return Response.json({ error: "template (JSON object or array) required" }, { status: 400 });
  }
  if (typeof body.template !== "object") {
    return Response.json({ error: "template must be a JSON object or array" }, { status: 400 });
  }

  const count = Math.min(Math.max(Math.floor(Number(body.count) || 1), 1), 25);
  const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : 42;
  const rand = mulberry32(seed);

  const items = Array.from({ length: count }, () => renderTemplate(body.template as JsonValue, rand));
  return Response.json({
    count: items.length,
    seed,
    placeholders: Object.keys(PLACEHOLDER_FNS),
    items,
  });
}
