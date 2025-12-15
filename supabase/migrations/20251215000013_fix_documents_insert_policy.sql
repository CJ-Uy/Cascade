-- Fix documents table RLS policies
-- The issue: "FOR ALL" with USING clause doesn't work properly for INSERT
-- Solution: Split into separate policies for different operations

-- Drop the existing "FOR ALL" policy
DROP POLICY IF EXISTS "Initiators can create/manage their own documents" ON public.documents;

-- Create separate policy for INSERT (uses WITH CHECK only)
CREATE POLICY "Users can insert documents in their BU" ON public.documents
FOR INSERT
WITH CHECK (
    initiator_id = auth.uid() AND
    is_member_of_bu(business_unit_id)
);

-- Create separate policy for UPDATE/DELETE (uses USING and WITH CHECK)
CREATE POLICY "Initiators can update their own documents" ON public.documents
FOR UPDATE
USING (initiator_id = auth.uid())
WITH CHECK (
    initiator_id = auth.uid() AND
    is_member_of_bu(business_unit_id)
);

-- Create policy for DELETE
CREATE POLICY "Initiators can delete their own documents" ON public.documents
FOR DELETE
USING (initiator_id = auth.uid());
