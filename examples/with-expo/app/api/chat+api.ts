import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
} from "ai";

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, tools } = body;

  const model = openai("gpt-4o-mini");

  const prunedMessages = pruneMessages({
    messages: await convertToModelMessages(messages),
    reasoning: "none",
  });

  const result = streamText({
    model,
    messages: prunedMessages,
    maxOutputTokens: 15000,
    stopWhen: stepCountIs(10),
    tools: frontendTools(tools),
  });

  return result.toUIMessageStreamResponse();
}
