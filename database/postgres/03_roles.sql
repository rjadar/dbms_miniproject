-- Run as a database administrator. Passwords are intentionally not embedded.
DO $$ BEGIN CREATE ROLE impact_admin NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE impact_developer NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects, components, dependency_edges, impact_analyses TO impact_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO impact_admin;
GRANT SELECT ON projects, components, dependency_edges, impact_analyses TO impact_developer;
GRANT INSERT ON impact_analyses TO impact_developer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO impact_developer;
