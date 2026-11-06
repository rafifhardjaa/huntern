-- Add optional interview schedule to job applications.
-- Run this in the Supabase SQL Editor (one time).
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ NULL;
