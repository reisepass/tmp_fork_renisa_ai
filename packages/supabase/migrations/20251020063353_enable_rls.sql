-- Enable RLS for all existing tables in the public schema
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'             -- ordinary tables
      AND n.nspname = 'public'        -- scope to public schema
      AND c.relrowsecurity = false    -- RLS currently disabled
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', r.tbl);
  END LOOP;
END$$;

-- Enable RLS by default for all newly created tables in this database
ALTER DATABASE postgres SET row_security = on;
