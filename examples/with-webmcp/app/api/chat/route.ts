import { openai } from "@ai-sdk/openai";
import {
  AISDKToolkit,
  type AISDKToolkitToolsOptions,
} from "@assistant-ui/ai-sdk";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import toolkit from "../../toolkit";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: NonNullable<AISDKToolkitToolsOptions["frontend"]>;
  } = await req.json();

  const result = streamText({
    model: openai("gpt-5.6-luna"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools: await aiToolkit.tools({ ...(tools && { frontend: tools }) }),
  });

  return result.toUIMessageStreamResponse();
}
