import { NextResponse } from "next/server";
import { db, type Conversation } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = db();
  const conversations = await sql<Conversation[]>`
    SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
    LIMIT 100
  `;
  return NextResponse.json({ conversations });
}

export async function POST() {
  const sql = db();
  const [conversation] = await sql<Conversation[]>`
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id, title, created_at, updated_at
  `;
  return NextResponse.json({ conversation }, { status: 201 });
}
