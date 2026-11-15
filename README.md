# Impact Atlas

A compact university DBMS project for managing software dependencies and exploring proposed change impact.

## Stack and database roles

- **Next.js** provides the dashboard and JSON API.
- **PostgreSQL** stores users, projects, components, dependency edges and impact history. Its DDL includes primary/foreign keys, uniqueness and checks. `02_advanced.sql` demonstrates a trigger, stored procedure, recursive CTE and joins.
- **Neo4j** stores the dependency graph. The impact endpoint traverses incoming `DEPENDS_ON` paths to find components that depend directly or transitively on the changed component.
- **MongoDB** stores component review notes as documents and demonstrates document reads, upserts/updates and deletes. No vector index or vector search is implemented. The supplied rubric does not define “RUD”; this project does not claim that the MongoDB operations satisfy that term.
- Application roles are `admin` and `developer`. The API enforces the Admin/Developer permission differences. `03_roles.sql` creates PostgreSQL group roles for SQL-client demonstrations, but the web app does not connect as those roles: it uses the single `DATABASE_URL` account. Therefore PostgreSQL database-level RBAC is **not enforced by the application**.

## Setup

Requirements: Node.js 20+ and Docker Desktop (or PostgreSQL 14+, Neo4j 5+, MongoDB 6+ installed locally).

1. Start the local databases: `docker compose up -d`. The compose credentials are for local development only. Copy `.env.example` to `.env`. Create the PostgreSQL schema and sample records:

   ```sh
   psql "postgresql://postgres:local_dev_only@localhost:5432/impact_db" -f database/postgres/01_schema.sql
   psql "postgresql://postgres:local_dev_only@localhost:5432/impact_db" -f database/postgres/04_seed.sql
   psql "postgresql://postgres:local_dev_only@localhost:5432/impact_db" -f database/postgres/02_advanced.sql
   psql "postgresql://postgres:local_dev_only@localhost:5432/impact_db" -f database/postgres/03_roles.sql
   ```

   The recursive query in `02_advanced.sql` returns the seed paths after `04_seed.sql` has run.
2. Set a random `SESSION_SECRET` and demo account passwords in `.env`. The example Compose MongoDB publishes host port 27017; if another MongoDB service already occupies that port, stop that service or change the Compose host port and matching `MONGODB_URI`.
3. Run `npm install` and create local demo accounts by setting `ADMIN_PASSWORD` and `DEVELOPER_PASSWORD` (and optionally their email variables) in `.env`, then run `npm run seed:users`. These are local development credentials; none are checked into source control.
4. In Neo4j Browser at `http://localhost:7474`, execute `database/neo4j/seed.cypher`. It uses component IDs 1-10, matching a fresh PostgreSQL seed. Start from an empty PostgreSQL and Neo4j database so generated IDs match.
5. Seed a MongoDB note with `mongosh "mongodb://localhost:27017/impact_demo" database/mongodb/seed.js`.
6. Start the site with `npm run dev` and open `http://localhost:3000`.

The `DATABASE_URL`, `NEO4J_*`, and `MONGODB_URI` values are required for their corresponding features. A user account can be created without checking any credential into git. The dashboard displays PostgreSQL status only after the overview query succeeds; API errors are shown in the page.

## Demonstration flow

1. Sign in with an account created by `npm run seed:users`.
2. Choose a project from the project picker and review its components and dependency map. Admins can add, rename and delete components.
3. Select `postgres-db` and run impact analysis. The API asks Neo4j for every dependent path; direct and indirect components are highlighted and paths are shown in the report.
4. Add a component or dependency as admin. The request writes to PostgreSQL and Neo4j. Add and delete a MongoDB component note to demonstrate document operations.
5. Sign in as developer. Reading the project and running analysis remain available; admin mutations return HTTP 403.
6. In PostgreSQL, show schema constraints, the role grants, trigger and procedure, then run the nested, correlated, join and recursive CTE examples in `02_advanced.sql`.

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
- Database setup and the end-to-end workflow require all three local database services. They are not bundled with the web app.
- The Neo4j seed IDs expect an empty PostgreSQL database seeded once in the documented order. Re-seeding a non-empty database or deleting/recreating components requires synchronizing the Neo4j graph.
- Project/component mutation endpoints are admin-only. Project creation/update/deletion are API operations; the UI provides project selection and component add/rename/delete controls.
- PostgreSQL group roles are only used in direct SQL demonstrations. API authorization is separate and checked from the signed-in user's application role. The web server's shared `DATABASE_URL` identity is not restricted by `impact_admin` or `impact_developer` grants.
- SQL/Neo4j writes use compensation when a later database operation fails, and project deletion rebuilds the small Neo4j graph from the remaining SQL rows. PostgreSQL and Neo4j do not share a distributed transaction; an abrupt process or machine failure between the two commits can still require re-running the graph seed/synchronization.
- No automated test suite has been added yet; the build check and manual demonstration flow are the current verification steps.
