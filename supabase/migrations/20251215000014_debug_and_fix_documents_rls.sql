-- Debug and fix documents RLS issue
-- First, let's check what policies exist and ensure RLS is enabled

-- Ensure RLS is enabled
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users and auditors can see documents in their scope" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents in their BU" ON public.documents;
DROP POLICY IF EXISTS "Initiators can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Initiators can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Initiators can create/manage their own documents" ON public.documents;

-- Create SELECT policy (for viewing documents)
CREATE POLICY "Users can view documents in their BU" ON public.documents
FOR SELECT
USING (
    -- Users can see documents in their BU
    EXISTS (
        SELECT 1 FROM public.user_business_units
        WHERE user_id = auth.uid()
        AND business_unit_id = documents.business_unit_id
    )
    OR
    -- System auditors can see all documents
    EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    )
    OR
    -- BU auditors can see documents from their assigned BUs
    EXISTS (
        SELECT 1
        FROM user_business_units ubu
        WHERE ubu.user_id = auth.uid()
        AND ubu.business_unit_id = documents.business_unit_id
        AND ubu.membership_type = 'AUDITOR'
    )
);

-- Create INSERT policy (simplified - just check user is member of BU)
CREATE POLICY "Users can create documents in their BU" ON public.documents
FOR INSERT
WITH CHECK (
    initiator_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_business_units
        WHERE user_id = auth.uid()
        AND business_unit_id = documents.business_unit_id
    )
);

-- Create UPDATE policy
CREATE POLICY "Users can update their own documents" ON public.documents
FOR UPDATE
USING (initiator_id = auth.uid())
WITH CHECK (
    initiator_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_business_units
        WHERE user_id = auth.uid()
        AND business_unit_id = documents.business_unit_id
    )
);

-- Create DELETE policy
CREATE POLICY "Users can delete their own documents" ON public.documents
FOR DELETE
USING (initiator_id = auth.uid());
