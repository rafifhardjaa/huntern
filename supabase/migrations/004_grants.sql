-- Migration 004: table-level privileges for Super App tables.
-- (RLS policies alone are not enough; roles need GRANTs first.)
GRANT ALL ON public.resume_links TO anon, authenticated, service_role;
GRANT ALL ON public.link_clicks TO anon, authenticated, service_role;
GRANT ALL ON public.offer_polls TO anon, authenticated, service_role;
GRANT ALL ON public.poll_options TO anon, authenticated, service_role;
GRANT ALL ON public.documents TO anon, authenticated, service_role;
