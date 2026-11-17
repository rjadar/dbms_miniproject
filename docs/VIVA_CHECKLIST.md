# Impact Atlas viva demo checklist

## Before the demo

- [ ] Start the installed native PostgreSQL, Neo4j and MongoDB services. Do not reset databases or volumes.
- [ ] Confirm `.env` matches the local services. Never show or paste its contents.
- [ ] Confirm the sample project, graph, and MongoDB notes are available. PostgreSQL currently has 12 dependency rows.
- [ ] Confirm the demo accounts work. Developer permission restrictions passed; a recent direct Admin login attempt with the configured password returned HTTP 401, so verify the Admin credentials before presenting.
- [ ] Run `npm run build`; the production build has passed.
- [ ] Keep `database/viva_commands.sql`, `database/postgres/01_schema.sql`, `02_advanced.sql` and `03_roles.sql` ready to show.

## Suggested walkthrough

1. Sign in as Admin after confirming the current Admin credentials, and show the role label and Atlas Commerce project.
2. Show the overview, project selection and dependency graph.
3. Demonstrate adding and removing a dependency edge; both operations have been verified.
4. Select a component and run impact analysis. Show the direct and indirect dependents and their paths; this flow has been verified.
5. Demonstrate MongoDB note creation, reading and deletion. Do not claim that editing an existing note has been verified as an update.
6. Avoid the component rename control during the demo; rename did not work during testing. Other tested component create/delete operations may be demonstrated with care.
7. Sign in as Developer and show that read/analysis operations are allowed while Admin-only mutations are rejected. Developer permissions passed.
8. Open `database/viva_commands.sql` in Notepad, then execute it with a PostgreSQL client. Its DML example ends with `ROLLBACK`.
9. Show the standalone `project_component_count()` result for Atlas Commerce, the nested and correlated queries, recursive CTE and JOIN, plus the trigger and procedure. These database examples were verified; the trigger/procedure demonstration was rolled back.
10. Show `03_roles.sql` and explain that PostgreSQL group grants are for SQL-client demonstrations. The app's shared `DATABASE_URL` connection does not use those roles.
11. Present the ER diagram and relational schema. Explain that the live database has the `dependency_edges.project_id` foreign key, while the composite source/target foreign keys in the DDL are not active in the current database.
12. State that the modification questionnaire is pending because it was not found in the repository.

## Keep claims accurate

- The current working setup uses native PostgreSQL, Neo4j and MongoDB installations. The live database currently has 11 components and 12 dependency rows.
- Dependency edge creation/removal, impact analysis, MongoDB note create/read/delete, Developer permission restrictions and the production build have been verified.
- Component rename failed during testing. MongoDB existing-note update behavior has not been verified.
- A recent direct Admin login attempt with the configured password returned HTTP 401; check the intended viva credentials before the demonstration.
- PostgreSQL and Neo4j do not share a transaction. The app has compensation paths, but abrupt failures can still require graph resynchronization.
- No vector search is implemented. Do not claim it satisfies the rubric's undefined “RUD” term.
- Notepad can edit SQL text; execution requires `psql`, pgAdmin or another PostgreSQL client.
