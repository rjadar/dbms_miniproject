# Impact Atlas

A compact university DBMS project for managing software dependencies and exploring proposed change impact.

## Stack and database roles

- **Next.js** provides the dashboard and JSON API.
- **PostgreSQL** stores users, projects, components, dependency edges and impact history. Its DDL defines primary/foreign keys, uniqueness and checks. `02_advanced.sql` demonstrates a trigger, stored procedure, standalone component-count function, recursive CTE and joins. The live native database currently has the dependency `project_id` foreign key; composite same-project endpoint constraints in the DDL are not yet active there.
- **Neo4j** stores the dependency graph. The impact endpoint traverses incoming `DEPENDS_ON` paths to find components that depend directly or transitively on the changed component.
- **MongoDB** stores component review notes as documents. Note creation, reading and deletion have been verified; updating an existing note has not been verified as a separate operation. No vector index or vector search is implemented. The supplied rubric does not define “RUD”; this project does not claim that the MongoDB operations satisfy that term.
- Application roles are `admin` and `developer`. The API enforces the Admin/Developer permission differences. `03_roles.sql` creates PostgreSQL group roles for SQL-client demonstrations, but the web app does not connect as those roles: it uses the single `DATABASE_URL` account. Therefore PostgreSQL database-level RBAC is **not enforced by the application**.

## Setup

Requirements: Node.js 20+ and PostgreSQL 14+, Neo4j 5+ and MongoDB 6+. The current working setup uses these databases installed natively; Docker Compose is an optional alternative.

1. Start PostgreSQL, Neo4j and MongoDB using your local installation or run `docker compose up -d`. The current Compose mapping publishes MongoDB on host port `27018`. Copy `.env.example` to `.env` and configure it with your own database URLs, usernames and passwords. Do not commit `.env`. Create the PostgreSQL schema and sample records using your own connection URL in place of the placeholder below:

   ```sh
   psql "<your PostgreSQL connection URL>" -f database/postgres/01_schema.sql
   psql "<your PostgreSQL connection URL>" -f database/postgres/04_seed.sql
   psql "<your PostgreSQL connection URL>" -f database/postgres/02_advanced.sql
   psql "<your PostgreSQL connection URL>" -f database/postgres/03_roles.sql
   ```

   The recursive query in `02_advanced.sql` returns the seed paths after `04_seed.sql` has run.
2. Set a random `SESSION_SECRET` and your own demo account passwords in `.env`. For the current local MongoDB setup, `MONGODB_URI` uses host port `27018`; adjust it if your installation uses another port.
3. Run `npm install` and create local demo accounts by setting `ADMIN_PASSWORD` and `DEVELOPER_PASSWORD` (and optionally their email variables) in `.env`, then run `npm run seed:users`. These are local development credentials; none are checked into source control.
4. In Neo4j Browser at `http://localhost:7474`, execute `database/neo4j/seed.cypher`. It uses component IDs 1-10, matching a fresh PostgreSQL seed. Start from an empty PostgreSQL and Neo4j database so generated IDs match.
5. Seed a MongoDB note with `mongosh "mongodb://localhost:27018/impact_demo" database/mongodb/seed.js`.
6. Start the site with `npm run dev` and open `http://localhost:3000`.

The `DATABASE_URL`, `NEO4J_*`, and `MONGODB_URI` values are required for their corresponding features. A user account can be created without checking any credential into git. The dashboard displays PostgreSQL status only after the overview query succeeds; API errors are shown in the page.

## Demonstration flow

1. Sign in with an account created by `npm run seed:users`.
2. Choose a project from the project picker and review its components and dependency map. Admins can add and delete components. Component rename did not work during testing; do not rely on that control for the demo.
3. Select `postgres-db` and run impact analysis. The API asks Neo4j for every dependent path; direct and indirect components are highlighted and paths are shown in the report.
4. Add and remove a dependency as admin; both operations have been verified against PostgreSQL and Neo4j. Add, read and delete a MongoDB component note. Editing an existing note has not been verified as an update operation.
5. Sign in as developer. Reading the project and running analysis remain available; admin mutations return HTTP 403.
6. In PostgreSQL, show schema constraints, the role grants, trigger, procedure and standalone function, then run the nested, correlated, join and recursive CTE examples in `02_advanced.sql`.

## Data model

```mermaid
erDiagram
  APP_USERS ||--o{ IMPACT_ANALYSES : runs
  PROJECTS ||--o{ COMPONENTS : contains
  PROJECTS ||--o{ IMPACT_ANALYSES : records
  COMPONENTS ||--o{ IMPACT_ANALYSES : changed
  COMPONENTS ||--o{ DEPENDENCY_EDGES : source
  COMPONENTS ||--o{ DEPENDENCY_EDGES : target
```

`dependency_edges(source_component_id,target_component_id)` is a directed relation: the source component depends on the target. Neo4j mirrors this as `(source)-[:DEPENDS_ON]->(target)`. When a target changes, reverse traversal locates all source components that may be affected.

## Verification and limitations

- Run `npm run build` to check the application bundle after installing dependencies.
- The current native PostgreSQL, Neo4j and MongoDB setup is working. Dependency edge creation/removal and impact analysis have been verified; PostgreSQL currently has 12 dependency rows.
- The production build and Developer permission restrictions have passed. Component rename did not work during testing; MongoDB note update behavior has not been verified.
- Database setup and the end-to-end workflow require all three local database services. They are not bundled with the web app.
- The Neo4j seed IDs expect an empty PostgreSQL database seeded once in the documented order. Re-seeding a non-empty database or deleting/recreating components requires synchronizing the Neo4j graph.
- Project/component mutation endpoints are admin-only. Project creation/update/deletion are API operations; the UI provides project selection and component add/delete controls. The rename control did not work during testing.
- PostgreSQL group roles are only used in direct SQL demonstrations. API authorization is separate and checked from the signed-in user's application role. The web server's shared `DATABASE_URL` identity is not restricted by `impact_admin` or `impact_developer` grants.
- SQL/Neo4j writes use compensation when a later database operation fails, and project deletion rebuilds the small Neo4j graph from the remaining SQL rows. PostgreSQL and Neo4j do not share a distributed transaction; an abrupt process or machine failure between the two commits can still require re-running the graph seed/synchronization.
- No automated test suite has been added yet; the build check and manual demonstration flow are the current verification steps.
