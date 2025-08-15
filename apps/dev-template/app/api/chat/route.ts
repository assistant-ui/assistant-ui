import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  streamText,
  // UIMessage,
  convertToModelMessages,
} from "ai";

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    system,
    tools: {
      ...frontendTools(tools),
    },
    onError: console.log,
  });

  return result.toUIMessageStreamResponse();
}
