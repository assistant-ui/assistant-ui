import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  baseURL: process.env["OPENAI_BASE_URL"] as string,
});

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, apiKey } = await req.json();

  if (apiKey !== process.env["NEXT_PUBLIC_BACKEND_API_KEY"])
    throw new Error("Invalid API key");

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
  });

  return result.toDataStreamResponse();
}
