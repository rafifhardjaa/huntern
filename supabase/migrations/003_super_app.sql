-- Migration 003: Super App features (links, polls, documents)

-- ============ 1. RESUME LINK SHORTENER ============
CREATE TABLE IF NOT EXISTS public.resume_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.resume_links(id) ON DELETE CASCADE NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_agent TEXT,
  device_type TEXT
);

ALTER TABLE public.resume_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own links" ON public.resume_links;
CREATE POLICY "Users manage own links"
ON public.resume_links FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- link_clicks: no public policies (service_role writes/reads via API routes).

-- ============ 2. OFFER POLLS ============
CREATE TABLE IF NOT EXISTS public.offer_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.offer_polls(id) ON DELETE CASCADE NOT NULL,
  job_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.offer_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

-- Public read so shareable guest links work (polls are public by design)
DROP POLICY IF EXISTS "Public read polls" ON public.offer_polls;
CREATE POLICY "Public read polls" ON public.offer_polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read poll options" ON public.poll_options;
CREATE POLICY "Public read poll options" ON public.poll_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own polls" ON public.offer_polls;
CREATE POLICY "Users manage own polls"
ON public.offer_polls FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Votes are written via service_role API route (no public write policy).

-- Realtime for live vote updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'poll_options'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
  END IF;
END $$;

-- ============ 3. DOCUMENTS ============
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own documents" ON public.documents;
CREATE POLICY "Users manage own documents"
ON public.documents FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket policies (bucket itself created via API)
DROP POLICY IF EXISTS "Users upload own docs" ON storage.objects;
CREATE POLICY "Users upload own docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own docs" ON storage.objects;
CREATE POLICY "Users read own docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own docs" ON storage.objects;
CREATE POLICY "Users delete own docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
