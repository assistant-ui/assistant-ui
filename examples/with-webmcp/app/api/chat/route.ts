import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
  stepCountIs,
} from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: openai("gpt-5.6-luna"),
    messages: await convertToModelMessages(messages),
    ...(system ? { system } : {}),
    stopWhen: stepCountIs(10),
    tools: frontendTools(tools ?? {}),
  });

  return result.toUIMessageStreamResponse();
}
