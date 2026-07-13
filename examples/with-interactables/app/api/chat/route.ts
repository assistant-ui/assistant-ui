import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  frontendTools,
  type FrontendTools,
  unstable_injectInteractableContext,
} from "@assistant-ui/react-ai-sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: FrontendTools;
  } = await req.json();

  const modelMessages = await convertToModelMessages(
    unstable_injectInteractableContext(messages),
  );

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    ...(clientTools ? { tools: frontendTools(clientTools) } : {}),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
