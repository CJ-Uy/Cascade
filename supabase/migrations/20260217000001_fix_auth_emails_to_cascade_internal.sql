-- ============================================================================
-- Fix existing auth.users emails to use username@email.com
-- This allows username-based login to work for pre-existing users
-- ============================================================================

-- Update auth.users email to match username@email.com
-- Uses the username already set in profiles by the previous migration
UPDATE auth.users au
SET
    email = p.username || '@email.com',
    raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', p.username)
FROM public.profiles p
WHERE au.id = p.id
  AND p.username IS NOT NULL
  AND au.email NOT LIKE '%@email.com';

-- Also update the profiles email column to match
UPDATE public.profiles p
SET email = p.username || '@email.com'
WHERE p.username IS NOT NULL
  AND p.email NOT LIKE '%@email.com';
