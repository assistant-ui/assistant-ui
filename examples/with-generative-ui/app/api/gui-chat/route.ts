import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  jsonSchema,
} from "ai";
import type { UIMessage } from "ai";

export const maxDuration = 30;

type ToolDef = { description?: string; parameters: Record<string, unknown> };

/** OpenUI Lang-only chat — no backend chart/map tools that compete with generative UI. */
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

  const frontendToolDefs = clientTools
    ? Object.fromEntries(
        Object.entries(clientTools).map(([name, def]) => [
          name,
          {
            description: def.description ?? "",
            inputSchema: jsonSchema(def.parameters),
          },
        ]),
      )
    : {};

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    system:
      system ??
      "You are a helpful assistant that composes UI using OpenUI Lang when asked.",
    tools: frontendToolDefs,
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
