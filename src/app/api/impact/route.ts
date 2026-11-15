import { NextResponse } from "next/server";
import type { ManagedTransaction } from "neo4j-driver";
import { getGraph, sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const user = await requireUser(); const { componentId } = await req.json();
    if (!Number.isInteger(componentId)) return NextResponse.json({ error: "Choose a component" }, { status: 400 });
    const session = getGraph().session();
    try {
      const result = await session.executeRead((tx: ManagedTransaction) => tx.run(`MATCH (changed:Component {id:$id})
        OPTIONAL MATCH p=(affected:Component)-[:DEPENDS_ON*1..]->(changed)
        WITH changed, affected, p ORDER BY length(p)
        WITH changed, affected, collect(p)[0] AS shortest
        WITH changed, collect(CASE WHEN affected IS NULL THEN null ELSE {id:affected.id,name:affected.name,kind:affected.kind,depth:length(shortest),path:[n IN nodes(shortest) | n.name]} END) AS affected
        RETURN changed.name AS changed, [item IN affected WHERE item IS NOT NULL] AS affected`, { id: componentId }));
      if (!result.records.length) return NextResponse.json({ error: "Component not found in Neo4j; run the graph seed script" }, { status: 404 });
      const row=result.records[0], affected=(row.get("affected") as any[]).filter(Boolean).map(x=>({ ...x, id: Number(x.id), depth: Number(x.depth) }));
      const component = await sql.query("SELECT project_id FROM components WHERE id=$1",[componentId]);
      if (!component.rows[0]) return NextResponse.json({ error: "Component not found in PostgreSQL" }, { status: 404 });
      await sql.query("CALL record_impact($1,$2,$3,$4)",[component.rows[0].project_id,componentId,user.id,affected.length]);
      return NextResponse.json({ changed: row.get("changed"), affected, createdAt: new Date().toISOString() });
    } finally { await session.close(); }
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Impact analysis failed" }, { status: 400 }); }
}
