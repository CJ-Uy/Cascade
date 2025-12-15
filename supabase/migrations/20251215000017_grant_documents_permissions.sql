-- Grant table-level permissions to authenticated role
-- This is separate from RLS policies - the role needs table access first

-- Grant all permissions to authenticated users on documents table
GRANT ALL ON public.documents TO authenticated;

-- Also grant usage on the documents_id_seq sequence (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-enable RLS now that we have proper grants
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
