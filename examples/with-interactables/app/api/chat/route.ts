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

  // Convert client-defined tools (forwarded from model context) to AI SDK format.
  // These have no `execute` — they are frontend tools executed on the client
  // via useAssistantTool / useAssistantInteractable.
  const tools = clientTools
    ? Object.fromEntries(
        Object.entries(clientTools).map(([name, def]) => [
          name,
          {
            description: def.description ?? "",
            inputSchema: jsonSchema(def.parameters),
          },
        ]),
      )
    : undefined;

  const result = streamText({
    model: openai("gpt-4o"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    ...(tools ? { tools } : {}),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
