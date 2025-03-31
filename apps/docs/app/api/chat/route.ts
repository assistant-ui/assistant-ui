import { createOpenAI } from "@ai-sdk/openai";
import { createDataStreamResponse, streamText, tool } from "ai";
import { z } from "zod";

const openai = createOpenAI({
  baseURL: process.env["OPENAI_BASE_URL"] as string,
});

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, apiKey } = await req.json();

  if (apiKey !== process.env["NEXT_PUBLIC_BACKEND_API_KEY"])
    throw new Error("Invalid API key");

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    tools: {
      weather: tool({
        description: "Get weather information",
        parameters: z.object({
          location: z.string().describe("Location to get weather for"),
        }),
        execute: async ({ location }) => {
          return `The weather in ${location} is sunny.`;
        },
      }),
    },
  });

  return createDataStreamResponse({
    execute: async (writer) => {
      result.mergeIntoDataStream(writer);
      writer.writeData("hello");
      writer.writeMessageAnnotation("hello");
      writer.writeSource({
        sourceType: "url",
        id: "1",
        url: "https://example.com",
      });
    },
  });
}
