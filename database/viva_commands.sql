-- Impact Atlas viva queries for PostgreSQL.
-- Open/edit this file in Notepad, then execute it with pgAdmin Query Tool or psql.
-- With psql connection defaults already configured, from the repository root run:
-- psql -d impact_db -f database/viva_commands.sql
-- Requires the existing database setup and sample data. No credentials are stored here.

-- Identify the active database/account and list the project tables.
SELECT current_database() AS database_name, current_user AS database_user;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- DML demonstration is fully rolled back at the end of this transaction.
-- The fixed marker name is reserved for this example. Do not remove ROLLBACK.
BEGIN;

INSERT INTO projects (name, description)
VALUES ('Viva Demo - rollback only', 'Temporary row for a rolled-back viva example')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description
RETURNING id, name;

INSERT INTO components (project_id, name, kind, description)
SELECT id, 'viva-demo-component', 'service', 'Inserted for a rolled-back viva example'
FROM projects
WHERE name = 'Viva Demo - rollback only'
ON CONFLICT (project_id, name) DO UPDATE
SET description = EXCLUDED.description
RETURNING id, project_id, name;

UPDATE components
SET description = 'Updated inside a transaction that will be rolled back'
WHERE project_id = (SELECT id FROM projects WHERE name = 'Viva Demo - rollback only')
  AND name = 'viva-demo-component'
RETURNING id, name, description, updated_at;

DELETE FROM components
WHERE project_id = (SELECT id FROM projects WHERE name = 'Viva Demo - rollback only')
  AND name = 'viva-demo-component'
RETURNING id, name;

-- Demonstrate the trigger function safely. It runs because components is updated.
UPDATE components
SET description = description || ' (trigger demo)'
WHERE project_id = (SELECT id FROM projects WHERE name = 'Atlas Commerce')
  AND name = 'postgres-db'
RETURNING id, name, updated_at;

-- Demonstrate the stored procedure safely; changed_by accepts NULL by schema design.
CALL record_impact(
  (SELECT id FROM projects WHERE name = 'Atlas Commerce'),
  (SELECT id FROM components
   WHERE project_id = (SELECT id FROM projects WHERE name = 'Atlas Commerce')
     AND name = 'postgres-db'),
  NULL,
  0
);

-- This also removes the temporary project. All changes above are undone.
DELETE FROM projects
WHERE name = 'Viva Demo - rollback only'
RETURNING id, name;
ROLLBACK;

-- Nested query: projects containing at least one service component.
SELECT p.id, p.name
FROM projects p
WHERE p.id IN (
  SELECT c.project_id FROM components c WHERE c.kind = 'service'
)
ORDER BY p.id;

-- Correlated query: components with at least one outgoing dependency.
SELECT c.id, c.name
FROM components c
WHERE EXISTS (
  SELECT 1 FROM dependency_edges d WHERE d.source_component_id = c.id
)
ORDER BY c.id;

-- Recursive CTE: follow this project's dependency edges outward from web-portal.
WITH RECURSIVE dependency_tree(component_id, depth, path) AS (
  SELECT c.id, 0, ARRAY[c.id]::INTEGER[]
  FROM components c
  JOIN projects p ON p.id = c.project_id
  WHERE p.name = 'Atlas Commerce' AND c.name = 'web-portal'
  UNION ALL
  SELECT d.target_component_id, t.depth + 1, t.path || d.target_component_id
  FROM dependency_edges d
  JOIN dependency_tree t ON d.source_component_id = t.component_id
  WHERE NOT d.target_component_id = ANY(t.path)
)
SELECT c.name, t.depth, t.path
FROM dependency_tree t
JOIN components c ON c.id = t.component_id
ORDER BY t.depth, c.name;

-- Join: recent analysis records with their project, component and optional user.
SELECT p.name AS project, c.name AS changed_component, u.email,
       a.affected_count, a.created_at
FROM impact_analyses a
JOIN projects p ON p.id = a.project_id
JOIN components c ON c.id = a.component_id
LEFT JOIN app_users u ON u.id = a.changed_by
ORDER BY a.created_at DESC;

-- Inspect the actual demonstration role grants without changing role membership.
SELECT role_name,
       has_table_privilege(role_name, 'projects', 'SELECT') AS can_read_projects,
       has_table_privilege(role_name, 'projects', 'INSERT') AS can_insert_projects,
       has_table_privilege(role_name, 'app_users', 'SELECT') AS can_read_app_users
FROM (VALUES ('impact_admin'), ('impact_developer')) AS roles(role_name)
ORDER BY role_name;

