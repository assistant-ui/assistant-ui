import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  jsonSchema,
  tool,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import {
  generateChartArgsSchema,
  showLocationArgsSchema,
} from "../../lib/inline-tool-schemas";

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
    stopWhen: stepCountIs(10),
    system:
      system ??
      "You are a helpful assistant that composes UI using OpenUI Lang when asked.",
    tools: {
      ...frontendToolDefs,

      // Backend tool: generate chart data
      generate_chart: tool({
        description:
          "Generate a chart. Return structured data for rendering a bar, line, or pie chart. Use this when the user asks for data visualization, charts, graphs, or comparisons.",
        inputSchema: zodSchema(generateChartArgsSchema),
        execute: async () => {
          return { success: true };
        },
      }),

      // Backend tool: show location on map
      show_location: tool({
        description:
          "Show a location on a map. Use this when the user asks about a place, wants to see directions, or needs to see a location.",
        inputSchema: zodSchema(showLocationArgsSchema),
        execute: async () => {
          return { success: true };
        },
      }),
    },
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
