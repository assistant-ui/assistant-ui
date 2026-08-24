import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import {
  AISDKToolkit,
  type AISDKToolkitToolsOptions,
} from "@assistant-ui/ai-sdk";
import presentToolkit from "../../present-toolkit";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit: presentToolkit });

type FrontendToolDefs = NonNullable<AISDKToolkitToolsOptions["frontend"]>;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: FrontendToolDefs;
  } = await req.json();

  const result = streamText({
    model: openai("gpt-5.6-luna"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools: await aiToolkit.tools({
      ...(clientTools && { frontend: clientTools }),
    }),
  });

  return result.toUIMessageStreamResponse();
}
