import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  frontendTools,
  type FrontendTools,
  unstable_injectInteractableContext,
} from "@assistant-ui/ai-sdk";

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

  const aiSDKTools = clientTools ? frontendTools(clientTools) : undefined;
  const modelMessages = await convertToModelMessages(
    unstable_injectInteractableContext(messages),
    aiSDKTools ? { tools: aiSDKTools } : {},
  );

  const result = streamText({
    model: openai("gpt-6-luna"),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    ...(aiSDKTools ? { tools: aiSDKTools } : {}),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
