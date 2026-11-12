-- Trigger: keep component modification timestamps current.
CREATE OR REPLACE FUNCTION set_component_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS components_updated_at ON components;
CREATE TRIGGER components_updated_at BEFORE UPDATE ON components
FOR EACH ROW EXECUTE FUNCTION set_component_updated_at();

-- Procedure: record one completed impact analysis.
CREATE OR REPLACE PROCEDURE record_impact(p_project INTEGER, p_component INTEGER, p_user INTEGER, p_count INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO impact_analyses(project_id, component_id, changed_by, affected_count)
  VALUES (p_project, p_component, p_user, p_count);
END $$;

-- Standalone business function: count components in a project.
CREATE OR REPLACE FUNCTION project_component_count(p_project INTEGER)
RETURNS INTEGER LANGUAGE SQL STABLE AS $$
  SELECT count(*)::INTEGER FROM components WHERE project_id = p_project;
$$;

-- Function example. With the supplied sample seed, Atlas Commerce returns 10.
SELECT p.name, project_component_count(p.id) AS component_count
FROM projects p
ORDER BY p.id;

-- Nested-query example: projects that contain at least one service component.
SELECT p.id, p.name
FROM projects p
WHERE p.id IN (SELECT c.project_id FROM components c WHERE c.kind='service')
ORDER BY p.id;

-- Correlated-query example: components that have at least one outgoing dependency.
SELECT c.id, c.name
FROM components c
WHERE EXISTS (
  SELECT 1 FROM dependency_edges d
  WHERE d.source_component_id=c.id
)
ORDER BY c.id;

-- Recursive SQL example: list dependency descendants (also used in the viva query demo).
-- Neo4j remains the source for the application's change-impact traversal.
WITH RECURSIVE dependency_tree(component_id, depth, path) AS (
  SELECT 1, 0, ARRAY[1]::INTEGER[]
  UNION ALL
  SELECT d.target_component_id, t.depth + 1, t.path || d.target_component_id
  FROM dependency_edges d JOIN dependency_tree t ON d.source_component_id = t.component_id
  WHERE NOT d.target_component_id = ANY(t.path)
)
SELECT component_id, depth, path FROM dependency_tree ORDER BY depth, component_id;

-- Join example: recent analyses with project, changed component and user.
SELECT p.name AS project, c.name AS changed_component, u.email, a.affected_count, a.created_at
FROM impact_analyses a JOIN projects p ON p.id=a.project_id
JOIN components c ON c.id=a.component_id LEFT JOIN app_users u ON u.id=a.changed_by
ORDER BY a.created_at DESC;
