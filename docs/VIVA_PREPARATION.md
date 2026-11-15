# Impact Atlas viva preparation

Answers below describe the current repository and the database state inspected on 27 October 2026. They do not claim that untested app workflows have passed.

## Likely questions

### What problem does Impact Atlas solve?

It models software components and directed dependencies, then finds components that may be affected when one component changes. PostgreSQL stores structured project/component and impact-history records. Neo4j stores the dependency graph and performs the multi-hop traversal.

### Why use both PostgreSQL and Neo4j?

Projects, components, users, constraints and analysis history fit relational tables. Dependency traversal is expressed as graph paths in Neo4j. The app writes dependency changes to both stores and includes graph resynchronization/compensation paths, but they do not share a distributed transaction; a process failure between writes can still require resynchronization.

### What is the ER model?

`projects` contains `components`; `dependency_edges` relates one component to another using a composite key; `impact_analyses` records a project, changed component, affected count, timestamp and optional user. See `ER_DIAGRAM.md` and `RELATIONAL_SCHEMA.md`.

### Which integrity constraints can you show?

Primary keys identify rows. Unique constraints prevent duplicate project names, duplicate email addresses and duplicate component names within a project. Foreign keys connect components, edges and analyses to their parents; cascade/set-null behavior is shown in the schema. Checks limit user roles and disallow self-dependencies.

### How are application users authenticated?

The seed script hashes passwords with bcrypt. Login compares the supplied password with the stored hash. A successful login receives an HS256-signed, HTTP-only, same-site session cookie with a seven-day expiry. `SESSION_SECRET` must be at least 32 characters. Secrets are environment configuration and are not part of this document.

### What is the difference between API roles and PostgreSQL roles?

Application users carry `admin` or `developer` in `app_users`; route handlers check that role before mutations. PostgreSQL also has `impact_admin` and `impact_developer` NOLOGIN group roles with table grants. The web app connects through the single `DATABASE_URL` account (`postgres` in the inspected setup), and does not `SET ROLE`; therefore those PostgreSQL grants are not enforced for API requests.

### What does the trigger do?

`components_updated_at` is a BEFORE UPDATE trigger that calls `set_component_updated_at()` to set `updated_at` to `now()`. The function is a trigger function, not an independent business function called by the UI.

### What does the stored procedure do?

`record_impact(p_project, p_component, p_user, p_count)` inserts an `impact_analyses` row. The app calls it after graph traversal to persist the affected count. The procedure and trigger exist in the live schema; their invocation was not exercised during the read-only audit.

### What SQL query concepts are included?

`02_advanced.sql` has a nested `IN` query, a correlated `EXISTS` query, a recursive CTE, and a multi-table join. These SELECT examples were run read-only against the current database and returned rows.

### What does “direct” versus “indirect” impact mean?

The dependency direction is source-to-target (`source DEPENDS_ON target`). For a changed target, direct dependents have a one-edge path; indirect dependents are reached over longer incoming paths. The API deduplicates affected IDs and reports a representative shortest path.

### What is MongoDB used for?

It stores component review notes as documents in `component_notes`. The API reads notes, upserts a note, and deletes a note. The inspected database has two notes, including the payment-service seed note. No vector index or vector search is implemented.

### Can I run SQL in Notepad?

Notepad is a text editor, not a database client. You can open `database/viva_commands.sql` in Notepad, then run the saved file through pgAdmin Query Tool or `psql` (for example, `psql -d impact_db -f database/viva_commands.sql` when connection defaults are configured). The file uses a transaction and ends the DML example with `ROLLBACK` so the example does not persist changes.

### What has actually been verified?

Read-only database connections and catalog/data checks succeeded for all three configured stores. PostgreSQL currently has 2 users, 1 project, 10 components, 12 edges and 4 analyses. The 10 Neo4j nodes and 12 relationships match the PostgreSQL components and edges. MongoDB has two component note documents. The read-only nested/correlated/recursive/join queries returned rows. Browser login, API CRUD and end-to-end impact execution were not tested in this audit.

### What is still missing?

The lecturer’s modification questionnaire was not found and must be provided. The rubric’s “RUD” wording is not interpreted here; the project does not currently implement vector search. PostgreSQL database role grants exist, but application requests use the shared database account rather than those roles.

