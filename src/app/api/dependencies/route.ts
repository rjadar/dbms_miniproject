import { NextResponse } from "next/server";
import { replaceGraphFromPostgres, sql, writeGraph } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function matched(result: any) { return result.records[0]?.get("matched")?.toNumber() ?? 0; }

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { sourceId, targetId } = await req.json();
    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId) || sourceId === targetId) return NextResponse.json({ error: "Choose two different components" }, { status: 400 });

    const endpoints = await sql.query("SELECT id,project_id FROM components WHERE id=ANY($1::int[])", [[sourceId, targetId]]);
    if (endpoints.rows.length !== 2 || endpoints.rows[0].project_id !== endpoints.rows[1].project_id) return NextResponse.json({ error: "Both components must exist in the same project" }, { status: 400 });

    let graphResult: Awaited<ReturnType<typeof writeGraph>>;
    try {
      graphResult = await writeGraph(`MATCH (a:Component {id:$a}),(b:Component {id:$b})
        WITH a,b
        MERGE (a)-[r:DEPENDS_ON]->(b)
        RETURN count(r) AS matched`, { a: sourceId, b: targetId });
      if (matched(graphResult) !== 1) {
        await replaceGraphFromPostgres();
        graphResult = await writeGraph(`MATCH (a:Component {id:$a}),(b:Component {id:$b})
          WITH a,b
          MERGE (a)-[r:DEPENDS_ON]->(b)
          RETURN count(r) AS matched`, { a: sourceId, b: targetId });
      }
    } catch (graphError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("Neo4j dependency write failed and graph resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    if (matched(graphResult) !== 1) return NextResponse.json({ error: "Neo4j is missing one or both component nodes; synchronize the graph before adding this dependency" }, { status: 409 });

    try {
      await sql.query("INSERT INTO dependency_edges(source_component_id,target_component_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [sourceId, targetId]);
    } catch (sqlError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("PostgreSQL dependency write failed and graph resynchronization failed; check both databases before retrying"); }
      throw sqlError;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const sourceId = Number(searchParams.get("sourceId")), targetId = Number(searchParams.get("targetId"));
    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) return NextResponse.json({ error: "Choose a valid dependency" }, { status: 400 });

    let graphResult: Awaited<ReturnType<typeof writeGraph>>;
    try { graphResult = await writeGraph("MATCH (a:Component {id:$a})-[r:DEPENDS_ON]->(b:Component {id:$b}) DELETE r RETURN count(r) AS matched", { a: sourceId, b: targetId }); }
    catch (graphError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("Neo4j dependency delete failed and graph resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    try {
      await sql.query("DELETE FROM dependency_edges WHERE source_component_id=$1 AND target_component_id=$2", [sourceId, targetId]);
    } catch (sqlError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("PostgreSQL dependency delete failed and graph resynchronization failed; check both databases before retrying"); }
      throw sqlError;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}
