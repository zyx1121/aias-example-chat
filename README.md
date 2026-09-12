# Example Chat

> The app says `I need a chat model`, the platform says `it is at this port`.

[![CI](https://github.com/zyx1121/aias-example-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/zyx1121/aias-example-chat/actions) &nbsp;[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#license)

This is the reference app for the [AI App Store](https://github.com/zyx1121/ai-app-store). It is a chat window with a conversation list, and that is the whole point: it never downloads a model, never talks to the GPU, and never starts a database. It declares what it needs in `aias.yaml` and the platform hands it a model URL, a database URL and a port.

## Features

- **Chat with the local model**: streamed replies from the instance the platform started for the `chat` alias.
- **Keep the history**: conversations and messages live in the app's own Postgres database.
- **Run anywhere the contract holds**: one manifest, one build command, one start command, loopback only.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, standalone output) |
| Model API | `openai` package against `AIAS_MODEL_CHAT_URL` |
| Database | Postgres through the `postgres` package |
| Styling | Tailwind CSS 4 |
| Package manager | Bun |

## The manifest

```yaml
name: example-chat
runtime: node
build: ["bun", "run", "aias:build"]
start: ["node", ".next/standalone/server.js"]
health: /api/health

models:
  - alias: chat
    kind: llm
    repo: Qwen/Qwen3-8B-GGUF
    quant: [Q4_K_M]
    fallback: Qwen/Qwen3-4B-GGUF

services:
  postgres:
    migrations: db/migrations
```

`build` is a single command because the platform runs it as an argv array, where a shell `&&` has no meaning. The `aias:build` script does the install, the Next build, and the copy of `.next/static` and `public` into the standalone tree that Next requires.

## Environment

Everything below is injected by the platform. Nothing is read from a config file.

| Key | Value |
|-----|-------|
| `PORT` | The port to listen on, loopback only |
| `AIAS_MODEL_CHAT_URL` | Base URL of the model instance, ends in `/v1` |
| `AIAS_MODEL_CHAT_ID` | The model name to put in the request body |
| `AIAS_MODEL_CHAT_KEY` | Bearer token for that instance. It answers 401 without one |
| `DATABASE_URL` | Postgres DSN for this app's own database |
| `HOST`, `HOSTNAME` | `127.0.0.1`. The app must bind this; the platform reads the listening socket back and stops an app that bound anything else |

## Getting started

Local development needs two things the platform would otherwise provide: a Postgres database and an OpenAI compatible endpoint. A mock model server ships in `scripts/`.

```bash
git clone https://github.com/zyx1121/aias-example-chat && cd aias-example-chat
bun install
cp .env.example .env.local

createdb example_chat
DATABASE_URL=postgres://localhost/example_chat bun run migrate

bun run mock-model 41199   # a fixed streamed reply, in another terminal
bun dev
```

Point `AIAS_MODEL_CHAT_URL` at a real `llama-server` when you have one:

```bash
llama-server --model Qwen3-8B-Q4_K_M.gguf --port 41199 --api-key local-dev
```

Set `AIAS_MODEL_CHAT_KEY` to the same value. Leave it unset against the mock
model server, which asks for nothing.

### Production shape

```bash
bun run aias:build
PORT=41100 HOSTNAME=127.0.0.1 node .next/standalone/server.js
curl http://127.0.0.1:41100/api/health   # {"ok":true}
```

## Database

`db/migrations/*.sql` is applied by the platform, in filename order, as the app's own role, on every start. The files are idempotent for that reason. `bun run migrate` applies the same files locally and is for development only.

## Fork it

Change the system prompt in `app/api/chat/route.ts`, change the schema in `db/migrations`, change `name` in `aias.yaml`, publish to the index. That is the whole fork story.

## Contributing

Issues and PRs welcome: start with [CONTRIBUTING.md](https://github.com/zyx1121/.github/blob/main/CONTRIBUTING.md).

## License

[MIT](LICENSE) · the smallest app that still proves the contract.
