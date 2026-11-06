<div align="center">

# Huntern

**Job Hunt OS** — a Kanban tracker for internship applications, with AI doing the repetitive parts.

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-4285F4?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev)

[![Last commit](https://img.shields.io/github/last-commit/rafifhardjaa/huntern?style=flat-square&color=4F46E5)](https://github.com/rafifhardjaa/huntern/commits/main)
[![License](https://img.shields.io/badge/License-MIT-4F46E5?style=flat-square)](LICENSE)

</div>

## Features

- **Kanban tracking** — Wishlist → Applied → Interview → Offered / Rejected, with drag & drop
- **AI assistance** — cover letters, smart job extraction, resume tailoring, interview prep
- **Deadline reminders** — daily cron emails 3 days and 1 day before a deadline
- **Resume library** — import PDF/DOCX or paste text; parsing stays in the browser
- **Chrome extension** — one-click clipping from LinkedIn, Indeed, Glints and more
- **Extras** — offer polls, resume link shortener, document vault, expense tracker

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Data | Supabase (PostgreSQL, Auth, RLS) |
| AI | Google Gemini |
| Email & cron | Resend, Vercel Cron |
| Extension | Chrome MV3 |

## Quick start

```bash
git clone https://github.com/rafifhardjaa/huntern.git
cd huntern
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`:

| Variable | Source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server only) |
| `GEMINI_API_KEY` | [AI Studio](https://aistudio.google.com/apikey) |
| `RESEND_API_KEY` | [Resend](https://resend.com/api-keys) |
| `NEXT_PUBLIC_APP_URL` | Deployed URL, used in email links |

Optional: `GEMINI_MODEL` (defaults to `gemini-1.5-flash`) and `CRON_SECRET` (protects the cron route).

Apply the migrations in `supabase/migrations/` in order:

```bash
npx supabase db push
```

## Chrome extension

Open `chrome://extensions`, enable Developer mode, and **Load unpacked** → `extension/`. Then paste
your User ID from **Settings → Clipper Setup**. To use a deployed API, update `API_BASE` in
`extension/popup.js` and `host_permissions` in `extension/manifest.json`.

## Deploy

Import the repo on Vercel, add the environment variables, and run the migrations against the
production database. `vercel.json` already schedules the reminder cron at `09:00 UTC`.

## License

MIT
