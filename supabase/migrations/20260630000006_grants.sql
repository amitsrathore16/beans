-- Grant full access to service_role (used by FastAPI)
GRANT ALL ON public.logs             TO service_role;
GRANT ALL ON public.beans            TO service_role;
GRANT ALL ON public.inventory_events TO service_role;

-- Grant access to authenticated role (used by PostgREST direct calls from frontend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beans            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_events TO authenticated;

-- Grant read access to anon role (required for PostgREST to function)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
