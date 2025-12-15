-- Temporarily disable RLS on documents table to test if that's the issue
-- We'll re-enable it once we confirm the real problem

ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
