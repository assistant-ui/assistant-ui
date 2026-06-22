import { mastra } from "@/mastra";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

type IncomingMessage = {
  id?: string;
  role?: string;
  type?: string;
  content?: unknown;
};

const normalizeRole = (message: IncomingMessage) => {
  if (message.role) return message.role;

  switch (message.type) {
    case "human":
      return "user";
    case "assistant":
    case "system":
    case "tool":
      return message.type;
    default:
      return "user";
  }
};

const normalizeContent = (content: unknown) => {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (Array.isArray(content)) {
    return content.map((part) => {
      if (
        typeof part === "object" &&
        part != null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part
      ) {
        return part;
      }

      return { type: "text", text: JSON.stringify(part) };
    });
  }

  return [{ type: "text", text: String(content ?? "") }];
};

const normalizeMessages = (messages: IncomingMessage[]) =>
  messages.map((message) => ({
    ...(message.id && { id: message.id }),
    role: normalizeRole(message),
    content: normalizeContent(message.content),
  }));

export async function POST(req: NextRequest) {
  try {
    if (!process.env["OPENAI_API_KEY"]) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is required to run Mastra agents",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

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
    const result = await agent.stream(normalizeMessages(messages), {
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
            } catch {
              isClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch {
              isClosed = true;
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
