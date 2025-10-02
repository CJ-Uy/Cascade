-- Grant basic schema usage to the standard Supabase roles
grant usage on schema storage to postgres, anon, authenticated, service_role;

-- Grant ALL privileges on ALL existing objects in the schema
grant all on all tables in schema storage to postgres, anon, authenticated, service_role;
grant all on all functions in schema storage to postgres, anon, authenticated, service_role;
grant all on all sequences in schema storage to postgres, anon, authenticated, service_role;

-- Grant ALL privileges on ALL FUTURE objects in the schema
alter default privileges in schema storage grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema storage grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema storage grant all on sequences to postgres, anon, authenticated, service_role;