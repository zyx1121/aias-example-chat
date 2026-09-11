import postgres from "postgres";

declare global {
  // Keep one pool across hot reloads in development.
  var aiasSql: postgres.Sql | undefined;
}

// Lazy on purpose: `next build` imports every route module, and the platform
// only injects DATABASE_URL at start time.
export function db(): postgres.Sql {
  if (globalThis.aiasSql) return globalThis.aiasSql;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. The platform injects it when the app declares services.postgres.");
  }

  globalThis.aiasSql = postgres(connectionString, { max: 4 });
  return globalThis.aiasSql;
}

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
