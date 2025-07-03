import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: "You are a helpful assistant. Keep your responses concise.",
  });

  return result.toDataStreamResponse();
}