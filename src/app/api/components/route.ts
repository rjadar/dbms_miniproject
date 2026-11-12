import { NextResponse } from "next/server";
import { replaceGraphFromPostgres, sql, writeGraph } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const user = await requireUser(); if (user.role !== "admin") return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    const { projectId, name, kind = "service", description = "" } = await req.json();
    if (!Number.isInteger(projectId) || !String(name).trim()) return NextResponse.json({ error: "Project and component name are required" }, { status: 400 });
    const { rows } = await sql.query("INSERT INTO components(project_id,name,kind,description) VALUES($1,$2,$3,$4) RETURNING *", [projectId, String(name).trim(), kind, description]);
    try {
      const result = await writeGraph("MERGE (c:Component {id:$id}) SET c.name=$name,c.kind=$kind RETURN count(c) AS matched", { id: rows[0].id, name: rows[0].name, kind: rows[0].kind });
      if (result.records[0]?.get("matched")?.toNumber() !== 1) throw new Error("Neo4j did not create the component node");
    } catch (graphError) {
      try {
        await sql.query("DELETE FROM components WHERE id=$1", [rows[0].id]);
        await replaceGraphFromPostgres();
      } catch { throw new Error("Neo4j component write failed and database compensation/resynchronization failed; check both databases before retrying"); }
      throw graphError;
    }
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Request failed" }, { status: 400 }); }
}
