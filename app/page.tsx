import { Chat } from "@/components/chat";
import { db, type Conversation } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sql = db();
  const conversations = await sql<Conversation[]>`
    SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
    LIMIT 100
  `;

  return <Chat initialConversations={conversations.map((row) => ({ id: row.id, title: row.title }))} />;
}
