import { mastra } from "@/mastra";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      threadId,
      resourceId = "default-user",
      agentId = "screeningAgent",
    } = await req.json();

    // Validate required memory parameters
    if (!threadId) {
      return new Response(
        JSON.stringify({ error: "threadId is required for memory" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Get the specified agent
    const agent = mastra.getAgent(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ error: `Agent '${agentId}' not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Stream with Mastra's native format
    const result = await agent.stream(messages, {
      memory: {
        thread: threadId,
        resource: resourceId,
      },
    });

    // Create a custom stream that converts Mastra format to our expected format
    const encoder = new TextEncoder();
    const messageId = uuidv4();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error("Chat API: Enqueue error:", error);
              isClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch (error) {
              console.error("Chat API: Close error:", error);
            }
          }
        };

        try {
          // Mastra's default format returns a MastraModelOutput with textStream
          for await (const chunk of result.textStream) {
            if (isClosed) break;

            // Send as Mastra message/partial event with DELTA only
            // The client-side appendMastraChunk will handle accumulation
            const event = {
              id: uuidv4(),
              event: "message/partial",
              data: {
                id: messageId,
                type: "assistant",
                content: [
                  {
                    type: "text",
                    text: chunk, // Send only the delta, not accumulated text
                  },
                ],
                timestamp: new Date().toISOString(),
                status: "running",
              },
              timestamp: new Date().toISOString(),
            };

            safeEnqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }

          if (isClosed) return;

          // Get tool calls after streaming completes
          const toolCalls = await result.toolCalls;

          // Send tool call events if any tools were called
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              const toolEvent = {
                id: uuidv4(),
                event: "tool/call",
                data: {
                  toolCallId: toolCall.payload?.toolCallId,
                  toolName: toolCall.payload?.toolName,
                  args: toolCall.payload?.args,
                },
                timestamp: new Date().toISOString(),
              };
              safeEnqueue(
                encoder.encode(`data: ${JSON.stringify(toolEvent)}\n\n`),
              );
            }
          }

          // Send completion event - only update status, no content
          // The client has already accumulated all the text from deltas
          const completeEvent = {
            id: uuidv4(),
            event: "message/complete",
            data: {
              id: messageId,
              type: "assistant",
              content: [], // Empty content - text already accumulated
              timestamp: new Date().toISOString(),
              status: "complete",
            },
            timestamp: new Date().toISOString(),
          };

          safeEnqueue(
            encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`),
          );

          // Send done event
          safeEnqueue(encoder.encode("data: [DONE]\n\n"));
          safeClose();
        } catch (error) {
          console.error("Chat API: Stream error:", error);
          if (!isClosed) {
            const errorEvent = {
              id: uuidv4(),
              event: "error",
              data: error instanceof Error ? error.message : "Unknown error",
              timestamp: new Date().toISOString(),
            };
            safeEnqueue(
              encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
            );
            safeClose();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
