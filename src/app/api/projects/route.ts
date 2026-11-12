import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function POST(req:Request) {
  try { const u=await requireUser(); if(u.role!=="admin") return NextResponse.json({error:"Admin role required"},{status:403}); const {name,description=""}=await req.json(); if(!String(name||"").trim()) return NextResponse.json({error:"Project name is required"},{status:400}); const {rows}=await sql.query("INSERT INTO projects(name,description) VALUES($1,$2) RETURNING *",[String(name).trim(),description]); return NextResponse.json(rows[0],{status:201}); }
  catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Request failed"},{status:400}); }
}
