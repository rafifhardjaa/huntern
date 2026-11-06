-- Migration 006: deadlines + email reminders, resume library, interview prep
-- Run once in Supabase SQL Editor (or `supabase db push`).

-- ============ 1. DEADLINES & REMINDERS ============
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ NULL;

-- Cron queries upcoming deadlines for active applications only.
CREATE INDEX IF NOT EXISTS idx_job_applications_deadline
  ON public.job_applications (deadline)
  WHERE deadline IS NOT NULL AND status NOT IN ('offered', 'rejected');

-- ============ 2. AI OUTPUT PERSISTENCE ============
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS custom_resume_bullets TEXT NULL,
  ADD COLUMN IF NOT EXISTS interview_prep_questions JSONB NULL,
  ADD COLUMN IF NOT EXISTS interview_notes TEXT NULL;

-- ============ 3. RESUME LIBRARY ============
CREATE TABLE IF NOT EXISTS public.user_resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Resume',
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own resumes" ON public.user_resumes;
CREATE POLICY "Users manage own resumes"
ON public.user_resumes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- At most one default resume per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_resumes_default
  ON public.user_resumes (user_id)
  WHERE is_default;

GRANT ALL ON public.user_resumes TO anon, authenticated, service_role;
