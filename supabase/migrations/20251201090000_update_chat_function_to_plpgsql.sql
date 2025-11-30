-- Update chat participant check function to use plpgsql for proper RLS bypass
-- Migration: 20251201090000_update_chat_function_to_plpgsql.sql
-- Date: 2025-12-01
-- Description: Replace SQL function with PLPGSQL to properly bypass RLS

-- Replace the function with plpgsql version
CREATE OR REPLACE FUNCTION public.is_user_in_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Explicitly bypass RLS for this lookup
  -- SECURITY DEFINER + plpgsql runs with function owner's privileges (postgres)
  SELECT EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE chat_id = p_chat_id
      AND user_id = p_user_id
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_user_in_chat(UUID, UUID) TO authenticated;
