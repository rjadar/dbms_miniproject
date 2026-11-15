# Impact Atlas relational schema

Based on `database/postgres/01_schema.sql`; live PostgreSQL catalog inspection confirmed the tables and constraints below.

## Tables

### `app_users`

| Column | Type | Null? | Key / rule |
|---|---|---:|---|
| `id` | integer (`SERIAL`) | No | Primary key |
| `email` | text | No | Unique |
| `password_hash` | text | No | Bcrypt hash stored by the user-seed script |
| `role` | text | No | Check: `admin` or `developer` |
| `created_at` | timestamptz | No | Defaults to `now()` |

### `projects`

| Column | Type | Null? | Key / rule |
|---|---|---:|---|
| `id` | integer (`SERIAL`) | No | Primary key |
| `name` | text | No | Unique |
| `description` | text | No | Defaults to empty text |
| `created_at` | timestamptz | No | Defaults to `now()` |

### `components`

| Column | Type | Null? | Key / rule |
|---|---|---:|---|
| `id` | integer (`SERIAL`) | No | Primary key |
| `project_id` | integer | No | FK to `projects.id`, `ON DELETE CASCADE` |
| `name` | text | No | Unique with `project_id` |
| `kind` | text | No | Defaults to `service` |
| `description` | text | No | Defaults to empty text |
| `updated_at` | timestamptz | No | Defaults to `now()`; maintained on UPDATE by trigger |

### `dependency_edges`

| Column | Type | Null? | Key / rule |
|---|---|---:|---|
| `source_component_id` | integer | No | Composite primary key; FK to `components.id`, `ON DELETE CASCADE` |
| `target_component_id` | integer | No | Composite primary key; FK to `components.id`, `ON DELETE CASCADE` |

Additional check disallows a component depending directly on itself. The source and target columns define a directed edge; both endpoints must be valid components.

### `impact_analyses`

| Column | Type | Null? | Key / rule |
|---|---|---:|---|
| `id` | integer (`SERIAL`) | No | Primary key |
| `project_id` | integer | No | FK to `projects.id`, `ON DELETE CASCADE` |
| `component_id` | integer | No | FK to `components.id`, `ON DELETE CASCADE` |
| `changed_by` | integer | Yes | FK to `app_users.id`, `ON DELETE SET NULL` |
| `affected_count` | integer | No | Defaults to 0 |
| `created_at` | timestamptz | No | Defaults to `now()` |

## Relationships and indexes

- One project contains zero or more components; deleting the project cascades to its components and associated analysis rows.
- One component can appear as the source or target of many dependency edges; deleting it cascades those edges.
- One project, changed component, and optional user can be associated with many impact analysis rows.
- `components_project_idx` indexes `components(project_id)`.
- `impact_project_created_idx` indexes `impact_analyses(project_id, created_at DESC)`.

## Database roles

`database/postgres/03_roles.sql` creates `impact_admin` and `impact_developer` as `NOLOGIN` group roles. Admin grants SELECT/INSERT/UPDATE/DELETE on projects, components, dependency edges, and impact analyses. Developer grants SELECT on those tables and INSERT on impact analyses. Both receive sequence usage/select. Neither is granted access to `app_users` by this script. These are SQL-client demonstration roles: the web application’s `DATABASE_URL` connects as `postgres`, so PostgreSQL does not enforce these roles for app requests.

