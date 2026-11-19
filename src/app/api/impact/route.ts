
import { NextResponse } from "next/server";
// Used to send JSON responses from the API.

import type { ManagedTransaction } from "neo4j-driver";
// Type definition for a Neo4j database transaction.

import { getGraph, sql } from "@/lib/db";
// getGraph() connects to Neo4j.
// sql connects to PostgreSQL.

import { requireUser } from "@/lib/auth";
// Checks whether the user is logged in.


/*
   POST METHOD — RUN IMPACT ANALYSIS

   Receives a component ID and finds all components
   that may be affected if that component changes.
*/
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    // Get the selected component ID from the request.
    const { componentId } = await req.json();

    // Validate that the component ID is an integer.
    if (!Number.isInteger(componentId)) {
      return NextResponse.json(
        { error: "Choose a component" },
        { status: 400 }
      );
    }

    // Create a session to communicate with Neo4j.
    const session = getGraph().session();

    try {
      /*
         NEO4J GRAPH TRAVERSAL

         Find the selected component and all components
         that depend on it, directly or indirectly.
      */
      const result = await session.executeRead(
        (tx: ManagedTransaction) =>
          tx.run(
            `
            MATCH (changed:Component {id:$id})

            OPTIONAL MATCH p=(affected:Component)-[:DEPENDS_ON*1..]->(changed)

            WITH changed, affected, p ORDER BY length(p)

            WITH changed, affected, collect(p)[0] AS shortest

            WITH changed,
            collect(
              CASE WHEN affected IS NULL THEN null
              ELSE {
                id:affected.id,
                name:affected.name,
                kind:affected.kind,
                depth:length(shortest),
                path:[n IN nodes(shortest) | n.name]
              }
              END
            ) AS affected

            RETURN changed.name AS changed,
            [item IN affected WHERE item IS NOT NULL] AS affected
            `,
            { id: componentId }
          )
      );

      // Check whether the component exists in Neo4j.
      if (!result.records.length) {
        return NextResponse.json(
          {
            error: "Component not found in Neo4j; run the graph seed script"
          },
          { status: 404 }
        );
      }

      // Extract the affected components from the query result.
      const row = result.records[0];

      const affected = (row.get("affected") as any[])
        .filter(Boolean)
        .map(x => ({
          ...x,
          id: Number(x.id),
          depth: Number(x.depth)
        }));

      /*
         POSTGRESQL INTEGRATION

         Fetch the project's ID and save the impact
         analysis details in the impact_analyses table.
      */
      const component = await sql.query(
        "SELECT project_id FROM components WHERE id=$1",
        [componentId]
      );

      // Check whether the component exists in PostgreSQL.
      if (!component.rows[0]) {
        return NextResponse.json(
          { error: "Component not found in PostgreSQL" },
          { status: 404 }
        );
      }

      // Call the stored procedure to record the analysis.
      await sql.query(
        "CALL record_impact($1,$2,$3,$4)",
        [
          component.rows[0].project_id,
          componentId,
          user.id,
          affected.length
        ]
      );

      // Return the changed component and affected components.
      return NextResponse.json({
        changed: row.get("changed"),
        affected,
        createdAt: new Date().toISOString()
      });

    } finally {
      // Close the Neo4j session after the operation.
      await session.close();
    }

  } catch (e) {
    // Handle errors during authentication or impact analysis.
    return NextResponse.json(
      {
        error: e instanceof Error
          ? e.message
          : "Impact analysis failed"
      },
      { status: 400 }
    );
  }
}
