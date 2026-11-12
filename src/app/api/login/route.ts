import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { setSession } from "@/lib/auth";
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const { rows } = await sql.query("SELECT id,email,password_hash,role FROM app_users WHERE email=$1", [String(email).trim().toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(String(password), rows[0].password_hash))) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  await setSession({ id: rows[0].id, email: rows[0].email, role: rows[0].role });
  return NextResponse.json({ ok: true });
}
