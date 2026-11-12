import { NextResponse } from "next/server";
import { replaceGraph, replaceGraphFromPostgres, sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { id: rawId } = await params, id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    const { name, description } = await req.json();
    const updated = await sql.query("UPDATE projects SET name=COALESCE($2,name),description=COALESCE($3,description) WHERE id=$1 RETURNING *", [id, name, description]);
    return updated.rows[0] ? NextResponse.json(updated.rows[0]) : NextResponse.json({ error: "Project not found" }, { status: 404 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { id: rawId } = await params, id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    const project = await sql.query("SELECT id FROM projects WHERE id=$1", [id]);
    if (!project.rows[0]) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const [componentResult, edgeResult] = await Promise.all([
      sql.query("SELECT id,project_id,name,kind FROM components ORDER BY id"),
      sql.query("SELECT source_component_id AS source,target_component_id AS target FROM dependency_edges ORDER BY source_component_id,target_component_id")
    ]);
    const allComponents = componentResult.rows;
    const removedIds = new Set(allComponents.filter((row: { project_id: number }) => row.project_id === id).map((row: { id: number }) => row.id));
    const remainingComponents = allComponents.filter((component: { id: number }) => !removedIds.has(component.id));
    const allEdges = edgeResult.rows;
    const remainingEdges = allEdges.filter((edge: { source: number; target: number }) => !removedIds.has(edge.source) && !removedIds.has(edge.target));

    // Replace the small graph before the SQL cascade. On SQL failure, restore from the still-current SQL rows.
    try { await replaceGraph(remainingComponents, remainingEdges); }
    catch (graphError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("Neo4j project cleanup failed and graph resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    try {
      await sql.query("DELETE FROM projects WHERE id=$1", [id]);
    } catch (sqlError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("PostgreSQL project delete failed and Neo4j restoration failed; synchronize the graph before continuing"); }
      throw sqlError;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}
