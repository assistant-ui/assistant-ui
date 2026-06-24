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

    // Get the specified agent
    const agent = mastra.getAgent(agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ error: `Agent '${agentId}' not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Stream with Mastra's native format. Only pass the memory option when a
    // threadId is present so memory-disabled clients still work.
    const result = await agent.stream(normalizeMessages(messages), {
      ...(threadId && {
        memory: {
          thread: threadId,
          resource: resourceId,
        },
      }),
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

          // Get tool calls and results after streaming completes.
          // The client renders tool invocations from accumulated message
          // content, so emit each call (joined with its result) as a
          // `tool_call` content part on the assistant message. Standalone
          // tool/call and tool/result events only fire side-effect callbacks
          // and never reach the accumulator, so the tool would otherwise stay
          // stuck in its executing state.
          const toolCalls = await result.toolCalls;
          const toolResults = await result.toolResults;
          const resultByCallId = new Map<
            string | undefined,
            { result?: unknown; isError?: boolean; toolName?: string }
          >();
          for (const tr of toolResults ?? []) {
            if (tr.payload)
              resultByCallId.set(tr.payload.toolCallId, tr.payload);
          }

          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (isClosed) break;

              const callId = toolCall.payload?.toolCallId;
              const toolResult = resultByCallId.get(callId);
              const isError = Boolean(toolResult?.isError);
              const toolCallEvent = {
                id: uuidv4(),
                event: "message/partial",
                data: {
                  id: messageId,
                  type: "assistant",
                  content: [
                    {
                      type: "tool_call",
                      tool_call: {
                        id: callId,
                        name: toolCall.payload?.toolName,
                        arguments: toolCall.payload?.args ?? {},
                        ...(toolResult && { result: toolResult.result }),
                        status: toolResult
                          ? isError
                            ? "output-error"
                            : "complete"
                          : "input-available",
                        ...(isError && {
                          error: String(toolResult?.result),
                        }),
                      },
                    },
                  ],
                  timestamp: new Date().toISOString(),
                  status: "running",
                },
                timestamp: new Date().toISOString(),
              };
              safeEnqueue(
                encoder.encode(`data: ${JSON.stringify(toolCallEvent)}\n\n`),
              );
            }
          }

          if (isClosed) return;

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
