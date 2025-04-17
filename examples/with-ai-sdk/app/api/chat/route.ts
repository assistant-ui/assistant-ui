import { tools as exampleTools } from "@/lib/tools";
import { openai } from "@ai-sdk/openai";
import { jsonSchema, streamText } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    onError: (error) => {
      console.error("error: ", error);
    },
    // forward system prompt and tools from the frontend
    system,
    tools:
      tools &&
      exampleTools &&
      Object.fromEntries(
        Object.entries<{ parameters: unknown }>(tools).map(([name, tool]) => [
          name,
          {
            parameters: jsonSchema(tool.parameters!),
          },
        ]),
      ),
  });

  return result.toDataStreamResponse();
}
