# Impact Atlas: viva audit

Audit basis: source files in this repository plus read-only inspection of the configured databases on 27 October 2026. No application mutations were run for this audit. The questionnaire was not present in the repository.

## Requirements checklist

| Lecturer requirement | Finding | Evidence and limitation |
|---|---|---|
| Users and authentication | Implemented in code; seeded users exist | `app_users` contains 2 rows. Login checks bcrypt password hashes and issues a signed, HTTP-only session cookie in `src/lib/auth.ts` and `src/app/api/login/route.ts`. User creation is the `npm run seed:users` script. No user-management UI/API is present. Login was not exercised in this audit. |
| CRUD operations and constraints | SQL constraints verified; application CRUD handlers present; end-to-end API CRUD not tested | The PostgreSQL schema has five tables and primary/foreign/unique/check constraints. Project CRUD endpoints exist, but the UI only selects projects; project create/edit/delete are not exposed in the dashboard. Component add/edit/delete controls and APIs exist. Mongo component notes have API read/upsert/delete operations. No API CRUD smoke test was run. |
| SQL INSERT, UPDATE, DELETE | Present in SQL and application code | `04_seed.sql` contains INSERT statements; component/project APIs issue INSERT, UPDATE and DELETE; `02_advanced.sql` installs an UPDATE trigger. Safe transaction-scoped examples are in `database/viva_commands.sql`. |
| SQL commands runnable from Notepad | SQL file prepared; Notepad itself cannot execute SQL | Open/edit the `.sql` file in Notepad, then execute it through pgAdmin Query Tool or `psql`. See `database/viva_commands.sql`. A database client is still required. |
| ER diagram and relational schema | Prepared from the actual PostgreSQL schema | See `ER_DIAGRAM.md` and `RELATIONAL_SCHEMA.md`. The five live PostgreSQL tables and their constraints match `01_schema.sql`. |
| Advanced queries, triggers, functions and procedures | Definitions are present; read-only query examples executed; trigger/procedure invocation not tested | The live database contains `set_component_updated_at()` (trigger function), trigger `components_updated_at`, and procedure `record_impact`. Nested, correlated, recursive and join SELECT examples returned rows when run read-only against the live database. No UPDATE or CALL was executed to avoid changing data. |
| Database roles and permissions | PostgreSQL group roles and grants exist; application DB RBAC is not enforced | Live roles `impact_admin` and `impact_developer` exist and are `NOLOGIN`. Table and sequence grants match `03_roles.sql`; `impact_developer` can read project/component/dependency/analysis tables and insert analyses; `impact_admin` can read/write those tables. Neither role has privileges on `app_users`. The application connects as `postgres` via `DATABASE_URL`; Admin/Developer restrictions are API-level checks, not PostgreSQL roles. |
| Modification questionnaire | Missing | No questionnaire file or matching reference was found in the repository. Provide the lecturer’s questionnaire to complete this requirement. |

## Setup documentation discrepancy

`docker-compose.yml` publishes MongoDB host port `27018`, while `.env.example`, the MongoDB seed comment, and README setup command refer to `27017`. The configured `.env` successfully connected to the live MongoDB for this audit, but the checked-in setup instructions are inconsistent. Use the host port actually published by Compose when preparing the local environment; this audit did not edit those existing files.

## Live database checks

- PostgreSQL connection succeeded as database user `postgres`. Current counts: 2 users, 1 project, 10 components, 12 dependency edges, 4 impact analyses.
- PostgreSQL contains `app_users`, `projects`, `components`, `dependency_edges`, and `impact_analyses`. Primary keys, foreign keys, uniqueness and self-edge/role checks were inspected from the live catalog.
- Neo4j contains 10 `Component` nodes and 12 `DEPENDS_ON` relationships. Node IDs/names/kinds and edge endpoint IDs match PostgreSQL exactly in the read-only comparison performed for this audit.
- MongoDB database `impact_demo` contains `component_notes` with 2 documents; the `payment-service` seed note is present.
- The read-only nested/correlated/recursive/join queries returned 1, 6, 13 and 4 rows respectively. Build, sign-in, browser interaction, API CRUD, impact analysis endpoint, and rollback-based procedure/trigger demonstrations were not run as part of this audit. Database presence and source code are not proof of those full application workflows.

## Gaps to prioritize

1. Complete the lecturer’s modification questionnaire when it is provided.
2. Demonstrate the app with Admin and Developer accounts, including a real impact run and one reversible CRUD example.
3. Explain that Notepad edits SQL but a PostgreSQL client executes it.
4. Be precise about PostgreSQL RBAC: SQL role grants exist, but the web app uses the shared `postgres` database account.
5. Do not claim vector search: no vector database/index/search feature is implemented, and the rubric’s “RUD” wording has not been interpreted here.

