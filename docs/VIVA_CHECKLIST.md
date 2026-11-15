# Impact Atlas viva demo checklist

## Before the demo

- [ ] Start the existing PostgreSQL, Neo4j and MongoDB services; do not reset their volumes.
- [ ] Confirm `.env` is configured locally. Never show or paste its contents during the presentation.
- [ ] Ensure PostgreSQL schema/sample rows, Neo4j graph nodes/edges and MongoDB seed note are available.
- [ ] Ensure the demo Admin and Developer accounts exist. Do not put passwords in slides or documentation.
- [ ] Keep `database/viva_commands.sql`, `database/postgres/01_schema.sql`, `02_advanced.sql`, and `03_roles.sql` ready to show.

## Suggested walkthrough

1. Sign in with the Admin demo account; show the role label and seeded Atlas Commerce project.
2. Show the overview counts and components/dependency graph.
3. Select `postgres-db` and run impact analysis. Explain the direct/indirect paths and shortest representative path shown by the API.
4. Show recent impact history and explain that the procedure stores each analysis in PostgreSQL.
5. Demonstrate one Admin component operation only if the demo database can be restored or the change is intended to persist. Explain PostgreSQL constraints and the matching Neo4j graph relationship.
6. Show MongoDB component notes and explain that notes are stored as documents.
7. Sign in as Developer and show that viewing and impact analysis are allowed while Admin-only mutation endpoints reject the request.
8. Open `database/viva_commands.sql` in Notepad, explain that Notepad edits the file, then execute it with a PostgreSQL client. The DML section ends in `ROLLBACK` and is designed not to persist changes.
9. Show the nested, correlated, recursive CTE and join query examples, then the trigger/procedure definitions in `02_advanced.sql`.
10. Show `03_roles.sql` and explain that PostgreSQL group grants are a SQL demonstration only; the web app’s shared `DATABASE_URL` account does not use these roles.
11. Present the ER diagram and relational schema documents. State that the modification questionnaire is pending because it was not present in the repository.

## Keep claims accurate

- Database connectivity and current contents were verified read-only on 27 October 2026; application login, CRUD APIs and the UI impact workflow were not run during this audit.
- PostgreSQL and Neo4j do not provide a shared transaction. App compensation can repair detected failures, but an abrupt process failure can require graph resynchronization.
- The project has MongoDB document operations but no vector search. Do not claim satisfaction of the undefined “RUD” rubric requirement without faculty clarification.
- A `.sql` file can be authored in Notepad but requires pgAdmin, `psql`, or another SQL client for execution.

