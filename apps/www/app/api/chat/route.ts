import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  apiKey: process.env["MDB_API_KEY"] ?? "-",
  baseURL: "https://llm.mdb.ai/",
});

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: openai("gpt-3.5-turbo"),
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      ...messages,
    ],
  });

  return result.toAIStreamResponse();
}
