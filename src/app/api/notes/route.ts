import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
async function collection() { return (await getMongoDb()).collection("component_notes"); }
export async function GET() {
  try { await requireUser(); const rows=await (await collection()).find({}, { projection:{_id:0} }).toArray(); return NextResponse.json(rows); }
  catch(e) { return NextResponse.json({ error:e instanceof Error?e.message:"MongoDB unavailable" },{status:400}); }
}
export async function POST(req:Request) {
  try {
    const user=await requireUser(); if(user.role!=="admin") return NextResponse.json({error:"Admin role required"},{status:403});
    const { componentName,note }=await req.json(); if(!String(componentName||"").trim()||!String(note||"").trim()) return NextResponse.json({error:"Component and note are required"},{status:400});
    await (await collection()).updateOne({componentName:String(componentName).trim()},{ $set:{componentName:String(componentName).trim(),note:String(note).trim(),updatedAt:new Date()}},{upsert:true});
    return NextResponse.json({ok:true});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"MongoDB unavailable"},{status:400}); }
}
export async function DELETE(req:Request) {
  try {
    const user=await requireUser(); if(user.role!=="admin") return NextResponse.json({error:"Admin role required"},{status:403});
    const name=new URL(req.url).searchParams.get("componentName"); if(!name) return NextResponse.json({error:"Component note not found"},{status:404});
    const result=await (await collection()).deleteOne({$or:[{componentName:name},{component_id:name}]});
    if(result.deletedCount===0) return NextResponse.json({error:"Component note not found"},{status:404});
    return NextResponse.json({ok:true});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"MongoDB unavailable"},{status:400}); }
}
