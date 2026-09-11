// A stand in for the platform's llama-server instance, for local development
// and for CI. It speaks just enough of the OpenAI API to stream one reply.
//
//   node scripts/mock-model.mjs 41199
//   AIAS_MODEL_CHAT_URL=http://127.0.0.1:41199/v1 AIAS_MODEL_CHAT_ID=mock bun dev
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 41199);
const reply = process.env.MOCK_REPLY ?? "Hello from the mock model.";

createServer((request, response) => {
  if (request.url === "/v1/models") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ object: "list", data: [{ id: "mock", object: "model" }] }));
    return;
  }

  if (request.method !== "POST" || !request.url?.endsWith("/chat/completions")) {
    response.writeHead(404).end();
    return;
  }

  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    console.log("request:", body);
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const words = reply.split(" ");
    let index = 0;

    const timer = setInterval(() => {
      if (index < words.length) {
        const content = index === 0 ? words[index] : ` ${words[index]}`;
        response.write(
          `data: ${JSON.stringify({
            id: "mock",
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "mock",
            choices: [{ index: 0, delta: { content }, finish_reason: null }],
          })}\n\n`,
        );
        index += 1;
        return;
      }

      clearInterval(timer);
      response.write(
        `data: ${JSON.stringify({
          id: "mock",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: "mock",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        })}\n\n`,
      );
      response.write("data: [DONE]\n\n");
      response.end();
    }, 20);
  });
}).listen(port, "127.0.0.1", () => console.log(`mock model on http://127.0.0.1:${port}/v1`));
