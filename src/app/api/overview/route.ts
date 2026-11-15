import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rows: projects } = await sql.query("SELECT id,name,description FROM projects ORDER BY id");
    const requestedId = Number(new URL(req.url).searchParams.get("projectId"));
    const selectedProject = (requestedId && projects.find((p: any) => p.id === requestedId)) || projects[0];
    if (!selectedProject) return NextResponse.json({ user, projects, project: null, components: [], edges: [], analyses: [], analysisCount: 0 });
    const project = await sql.query("SELECT * FROM projects WHERE id=$1", [selectedProject.id]);
    const pid = selectedProject.id;
    const [components, edges, analyses, analysisCount] = await Promise.all([
      sql.query("SELECT * FROM components WHERE project_id=$1 ORDER BY id", [pid]),
      sql.query("SELECT d.source_component_id AS source,d.target_component_id AS target FROM dependency_edges d JOIN components c ON c.id=d.source_component_id WHERE c.project_id=$1", [pid]),
      sql.query("SELECT a.id,a.affected_count,a.created_at,c.name AS component_name,u.email FROM impact_analyses a JOIN components c ON c.id=a.component_id LEFT JOIN app_users u ON u.id=a.changed_by WHERE a.project_id=$1 ORDER BY a.created_at DESC LIMIT 8", [pid]),
      sql.query("SELECT count(*)::int AS total FROM impact_analyses WHERE project_id=$1", [pid])
    ]);
    return NextResponse.json({ user, projects, project: project.rows[0], components: components.rows, edges: edges.rows, analyses: analyses.rows, analysisCount: analysisCount.rows[0].total });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load project data" }, { status: 503 }); }
}
