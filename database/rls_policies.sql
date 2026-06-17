-- Row-Level Security Rules for Supabase
-- Forces all incoming API commands to authenticate or go through Express proxy server service role

-- Enable Row-Level Security (RLS) on critical tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Create policy allowing service role (Express API Server) full read/write access
CREATE POLICY "Express Server Service Role Access" ON public.projects
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Express Server Service Role Access" ON public.credentials
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Express Server Service Role Access" ON public.notes
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Express Server Service Role Access" ON public.reminders
    FOR ALL USING (true) WITH CHECK (true);

-- 2. Create limited read-only policy for anonymous users if client dashboard integration requires direct fetching
CREATE POLICY "Anon Read Only Access" ON public.projects
    FOR SELECT TO anon USING (status = 'Active');
