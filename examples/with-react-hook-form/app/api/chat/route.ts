import { openai } from "@ai-sdk/openai";
import { formTools } from "@assistant-ui/react-hook-form";
import { type Message, convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { system, messages } = (await req.json()) as {
    system: string;
    messages: Message[];
  };

  const result = await streamText({
    model: openai("gpt-4o"),
    system,
    messages: convertToCoreMessages(
      messages as Parameters<typeof convertToCoreMessages>[0],
    ),
    tools: formTools,
  });

  return result.toAIStreamResponse();
}
