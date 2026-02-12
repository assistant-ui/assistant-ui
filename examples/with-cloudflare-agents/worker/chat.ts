import { AIChatAgent } from "@cloudflare/ai-chat";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  zodSchema,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { z } from "zod";

export class Chat extends AIChatAgent<Env> {
  override async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal },
  ) {
    const tools = {
      get_weather: tool({
        description: "Get the current weather for a location",
        inputSchema: zodSchema(
          z.object({
            location: z.string().describe("The city name"),
          }),
        ),
        execute: async ({ location }) => {
          // Simulated weather response
          const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
          const condition =
            conditions[Math.floor(Math.random() * conditions.length)];
          const temp = Math.floor(Math.random() * 30) + 50;
          return `Weather in ${location}: ${condition}, ${temp}°F`;
        },
      }),
    };

    // Create OpenAI provider with API key from environment
    const openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          system: "You are a helpful assistant.",
          messages: await convertToModelMessages(this.messages),
          tools,
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<
            typeof tools
          >,
          ...(options?.abortSignal && { abortSignal: options.abortSignal }),
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
}
