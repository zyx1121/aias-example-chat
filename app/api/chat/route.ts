import { db, type Conversation, type Message } from "@/lib/db";
import { chatModel } from "@/lib/model";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = "You are a helpful assistant running locally on the user's machine. Answer briefly.";

type ChatRequest = {
  conversationId?: string;
  message?: string;
};

export async function POST(request: Request) {
  const sql = db();
  const body = (await request.json()) as ChatRequest;
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  let conversationId = body.conversationId;

  if (!conversationId) {
    const title = message.length > 60 ? `${message.slice(0, 57)}...` : message;
    const [conversation] = await sql<Conversation[]>`
      INSERT INTO conversations (title) VALUES (${title})
      RETURNING id, title, created_at, updated_at
    `;
    conversationId = conversation.id;
  }

  await sql`
    INSERT INTO messages (conversation_id, role, content)
    VALUES (${conversationId}, 'user', ${message})
  `;

  const history = await sql<Pick<Message, "role" | "content">[]>`
    SELECT role, content
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY id ASC
    LIMIT 50
  `;

  const { client, model } = chatModel();

  const completion = await client.chat.completions.create({
    model,
    // Sampling belongs in the request body, never in the manifest.
    temperature: 0.7,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((row) => ({ role: row.role, content: row.content })),
    ],
  });

  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            answer += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (error) {
        const note = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(`\n[model error: ${note}]`));
      } finally {
        controller.close();
        await sql`
          INSERT INTO messages (conversation_id, role, content)
          VALUES (${conversationId}, 'assistant', ${answer})
        `;
        await sql`
          UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}
        `;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": conversationId,
    },
  });
}
