import { ollama } from "ollama-ai-provider";
import { streamText } from "ai";

const OLLAMA_MODEL = "llama3.1";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: ollama(OLLAMA_MODEL),
    messages,
  });
  return result.toDataStreamResponse();
}
