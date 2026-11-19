
import { NextResponse } from "next/server";
// NextResponse is used to send HTTP responses from our API.

import { getMongoDb } from "@/lib/db";
// Imports the function that connects to our MongoDB database.

import { requireUser } from "@/lib/auth";
// Checks whether the user is logged in before allowing access.


/* 
   COLLECTION SETUP

   This function connects to MongoDB and selects the
   "component_notes" collection.

   Database: impact_demo
   Collection: component_notes
*/
async function collection() {
  return (await getMongoDb()).collection("component_notes");
}


/*
   1. GET METHOD — READ NOTES

   Retrieves all component notes stored in MongoDB.
   Only logged-in users can access the notes.
*/
export async function GET() {
  try {
    await requireUser(); // Check if the user is authenticated.

    const rows = await (await collection())
      .find({}, { projection: { _id: 0 } })
      .toArray();

    // find() retrieves documents; toArray() converts them into an array.
    // projection: { _id: 0 } hides MongoDB's default _id field.

    return NextResponse.json(rows); // Send notes as JSON.
  } 
  catch (e) {
    // Handle errors, such as authentication or database failures.
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "MongoDB unavailable"
      },
      { status: 400 }
    );
  }
}


/*
   2. POST METHOD — INSERT OR UPDATE NOTES

   Allows an admin to add a new note or update an existing one.
*/
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    // Only users with the admin role can modify notes.
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin role required" },
        { status: 403 }
      );
    }

    // Read componentName and note from the incoming request.
    const { componentName, note } = await req.json();

    // Validate that both fields contain non-empty values.
    if (
      !String(componentName || "").trim() ||
      !String(note || "").trim()
    ) {
      return NextResponse.json(
        { error: "Component and note are required" },
        { status: 400 }
      );
    }

    // updateOne() updates an existing document.
    // $set specifies the fields to insert or update.
    // upsert: true creates a document if no matching one exists.
    await (await collection()).updateOne(
      { componentName: String(componentName).trim() },
      {
        $set: {
          componentName: String(componentName).trim(),
          note: String(note).trim(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } 
  catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "MongoDB unavailable"
      },
      { status: 400 }
    );
  }
}


/*
   3. DELETE METHOD — DELETE A NOTE

   Allows an admin to delete a component note using
   its componentName.
*/
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();

    // Only admins are allowed to delete notes.
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin role required" },
        { status: 403 }
      );
    }

    // Extract componentName from the URL query parameter.
    const name = new URL(req.url).searchParams.get("componentName");

    if (!name) {
      return NextResponse.json(
        { error: "Component note not found" },
        { status: 404 }
      );
    }

    // deleteOne() deletes the first matching document.
    // $or checks either componentName or component_id.
    const result = await (await collection()).deleteOne({
      $or: [
        { componentName: name },
        { component_id: name }
      ]
    });

    // Check whether a document was actually deleted.
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Component note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } 
  catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "MongoDB unavailable"
      },
      { status: 400 }
    );
  }
}
