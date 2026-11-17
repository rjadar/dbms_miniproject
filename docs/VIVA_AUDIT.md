# Impact Atlas: viva audit

Audit basis: source files, read-only checks of the current native databases, and the reported end-to-end tests as of 17 November 2026. No database reset was performed. The lecturer's modification questionnaire was not found in the repository.

## Requirements checklist

| Lecturer requirement | Finding | Evidence and limitation |
|---|---|---|
| Users and authentication | PARTIAL | Login uses bcrypt password hashes and signed HTTP-only session cookies through `src/app/api/login/route.ts` and `src/lib/auth.ts`; `scripts/create-users.mjs` seeds accounts. An earlier browser check completed both logins. Developer permission restrictions passed. The latest direct Admin login attempt using the configured password returned HTTP 401, so confirm the viva Admin credentials. |
| CRUD operations and constraints | PARTIAL | Project/API and component create/delete operations were exercised. Dependency edge creation and removal were verified. Component rename did not work during testing. MongoDB notes can be created, read and deleted; updating an existing note was not verified as an update operation. |
| SQL INSERT, UPDATE, DELETE | IMPLEMENTED / TESTED IN PART | `04_seed.sql` and API operations demonstrate DML; safe transaction-scoped examples are in `database/viva_commands.sql`. Trigger and procedure tests used a transaction that was rolled back. Do not treat the failed component rename as a working operation. |
| SQL commands runnable from Notepad | PREPARED | `database/viva_commands.sql` can be opened or edited in Notepad, then executed through `psql` or pgAdmin. Notepad itself is not a SQL execution client. |
| ER diagram and relational schema | PREPARED WITH LIVE LIMITATION | See `ER_DIAGRAM.md` and `RELATIONAL_SCHEMA.md`. The SQL DDL defines composite same-project constraints; the current live database does not have the composite endpoint foreign keys. |
| Advanced queries, triggers, functions and procedures | VERIFIED | Nested, correlated, recursive CTE and JOIN queries ran. The standalone `project_component_count()` returned 10 for Atlas Commerce. The trigger and `record_impact` procedure were exercised with changes rolled back. |
| Database roles and permissions | PARTIAL | API-level Developer restrictions passed. PostgreSQL `impact_admin` and `impact_developer` are SQL demonstration roles; direct checks showed Developer SELECT succeeded and a disallowed INSERT was denied. The web app connects through the shared `DATABASE_URL` account, so PostgreSQL group-role RBAC is not enforced for app requests. |
| Modification questionnaire | MISSING | No questionnaire file or matching reference was found. Provide the lecturer's questionnaire; its requirements are not inferred here. |

## Current native database state

- PostgreSQL, Neo4j and MongoDB are installed locally and working. The current setup uses native services.
- PostgreSQL `impact_db` currently contains 2 users, 1 project, 11 components, 12 dependency rows and 8 impact analyses. The live dependency rows have `project_id = 1`; all 12 match both endpoint components' project. The `project_id` column is NOT NULL and its foreign key to `projects` is validated.
- The live `dependency_edges` table does not currently have the composite source/target foreign keys defined in `database/postgres/01_schema.sql`. The supporting unique key on `components(project_id,id)` is also absent from the live database.
- Neo4j currently contains 11 `Component` nodes and 12 `DEPENDS_ON` relationships. Dependency edge creation/removal and impact analysis traversal have been verified.
- MongoDB `impact_demo.component_notes` currently contains 2 documents. Create, read and delete operations were verified. Existing-note update behavior was not verified.
- `npm run build` passed. Developer permission restrictions passed. Component rename failed during testing.

## Remaining viva gaps

1. Confirm the Admin credentials intended for the viva; the latest direct login attempt with the configured password returned HTTP 401.
2. Do not demonstrate component rename as working; it failed during testing.
3. Do not claim that editing an existing MongoDB note was verified.
4. Explain that PostgreSQL group roles are demonstrated through SQL but are not used by the app's shared database connection.
5. The rubric's “RUD” wording is not defined here; no vector search is implemented or claimed.
6. Obtain and complete the lecturer's modification questionnaire.
