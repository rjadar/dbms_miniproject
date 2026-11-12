import { NextResponse } from "next/server";
import { replaceGraphFromPostgres, sql, writeGraph } from "@/lib/db";
import { requireUser } from "@/lib/auth";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { id: rawId } = await params, id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid component ID" }, { status: 400 });
    const current = await sql.query("SELECT id,name,kind,description FROM components WHERE id=$1", [id]);
    if (!current.rows[0]) return NextResponse.json({ error: "Component not found" }, { status: 404 });
    const input = await req.json();
    const next = {
      name: input.name === undefined ? current.rows[0].name : String(input.name).trim(),
      kind: input.kind === undefined ? current.rows[0].kind : String(input.kind).trim(),
      description: input.description === undefined ? current.rows[0].description : String(input.description)
    };
    if (!next.name || !next.kind) return NextResponse.json({ error: "Name and kind cannot be empty" }, { status: 400 });

    let graphResult: Awaited<ReturnType<typeof writeGraph>>;
    try { graphResult = await writeGraph("MATCH (c:Component {id:$id}) SET c.name=$name,c.kind=$kind RETURN c.id AS matched", { id, name: next.name, kind: next.kind }); }
    catch (graphError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("Neo4j component update failed and graph resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    if (!graphResult.records.length) {
      try {
        await replaceGraphFromPostgres();
        graphResult = await writeGraph("MATCH (c:Component {id:$id}) SET c.name=$name,c.kind=$kind RETURN c.id AS matched", { id, name: next.name, kind: next.kind });
      } catch { throw new Error("Neo4j component was missing and graph resynchronization failed; check both databases before retrying"); }
    }
    if (!graphResult.records.length) return NextResponse.json({ error: "Neo4j is missing this component; synchronize the graph before editing" }, { status: 409 });
    try {
      const updated = await sql.query("UPDATE components SET name=$2,kind=$3,description=$4 WHERE id=$1 RETURNING *", [id, next.name, next.kind, next.description]);
      return NextResponse.json(updated.rows[0]);
    } catch (sqlError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("PostgreSQL component update failed and graph resynchronization failed; check both databases before retrying"); }
      throw sqlError;
    }
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { id: rawId } = await params, id = Number(rawId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid component ID" }, { status: 400 });
    const exists = await sql.query("SELECT id FROM components WHERE id=$1", [id]);
    if (!exists.rows[0]) return NextResponse.json({ error: "Component not found" }, { status: 404 });

    try { await writeGraph("MATCH (c:Component {id:$id}) DETACH DELETE c RETURN count(c) AS deleted", { id }); }
    catch (graphError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("Neo4j component delete failed and graph resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    try {
      await sql.query("DELETE FROM components WHERE id=$1", [id]);
    } catch (sqlError) {
      try { await replaceGraphFromPostgres(); }
      catch { throw new Error("PostgreSQL delete failed and Neo4j restoration failed; synchronize the graph before continuing"); }
      throw sqlError;
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}
