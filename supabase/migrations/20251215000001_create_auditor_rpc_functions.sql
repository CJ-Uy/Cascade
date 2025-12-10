-- Migration: Create Auditor RPC Functions
-- Date: 2025-12-15
-- Description: Creates RPC functions for auditor access control and document retrieval.
--              Functions follow existing patterns from is_super_admin(), get_document_details(), etc.

-- ============================================================================
-- HELPER FUNCTION: Check if user is an auditor
-- ============================================================================

CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a system auditor (role with scope='AUDITOR' or scope='SYSTEM' with name='AUDITOR')
  IF EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a BU auditor (membership_type='AUDITOR' in user_business_units)
  IF EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.membership_type = 'AUDITOR'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION is_auditor() IS 'Checks if the current user is an auditor (system or BU level)';

-- ============================================================================
-- DATA ACCESS FUNCTION: Get documents for auditors with filters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auditor_documents(
    p_tag_ids UUID[] DEFAULT NULL,
    p_status_filter public.document_status DEFAULT NULL,
    p_search_text TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    status public.document_status,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    template_id UUID,
    template_name TEXT,
    initiator_id UUID,
    initiator_name TEXT,
    initiator_email TEXT,
    business_unit_id UUID,
    business_unit_name TEXT,
    organization_id UUID,
    organization_name TEXT,
    tags JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_system_auditor BOOLEAN;
    v_accessible_bu_ids UUID[];
BEGIN
    -- Security check: User must be an auditor
    IF NOT is_auditor() THEN
        RAISE EXCEPTION 'Access Denied: User is not an auditor';
    END IF;

    -- Determine if user is a system auditor
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    ) INTO v_is_system_auditor;

    -- Get accessible BU IDs for BU auditors
    IF NOT v_is_system_auditor THEN
        SELECT ARRAY_AGG(business_unit_id)
        INTO v_accessible_bu_ids
        FROM user_business_units
        WHERE user_id = auth.uid()
        AND membership_type = 'AUDITOR';
    END IF;

    -- Return documents with filters
    RETURN QUERY
    SELECT
        d.id,
        d.status,
        d.created_at,
        d.updated_at,
        d.form_template_id as template_id,
        ft.name as template_name,
        d.initiator_id,
        (p.first_name || ' ' || COALESCE(p.last_name, '')) as initiator_name,
        p.email as initiator_email,
        d.business_unit_id,
        bu.name as business_unit_name,
        d.organization_id,
        o.name as organization_name,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', t.id,
                        'label', t.label,
                        'color', t.color
                    )
                )
                FROM document_tags dt
                JOIN tags t ON t.id = dt.tag_id
                WHERE dt.document_id = d.id
            ),
            '[]'::jsonb
        ) as tags
    FROM public.documents d
    JOIN public.form_templates ft ON d.form_template_id = ft.id
    JOIN public.profiles p ON d.initiator_id = p.id
    JOIN public.business_units bu ON d.business_unit_id = bu.id
    JOIN public.organizations o ON d.organization_id = o.id
    WHERE
        -- Scope filtering: System auditors see all, BU auditors see only their BUs
        (v_is_system_auditor OR d.business_unit_id = ANY(v_accessible_bu_ids))
        -- Status filter
        AND (p_status_filter IS NULL OR d.status = p_status_filter)
        -- Search filter (template name or initiator name)
        AND (
            p_search_text IS NULL OR
            ft.name ILIKE '%' || p_search_text || '%' OR
            (p.first_name || ' ' || COALESCE(p.last_name, '')) ILIKE '%' || p_search_text || '%'
        )
        -- Tag filter (if any tag_ids provided, document must have at least one of those tags)
        AND (
            p_tag_ids IS NULL OR
            EXISTS (
                SELECT 1
                FROM document_tags dt
                WHERE dt.document_id = d.id
                AND dt.tag_id = ANY(p_tag_ids)
            )
        )
    ORDER BY d.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_auditor_documents(UUID[], public.document_status, TEXT) IS 
'Returns documents accessible to the current auditor with optional filters. System auditors see all documents, BU auditors see only documents from their assigned BUs.';

GRANT EXECUTE ON FUNCTION get_auditor_documents(UUID[], public.document_status, TEXT) TO authenticated;

