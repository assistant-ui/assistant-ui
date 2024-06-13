import { openai } from "@ai-sdk/openai";
import { formTools } from "@assistant-ui/react-hook-form";
import { type CoreMessage, type Message, streamText } from "ai";
import { convertToCoreMessage } from "../../../lib/convertToCoreMessage";

export const runtime = "edge";

export async function POST(req: Request) {
  const { system, messages } = (await req.json()) as {
    system: string;
    messages: Message[];
  };

  const coreMessages: CoreMessage[] = messages.flatMap(convertToCoreMessage);

  const result = await streamText({
    model: openai("gpt-4o"),
    system,
    messages: coreMessages,
    tools: formTools,
  });

  return result.toAIStreamResponse();
}
