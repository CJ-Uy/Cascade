-- Ensure documents table has INSERT policy for initiators
-- Drop if exists and recreate to ensure it's correct

DROP POLICY IF EXISTS "Initiators can create/manage their own documents" ON public.documents;

CREATE POLICY "Initiators can create/manage their own documents" ON public.documents
FOR ALL USING (initiator_id = auth.uid())
WITH CHECK (
    initiator_id = auth.uid() AND
    is_member_of_bu(business_unit_id)
);
