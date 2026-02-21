import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system:
      "You are a helpful assistant that can generate HTML code. When the user asks you to create any visual content, UI, or webpage, use the render_html tool to render it in the browser. Always use the render_html tool for HTML output rather than showing code in a code block.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      render_html: tool({
        description:
          "Render HTML code in the user's browser. Use this whenever the user asks for HTML, a webpage, a UI component, or any visual content.",
        inputSchema: zodSchema(
          z.object({
            code: z
              .string()
              .describe(
                "The complete HTML code to render, including inline CSS and JavaScript if needed.",
              ),
          }),
        ),
        execute: async () => {
          return { success: true };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
