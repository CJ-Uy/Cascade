-- Migration: Add RLS Policies for Auditor Access
-- Date: 2025-12-15
-- Description: Adds Row Level Security policies for document_tags table and updates documents policies to include auditors.

-- ============================================================================
-- DOCUMENT_TAGS RLS POLICIES
-- ============================================================================

-- Note: These policies may already exist from migration 20251211040014_remote_schema.sql
-- We'll drop and recreate to ensure they have the correct definition

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Auditors can view tags on accessible documents" ON public.document_tags;
DROP POLICY IF EXISTS "Auditors can assign tags to accessible documents" ON public.document_tags;

-- Only create policies if document_tags table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_tags' AND table_schema = 'public') THEN
    -- SELECT Policy: Auditors can view tags on documents they have access to
    CREATE POLICY "Auditors can view tags on accessible documents" ON public.document_tags
    FOR SELECT
    USING (
        -- User must be an auditor
        is_auditor()
        AND
        -- Document must be accessible (checked via get_auditor_documents logic)
        EXISTS (
            SELECT 1
            FROM public.documents d
            WHERE d.id = document_tags.document_id
            AND (
                -- System auditor can see all
                EXISTS (
                    SELECT 1
                    FROM user_role_assignments ura
                    JOIN roles r ON r.id = ura.role_id
                    WHERE ura.user_id = auth.uid()
                    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
                )
                OR
                -- BU auditor can see documents from their BUs
                EXISTS (
                    SELECT 1
                    FROM user_business_units ubu
                    WHERE ubu.user_id = auth.uid()
                    AND ubu.business_unit_id = d.business_unit_id
                    AND ubu.membership_type = 'AUDITOR'
                )
            )
        )
    );

    -- INSERT Policy: Auditors can assign tags to documents they have access to
    CREATE POLICY "Auditors can assign tags to accessible documents" ON public.document_tags
    FOR INSERT
    WITH CHECK (
        -- User must be an auditor
        is_auditor()
        AND
        -- User must be the assigner
        assigned_by_id = auth.uid()
        AND
        -- Document must be accessible
        EXISTS (
            SELECT 1
            FROM public.documents d
            WHERE d.id = document_tags.document_id
            AND (
                -- System auditor can see all
                EXISTS (
                    SELECT 1
                    FROM user_role_assignments ura
                    JOIN roles r ON r.id = ura.role_id
                    WHERE ura.user_id = auth.uid()
                    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
                )
                OR
                -- BU auditor can see documents from their BUs
                EXISTS (
                    SELECT 1
                    FROM user_business_units ubu
                    WHERE ubu.user_id = auth.uid()
                    AND ubu.business_unit_id = d.business_unit_id
                    AND ubu.membership_type = 'AUDITOR'
                )
            )
        )
    );

    -- DELETE Policy: Auditors can remove only tags they assigned
    CREATE POLICY "Auditors can remove tags they assigned" ON public.document_tags
    FOR DELETE
    USING (
        -- User must be an auditor
        is_auditor()
        AND
        -- User must have assigned the tag
        assigned_by_id = auth.uid()
        AND
        -- Document must still be accessible (defensive check)
        EXISTS (
            SELECT 1
            FROM public.documents d
            WHERE d.id = document_tags.document_id
            AND (
                -- System auditor can see all
                EXISTS (
                    SELECT 1
                    FROM user_role_assignments ura
                    JOIN roles r ON r.id = ura.role_id
                    WHERE ura.user_id = auth.uid()
                    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
                )
                OR
                -- BU auditor can see documents from their BUs
                EXISTS (
                    SELECT 1
                    FROM user_business_units ubu
                    WHERE ubu.user_id = auth.uid()
                    AND ubu.business_unit_id = d.business_unit_id
                    AND ubu.membership_type = 'AUDITOR'
                )
            )
        )
    );
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTS RLS POLICY UPDATE
-- ============================================================================

-- Add auditor access to existing documents SELECT policy
-- Note: This policy may already exist from migration 20251211040014_remote_schema.sql
-- We'll drop and recreate to ensure it has the correct definition

-- Only create policy if documents table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    -- Drop the existing policies if they exist
    DROP POLICY IF EXISTS "Users can see documents in their BU" ON public.documents;
    DROP POLICY IF EXISTS "Users and auditors can see documents in their scope" ON public.documents;

    -- Create new policy that includes auditors
    CREATE POLICY "Users and auditors can see documents in their scope" ON public.documents
    FOR SELECT
    USING (
        -- Existing members can see documents in their BU
        is_member_of_bu(business_unit_id)
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
  END IF;
END $$;

-- ============================================================================
-- TAGS RLS POLICY UPDATE
-- ============================================================================

-- Tags table already has RLS enabled and a "Enable read access for all users" SELECT policy
-- We'll add an INSERT policy for auditors to create tags
-- The existing SELECT policy already allows all authenticated users to view tags

-- INSERT Policy: Auditors can create tags
-- Drop if exists to allow re-running migration
DROP POLICY IF EXISTS "Auditors can create tags" ON public.tags;

CREATE POLICY "Auditors can create tags" ON public.tags
FOR INSERT
WITH CHECK (
    -- User must be an auditor
    is_auditor()
    AND
    -- User must be the creator
    creator_id = auth.uid()
);

COMMENT ON POLICY "Auditors can create tags" ON public.tags IS 'Allows auditors to create new tags for document categorization';

