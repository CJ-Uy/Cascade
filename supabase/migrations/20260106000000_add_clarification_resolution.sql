-- Migration: Add clarification resolution tracking
-- Date: 2026-01-06
-- Description: Adds the ability to track when clarification requests are resolved

-- 1. Add resolved_at and resolved_by columns to request_history
ALTER TABLE public.request_history
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_request_history_unresolved_clarifications
ON public.request_history(request_id, action)
WHERE action = 'REQUEST_CLARIFICATION' AND resolved_at IS NULL;

-- 3. Create RPC function to resolve a clarification request
CREATE OR REPLACE FUNCTION resolve_clarification_request(
    p_history_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_request_id UUID;
    v_action request_action;
BEGIN
    v_user_id := auth.uid();

    -- Get the history entry details
    SELECT request_id, action
    INTO v_request_id, v_action
    FROM public.request_history
    WHERE id = p_history_id;

    -- Verify it's a clarification request
    IF v_action != 'REQUEST_CLARIFICATION' THEN
        RAISE EXCEPTION 'This action is not a clarification request';
    END IF;

    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = v_request_id AND ubu.user_id = v_user_id
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = v_user_id AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to resolve this clarification.';
    END IF;

    -- Mark as resolved
    UPDATE public.request_history
    SET
        resolved_at = NOW(),
        resolved_by = v_user_id
    WHERE id = p_history_id;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_clarification_request(UUID) TO authenticated;

COMMENT ON FUNCTION resolve_clarification_request(UUID) IS 'Mark a clarification request as resolved. Returns void or raises an exception.';
