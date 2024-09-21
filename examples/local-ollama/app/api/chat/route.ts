import { createOllama } from "ollama-ai-provider";
import { createEdgeRuntimeAPI } from "@assistant-ui/react/edge";

const local_ollama = createOllama({
  baseURL: process.env.OLLAMA_API_URL,
});

export const { POST } = createEdgeRuntimeAPI({
  model: local_ollama("llama3.1"),
});