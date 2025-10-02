-- Revoke the permissions that were granted in the previous migration
revoke usage on schema storage from postgres, anon, authenticated, service_role;

revoke all on all tables in schema storage from postgres, anon, authenticated, service_role;
revoke all on all functions in schema storage from postgres, anon, authenticated, service_role;
revoke all on all sequences in schema storage from postgres, anon, authenticated, service_role;

alter default privileges in schema storage revoke all on tables from postgres, anon, authenticated, service_role;
alter default privileges in schema storage revoke all on functions from postgres, anon, authenticated, service_role;
alter default privileges in schema storage revoke all on sequences from postgres, anon, authenticated, service_role;