"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Conversation = { id: string; title: string };
type Message = { id: number | string; role: "user" | "assistant"; content: string };

export function Chat({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/conversations");
    const data = await response.json();
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    setActiveId(id);
    const response = await fetch(`/api/conversations/${id}/messages`);
    const data = await response.json();
    setMessages(data.messages ?? []);
  }

  function newConversation() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);
    setMessages((current) => [
      ...current,
      { id: `local-user-${Date.now()}`, role: "user", content: text },
      { id: "local-assistant", role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message: text }),
      });

      const conversationId = response.headers.get("X-Conversation-Id");
      if (conversationId) setActiveId(conversationId);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } finally {
      setBusy(false);
      void loadConversations();
    }
  }

  return (
    <main className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted">
        <div className="border-b border-border p-3">
          <button
            onClick={newConversation}
            className="w-full rounded border border-border px-3 py-2 text-sm hover:bg-background"
          >
            New chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => openConversation(conversation.id)}
              className={`block w-full truncate rounded px-3 py-2 text-left text-sm hover:bg-background ${
                conversation.id === activeId ? "bg-background" : ""
              }`}
            >
              {conversation.title}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-sm opacity-60">No conversations yet.</p>
          )}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-2xl whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                  message.role === "user" ? "bg-muted" : "border border-border"
                }`}
              >
                {message.content || (busy ? "..." : "")}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm opacity-60">Ask the local model something.</p>
          )}
          <div ref={bottom} />
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message"
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
