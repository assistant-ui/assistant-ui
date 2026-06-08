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

const SYSTEM =
  "You are a helpful assistant that renders artifacts. Use create_html_artifact " +
  "for a self-contained HTML document, and create_react_artifact for an " +
  "interactive single-file React component (TSX with a default export). Prefer " +
  "an artifact tool over showing code in a code block.";

export async function POST(req: Request) {
  const {
    messages,
    tools: clientTools,
  }: { messages: UIMessage[]; tools?: Record<string, ToolDef> } =
    await req.json();

  // The artifact tools are frontend/human tools executed on the client via
  // Tools({ toolkit }); the client forwards their schemas in the request, and
  // we relay them to the model without a server `execute`.
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
    model: openai("gpt-5.4-nano"),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...(tools ? { tools } : {}),
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
