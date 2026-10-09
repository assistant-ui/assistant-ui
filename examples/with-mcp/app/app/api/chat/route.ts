import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import { convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();
  const aiSDKTools = { ...frontendTools(tools) };
  const result = streamText({
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    system,
    tools: aiSDKTools,
  });
  return result.toUIMessageStreamResponse();
}
