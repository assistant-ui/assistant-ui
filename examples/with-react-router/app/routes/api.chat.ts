import type { Route } from "./+types/api.chat";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define available tools
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city name, e.g. San Francisco",
          },
        },
        required: ["location"],
      },
    },
  },
];

// Simple tool execution
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === "get_weather") {
    const location = args.location as string;
    // Simulate weather API call
    const temp = Math.floor(Math.random() * 30) + 10;
    const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return JSON.stringify({
      location,
      temperature: temp,
      unit: "celsius",
      condition,
    });
  }
  return JSON.stringify({ error: "Unknown tool" });
}

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const openaiMessages: ChatCompletionMessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }),
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let continueLoop = true;

      while (continueLoop) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          tools,
          stream: true,
        });

        let currentToolCalls: {
          id: string;
          name: string;
          arguments: string;
        }[] = [];
        let assistantContent = "";

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;

          // Handle text content
          if (delta?.content) {
            assistantContent += delta.content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`,
              ),
            );
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;

              if (!currentToolCalls[index]) {
                currentToolCalls[index] = {
                  id: toolCall.id || "",
                  name: toolCall.function?.name || "",
                  arguments: "",
                };
              }

              if (toolCall.id) {
                currentToolCalls[index].id = toolCall.id;
              }
              if (toolCall.function?.name) {
                currentToolCalls[index].name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                currentToolCalls[index].arguments +=
                  toolCall.function.arguments;
              }
            }
          }
        }

        // If there are tool calls, execute them and continue the loop
        if (currentToolCalls.length > 0) {
          // Add assistant message with tool calls
          openaiMessages.push({
            role: "assistant",
            content: assistantContent || null,
            tool_calls: currentToolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            })),
          });

          // Execute each tool and add results
          for (const toolCall of currentToolCalls) {
            // Send tool call event to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  id: toolCall.id,
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                })}\n\n`,
              ),
            );

            const args = JSON.parse(toolCall.arguments);
            const result = await executeTool(toolCall.name, args);

            // Send tool result event to client
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_result",
                  id: toolCall.id,
                  result,
                })}\n\n`,
              ),
            );

            // Add tool result to messages
            openaiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          }

          // Reset for next iteration
          currentToolCalls = [];
        } else {
          // No tool calls, we're done
          continueLoop = false;
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
