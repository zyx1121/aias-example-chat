import { NextResponse } from "next/server";
import { db, type Message } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = db();

  const messages = await sql<Message[]>`
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ${id}
    ORDER BY id ASC
  `;

  return NextResponse.json({ messages });
}
