import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import {
  AISDKToolkit,
  type AISDKToolkitToolsOptions,
} from "@assistant-ui/react-ai-sdk";
import {
  renderGuiToolDescription,
  renderGuiToolInputSchema,
} from "../../../lib/render-gui-tool";
import toolkit from "../../toolkit";

export const maxDuration = 30;

const aiToolkit = new AISDKToolkit({ toolkit });

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

  const toolkitTools = await aiToolkit.tools({
    ...(clientTools && { frontend: clientTools }),
  });

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...(system ? { system } : {}),
    tools: {
      ...toolkitTools,

      render_gui: tool({
        description: renderGuiToolDescription,
        inputSchema: zodSchema(renderGuiToolInputSchema),
        execute: async (input) => ({
          spec: input.spec,
        }),
      }),

      // Backend tool: generate chart data
      generate_chart: tool({
        description:
          "Generate a chart. Return structured data for rendering a bar, line, or pie chart. Use this when the user asks for data visualization, charts, graphs, or comparisons.",
        inputSchema: zodSchema(
          z.object({
            title: z.string().describe("Chart title"),
            type: z
              .enum(["bar", "line", "pie"])
              .describe("Chart type to render"),
            data: z
              .array(z.record(z.string(), z.union([z.string(), z.number()])))
              .describe(
                "Array of data objects, e.g. [{month: 'Jan', revenue: 100}]",
              ),
            xKey: z
              .string()
              .describe("Key in each data object to use for the x-axis/labels"),
            dataKeys: z
              .array(z.string())
              .describe("Keys in each data object to chart as series/values"),
          }),
        ),
        execute: async () => {
          return { success: true };
        },
      }),

      // Backend tool: show location on map
      show_location: tool({
        description:
          "Show a location on a map. Use this when the user asks about a place, wants to see directions, or needs to see a location.",
        inputSchema: zodSchema(
          z.object({
            name: z.string().describe("Name of the place"),
            address: z.string().optional().describe("Street address"),
            lat: z.number().describe("Latitude"),
            lng: z.number().describe("Longitude"),
          }),
        ),
        execute: async () => {
          return { success: true };
        },
      }),
    },
  } as Parameters<typeof streamText>[0]);

  return result.toUIMessageStreamResponse();
}
