-- Simplify documents INSERT policy - just allow authenticated users to create documents
-- They must set themselves as initiator, but we don't check BU membership in the policy

DROP POLICY IF EXISTS "Users can create documents in their BU" ON public.documents;

CREATE POLICY "Authenticated users can create documents" ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (initiator_id = auth.uid());
