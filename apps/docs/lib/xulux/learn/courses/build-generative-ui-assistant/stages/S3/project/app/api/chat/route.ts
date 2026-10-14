import { openai } from "@ai-sdk/openai";
import { AISDKToolkit, type FrontendTools } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import toolkit from "../../toolkit";

const aiToolkit = new AISDKToolkit({ toolkit });

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages, tools }: { messages: UIMessage[]; tools?: FrontendTools } =
    await request.json();
  const aiSDKTools = await aiToolkit.tools(
    tools ? { frontend: tools } : undefined,
  );
  const result = streamText({
    abortSignal: request.signal,
    model: openai("gpt-6-luna"),
    system:
      "You are a concise, helpful assistant. Use the weather tools for weather questions.",
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
