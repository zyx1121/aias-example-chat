import OpenAI from "openai";

// The platform injects one pair of variables per alias declared in aias.yaml.
// This app declares a single alias: chat.
const baseURL = process.env.AIAS_MODEL_CHAT_URL;
const model = process.env.AIAS_MODEL_CHAT_ID;

export function chatModel() {
  if (!baseURL || !model) {
    throw new Error("AIAS_MODEL_CHAT_URL and AIAS_MODEL_CHAT_ID must be set by the platform.");
  }

  // The instance is a local llama-server, it needs no credential.
  const client = new OpenAI({ baseURL, apiKey: "aias" });
  return { client, model };
}
