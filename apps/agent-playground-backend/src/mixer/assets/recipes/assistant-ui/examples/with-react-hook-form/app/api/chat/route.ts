import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

const openai = createOpenAI({
  ...(process.env.OPENAI_BASE_URL && { baseURL: process.env.OPENAI_BASE_URL }),
  ...(process.env.OPENAI_API_KEY && { apiKey: process.env.OPENAI_API_KEY }),
});

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...frontendTools(tools),
    },
  });

  return result.toUIMessageStreamResponse();
}
