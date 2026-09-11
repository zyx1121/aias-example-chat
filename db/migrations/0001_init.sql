-- Applied by the platform, in filename order, as the app's own role.
-- Must stay idempotent: it runs on every start.

CREATE TABLE IF NOT EXISTS conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              bigserial   PRIMARY KEY,
  conversation_id uuid        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx
  ON messages (conversation_id, id);

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
  ON conversations (updated_at DESC);
