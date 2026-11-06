-- Migration 005: job hunt expense tracker
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  category TEXT NOT NULL DEFAULT 'other',
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expenses" ON public.expenses;
CREATE POLICY "Users manage own expenses"
ON public.expenses FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.expenses TO anon, authenticated, service_role;
