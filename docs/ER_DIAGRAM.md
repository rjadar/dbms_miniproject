# Impact Atlas ER diagram

This diagram follows the repository’s PostgreSQL DDL (`database/postgres/01_schema.sql`) and was checked against the live database catalog.

```mermaid
erDiagram
  APP_USERS {
    integer id PK
    text email UK
    text password_hash
    text role
    timestamptz created_at
  }
  PROJECTS {
    integer id PK
    text name UK
    text description
    timestamptz created_at
  }
  COMPONENTS {
    integer id PK
    integer project_id FK
    text name
    text kind
    text description
    timestamptz updated_at
  }
  DEPENDENCY_EDGES {
    integer source_component_id PK, FK
    integer target_component_id PK, FK
  }
  IMPACT_ANALYSES {
    integer id PK
    integer project_id FK
    integer component_id FK
    integer changed_by FK
    integer affected_count
    timestamptz created_at
  }
  PROJECTS ||--o{ COMPONENTS : contains
  COMPONENTS ||--o{ DEPENDENCY_EDGES : source
  COMPONENTS ||--o{ DEPENDENCY_EDGES : target
  PROJECTS ||--o{ IMPACT_ANALYSES : records
  COMPONENTS ||--o{ IMPACT_ANALYSES : changed
  APP_USERS o|--o{ IMPACT_ANALYSES : performs
```

`dependency_edges` is a directed self-relationship over `components`, represented as a separate relation with a composite primary key. In the graph, the same dependency is represented by `(source)-[:DEPENDS_ON]->(target)`. A source component depends on its target; impact traversal walks incoming relationships to find dependents.

The application user’s `role` is a checked text value (`admin` or `developer`), not a foreign key to PostgreSQL role objects. The PostgreSQL group roles are separate database principals described in `RELATIONAL_SCHEMA.md`.

