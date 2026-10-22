-- NIVASA: Bootstrap Super Admin Role
-- 
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- to assign the super_admin role to the designated account.
--
-- This sets app_metadata.role which is the TRUSTED source of role information.
-- Users cannot modify their own app_metadata — only the service-role key or
-- the SQL Editor (which uses the postgres role) can set it.
--
-- SAFE TO RE-RUN: This is idempotent. Running it multiple times has no effect
-- beyond the first successful execution.
--
-- ⚠️  Replace the email below ONLY if your super admin email is different.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'shreyankvy@gmail.com';

-- Verify the update
SELECT id, email, raw_app_meta_data->>'role' AS role
FROM auth.users
WHERE email = 'shreyankvy@gmail.com';