-- ============================================================================
-- DATA ACCESS FUNCTION: Get single document details for auditor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auditor_document_details(p_document_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    document_data JSON;
    template_fields_data JSON;
    tags_data JSON;
    history_data JSON;
    comments_data JSON;
    v_is_system_auditor BOOLEAN;
    v_accessible_bu_ids UUID[];
    v_document_bu_id UUID;
BEGIN
    -- Security check: User must be an auditor
    IF NOT is_auditor() THEN
        RAISE EXCEPTION 'Access Denied: User is not an auditor';
    END IF;

    -- Get document's business unit ID
    SELECT business_unit_id INTO v_document_bu_id
    FROM public.documents
    WHERE id = p_document_id;

    IF v_document_bu_id IS NULL THEN
        RAISE EXCEPTION 'Document not found';
    END IF;

    -- Determine if user is a system auditor
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    ) INTO v_is_system_auditor;

    -- Check access: System auditor or BU auditor with access to this document's BU
    IF NOT v_is_system_auditor THEN
        IF NOT EXISTS (
            SELECT 1
            FROM user_business_units
            WHERE user_id = auth.uid()
            AND business_unit_id = v_document_bu_id
            AND membership_type = 'AUDITOR'
        ) THEN
            RAISE EXCEPTION 'Access Denied: You do not have access to this document';
        END IF;
    END IF;

    -- Aggregate document details
    SELECT to_json(d) INTO document_data FROM (
        SELECT
            doc.*,
            ft.name as template_name,
            ft.id as template_id,
            initiator.first_name as initiator_first_name,
            initiator.last_name as initiator_last_name,
            initiator.email as initiator_email,
            bu.name as business_unit_name,
            o.name as organization_name
        FROM public.documents doc
        JOIN public.form_templates ft ON doc.form_template_id = ft.id
        JOIN public.profiles initiator ON doc.initiator_id = initiator.id
        JOIN public.business_units bu ON doc.business_unit_id = bu.id
        JOIN public.organizations o ON doc.organization_id = o.id
        WHERE doc.id = p_document_id
    ) d;

    -- Aggregate template fields
    SELECT json_agg(
        json_build_object(
            'id', ff.id,
            'name', ff.name,
            'label', ff.label,
            'field_type', ff.field_type,
            'order', ff.order,
            'is_required', ff.is_required,
            'options', ff.options,
            'placeholder', ff.placeholder
        )
        ORDER BY ff.order
    ) INTO template_fields_data
    FROM public.form_fields ff
    WHERE ff.template_id = (SELECT form_template_id FROM public.documents WHERE id = p_document_id);

    -- Aggregate tags
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'label', t.label,
            'color', t.color,
            'assigned_by_id', dt.assigned_by_id,
            'assigned_at', dt.assigned_at
        )
    ) INTO tags_data
    FROM document_tags dt
    JOIN tags t ON t.id = dt.tag_id
    WHERE dt.document_id = p_document_id;

    -- Aggregate history
    SELECT json_agg(
        json_build_object(
            'id', dh.id,
            'action', dh.action,
            'actor_id', dh.actor_id,
            'actor_first_name', actor.first_name,
            'actor_last_name', actor.last_name,
            'comments', dh.comments,
            'from_step_id', dh.from_step_id,
            'to_step_id', dh.to_step_id,
            'created_at', dh.created_at
        )
        ORDER BY dh.created_at ASC
    ) INTO history_data
    FROM public.document_history dh
    JOIN public.profiles actor ON dh.actor_id = actor.id
    WHERE dh.document_id = p_document_id;

    -- Aggregate comments
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'content', c.content,
            'author_id', c.author_id,
            'author_first_name', author.first_name,
            'author_last_name', author.last_name,
            'created_at', c.created_at,
            'parent_comment_id', c.parent_comment_id
        )
        ORDER BY c.created_at ASC
    ) INTO comments_data
    FROM public.comments c
    JOIN public.profiles author ON c.author_id = author.id
    WHERE c.document_id = p_document_id;

    -- Return structured JSON
    RETURN json_build_object(
        'document', document_data,
        'template_fields', COALESCE(template_fields_data, '[]'::json),
        'tags', COALESCE(tags_data, '[]'::json),
        'history', COALESCE(history_data, '[]'::json),
        'comments', COALESCE(comments_data, '[]'::json)
    );
END;
$$;

COMMENT ON FUNCTION get_auditor_document_details(UUID) IS 
'Returns complete document details for an auditor, including template fields, tags, history, and comments. Validates auditor access before returning data.';

GRANT EXECUTE ON FUNCTION get_auditor_document_details(UUID) TO authenticated;

