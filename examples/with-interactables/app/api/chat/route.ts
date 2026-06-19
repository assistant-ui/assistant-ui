import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  AISDKToolkit,
  type AISDKToolkitToolsOptions,
  unstable_injectInteractableContext,
} from "@assistant-ui/react-ai-sdk";
import toolkit from "../../toolkits";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

type FrontendTools = NonNullable<AISDKToolkitToolsOptions["frontend"]>;

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
    tools: await aiToolkit.tools({
      ...(clientTools && { frontend: clientTools }),
    }),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
