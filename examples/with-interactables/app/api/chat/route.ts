import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  AISDKToolkit,
  unstable_injectInteractableContext,
} from "@assistant-ui/react-ai-sdk";
import toolkit from "../../toolkits";

export const maxDuration = 30;

type ToolDef = { description?: string; parameters: Record<string, unknown> };

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, ToolDef>;
  } = await req.json();

  const aiToolkit = new AISDKToolkit({ toolkit });
  const modelMessages = await convertToModelMessages(
    unstable_injectInteractableContext(messages),
  );
  const tools = await aiToolkit.tools(
    clientTools ? { frontend: clientTools } : {},
  );

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools,
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
