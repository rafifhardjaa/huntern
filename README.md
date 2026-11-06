# Huntern — Job Hunt OS

A Kanban-based tracker for internship applications, with AI doing the repetitive parts:
it writes the cover letter, tailors your resume bullets, generates interview questions, and
emails you before a deadline hits.

Built as a portfolio project. The design language follows a "Modern Soft SaaS" style:
indigo `#4F46E5` primary, white surfaces on a `#F9FAFB` canvas, hairline
`#E5E7EB` borders, `rounded-xl` containers, soft blur shadows only, Inter throughout.

---

## Features

**Tracking**
- Drag-and-drop Kanban board across Wishlist → Applied → Interview → Offered / Rejected (`dnd-kit`)
- Search, status filter, sort, and an "Expiring soon" filter for deadlines inside 7 days
- Interview scheduling with a date, and a notes field for post-interview reflection
- Dashboard analytics: status breakdown, distribution, weekly application volume, pipeline funnel, conversion rate, and average days-to-interview

**AI (Google Gemini)**
- **Cover letter** — paste a posting, get a tailored draft
- **Smart extract** — dump raw job-board text, get company / title / description filled in
- **Resume tailor** — rewrites your bullets using the posting's keywords, result saved per job
- **Interview prep** — generates behavioural, technical, and culture questions from the posting

**Deadlines and reminders**
- Optional deadline per application, surfaced as a colour-coded badge on the card
- A daily cron job emails you 3 days and 1 day before a deadline, grouped per user
- Responsive HTML email built from the same design tokens as the app

**Resume library**
- Save a base resume once (PDF, DOCX, or pasted text), mark one as default
- PDF/DOCX parsing runs entirely in the browser — the file never leaves the device
- The resume tailor prefills from your default resume, so you stop re-pasting bullets

**Chrome extension (Manifest V3)**
- One-click clip from LinkedIn, Indeed, Glints, Jobstreet, Kalibrr, or any page
- Reads the posting, strips sign-in/cookie noise, sends it to `/api/clipper`, and the job lands in Wishlist
- Falls back to splitting the page title when AI extraction comes back empty

**Also included**
- Offer polls — share a poll link so friends can vote on which offer to take
- Resume link shortener with click analytics
- Document vault and an expense tracker for the job hunt itself

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server routes for the AI + cron in the same deploy |
| UI | React 19, Tailwind CSS 4 | Design tokens live in the utility classes |
| Drag & drop | dnd-kit | Small, accessible, no HTML5 drag quirks |
| Charts | Recharts | Composable, already responsive |
| Database | Supabase (PostgreSQL) + RLS | Relational data, row-level security per user |
| Auth | Supabase Auth | Email/password, JWT verified server-side |
| AI | Google Gemini (`gemini-1.5-flash`) | Fast, cheap, structured JSON output |
| Email | Resend | Simple API, 3k free emails/month |
| Scheduling | Vercel Cron | No separate worker to deploy |
| Extension | Chrome MV3 | No build step — plain `manifest.json` + JS |

---

## Getting started

```bash
git clone https://github.com/<your-username>/huntern.git
cd huntern
npm install
cp .env.example .env.local     # then fill in the keys below
```

**Environment variables**

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server only) |
| `GEMINI_API_KEY` | <https://aistudio.google.com/apikey> |
| `GEMINI_MODEL` | Optional, defaults to `gemini-1.5-flash` |
| `RESEND_API_KEY` | <https://resend.com/api-keys> |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL; used in the reminder email CTA |
| `CRON_SECRET` | Optional; if set, the cron route requires `Authorization: Bearer <secret>` |

**Database**

Migrations live in `supabase/migrations/` and are all idempotent, so run them in order:

```bash
npx supabase db push          # or paste each file into the Supabase SQL editor
```

| File | Adds |
| --- | --- |
| `002_add_interview_date.sql` | `interview_date` column |
| `003_super_app.sql` | Resume links, offer polls, documents |
| `004_grants.sql` | Table grants |
| `005_expenses.sql` | Expense tracker |
| `006_deadlines_resume_prep.sql` | Deadlines, AI output columns, resume library |

**Run it**

```bash
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

---

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/clipper` | POST | Extension → parse a posting with AI, save as wishlist |
| `/api/extract-job` | POST | Raw text → company / title / description |
| `/api/generate-cover-letter` | POST | Job description → cover letter |
| `/api/tailor-resume` | POST | Job description + bullets → tailored bullets |
| `/api/interview-prep` | POST | Job description → categorised interview questions |
| `/api/resumes` | GET / POST / DELETE | Resume library CRUD |
| `/api/reminders/check` | GET | Cron target: sends deadline reminder emails |
| `/api/reminders/preview` | GET | Renders the reminder email with sample data |
| `/api/links` · `/api/polls` · `/api/expenses` | GET / POST / DELETE | Supporting features |

---

## Chrome extension

```bash
open chrome://extensions     # enable Developer mode
# "Load unpacked" → select the extension/ folder
```

Then copy your User ID from **Huntern → Settings → Clipper Setup** and paste it into the
extension popup. The ID is stored in `chrome.storage.local` for that browser only.

To point the extension at a deployed instance instead of localhost, edit `API_BASE` at the top
of `extension/popup.js` and add the host to `host_permissions` in `extension/manifest.json`.

---

## Deployment

1. Push the repo to GitHub and import it into Vercel.
2. Add every variable from the table above in the Vercel dashboard.
3. `vercel.json` already declares the cron:

   ```json
   { "crons": [{ "path": "/api/reminders/check", "schedule": "0 9 * * *" }] }
   ```

   Vercel's Hobby plan allows one cron per day, which is all this needs.
4. Run the migrations against the production Supabase project.
5. Verify the email template locally any time with `/api/reminders/preview`.

---

## Things worth knowing

- **The pipeline funnel approximates history.** Only the current status is stored, so a rejected
  card is counted as having reached every earlier stage. Labeled "reached at least this stage" in
  the UI rather than pretending it is exact.
- **PDF resume parsing is best-effort.** Multi-column and image-based PDFs extract badly, so the
  parser returns a warning and the UI always lets you review and edit the text before saving.
- **Extension auth is a User ID, not OAuth.** Full OAuth in an extension means a redirect dance
  for a single-user tool. The ID is a UUID, hard to guess, and scoped by a server-side lookup.
- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** It is only read in API routes and the cron; never
  ship it to the browser.

---

## Design notes

The visual language follows a "Modern Soft SaaS" system. The rules that mattered most while
building:

- No square corners — `rounded-lg` for controls, `rounded-xl` for containers and modals
- Soft blur shadows only (`shadow-sm` / `md` / `xl`); no hard offset shadows
- Hairline `#E5E7EB` borders instead of heavy dividers
- Sentence case headings, Inter, `font-semibold` at 600 for titles and 700 for page headings
- Motion is `duration-200 ease-in-out`, and every interactive element respects
  `motion-reduce`

---

## License

MIT — use it for your own job hunt.
