CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','developer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'service',
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name),
  CONSTRAINT components_project_id_id_key UNIQUE(project_id, id)
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='components'::regclass AND conname='components_project_id_id_key') THEN
    ALTER TABLE components ADD CONSTRAINT components_project_id_id_key UNIQUE(project_id, id);
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS dependency_edges (
  project_id INTEGER NOT NULL,
  source_component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  target_component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  PRIMARY KEY(source_component_id, target_component_id),
  CHECK(source_component_id <> target_component_id),
  CONSTRAINT dependency_edges_project_id_fkey FOREIGN KEY(project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT dependency_edges_source_project_fkey FOREIGN KEY(project_id, source_component_id)
    REFERENCES components(project_id, id) ON DELETE CASCADE,
  CONSTRAINT dependency_edges_target_project_fkey FOREIGN KEY(project_id, target_component_id)
    REFERENCES components(project_id, id) ON DELETE CASCADE
);

-- Safe migration for databases created before dependency_edges.project_id existed.
ALTER TABLE dependency_edges ADD COLUMN IF NOT EXISTS project_id INTEGER;
UPDATE dependency_edges d
SET project_id = source.project_id
FROM components source
WHERE source.id = d.source_component_id AND d.project_id IS NULL;
ALTER TABLE dependency_edges ALTER COLUMN project_id SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='dependency_edges'::regclass AND conname='dependency_edges_project_id_fkey') THEN
    ALTER TABLE dependency_edges ADD CONSTRAINT dependency_edges_project_id_fkey
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='dependency_edges'::regclass AND conname='dependency_edges_source_project_fkey') THEN
    ALTER TABLE dependency_edges ADD CONSTRAINT dependency_edges_source_project_fkey
      FOREIGN KEY(project_id, source_component_id) REFERENCES components(project_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='dependency_edges'::regclass AND conname='dependency_edges_target_project_fkey') THEN
    ALTER TABLE dependency_edges ADD CONSTRAINT dependency_edges_target_project_fkey
      FOREIGN KEY(project_id, target_component_id) REFERENCES components(project_id, id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS impact_analyses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  changed_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  affected_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT impact_analyses_project_component_fkey FOREIGN KEY(project_id, component_id)
    REFERENCES components(project_id, id) ON DELETE CASCADE
);

-- Existing rows with a mismatched project/component pair make this validation fail safely.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='impact_analyses'::regclass AND conname='impact_analyses_project_component_fkey') THEN
    ALTER TABLE impact_analyses ADD CONSTRAINT impact_analyses_project_component_fkey
      FOREIGN KEY(project_id, component_id) REFERENCES components(project_id, id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS components_project_idx ON components(project_id);
CREATE INDEX IF NOT EXISTS impact_project_created_idx ON impact_analyses(project_id, created_at DESC);
