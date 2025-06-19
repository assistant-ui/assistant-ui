import { AssistantResponse } from "ai";
import OpenAI from "openai";
import type { Run } from "openai/resources/beta/threads/runs/runs";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const openai = new OpenAI();

  // Parse the request body
  const input: {
    threadId: string | null;
    message: string;
  } = await req.json();

  // Create a thread if needed
  const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;

  // Add a message to the thread
  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: input.message,
  });

  return AssistantResponse(
    { threadId, messageId: createdMessage.id },
    async ({ forwardStream, sendDataMessage }) => {
      // Run the assistant on the thread
      const runStream = openai.beta.threads.runs.stream(threadId, {
        assistant_id:
          process.env["ASSISTANT_ID"] ??
          (() => {
            throw new Error("ASSISTANT_ID is not set");
          })(),
      });

      // forward run status would stream message deltas
      let runResult: Run = await forwardStream(runStream);

      // status can be: queued, in_progress, requires_action, cancelling, cancelled, failed, completed, or expired
      while (
        runResult?.status === "requires_action" &&
        runResult.required_action?.type === "submit_tool_outputs"
      ) {
        const tool_outputs = await Promise.all(
          runResult.required_action.submit_tool_outputs.tool_calls.map(
            async (toolCall) => {
              const args = JSON.parse(toolCall.function.arguments);

              switch (toolCall.function.name) {
                // configure your tool calls here

                case "get_weather":
                  const { unit } = args;

                  sendDataMessage({
                    role: "data",
                    data: {
                      type: "tool-call",
                      toolCallId: toolCall.id,
                      toolName: toolCall.function.name,
                      args,
                    },
                  });

                  await new Promise((resolve) => setTimeout(resolve, 5000));

                  const result = { t: unit === "c" ? 21 : 70 };

                  sendDataMessage({
                    role: "data",
                    data: {
                      type: "tool-result",
                      toolCallId: toolCall.id,
                      result,
                    },
                  });

                  return {
                    tool_call_id: toolCall.id,
                    output: JSON.stringify(result),
                  };

                default:
                  throw new Error(
                    `Unknown tool call function: ${toolCall.function.name}`,
                  );
              }
            },
          ),
        );

        runResult = await forwardStream(
          openai.beta.threads.runs.submitToolOutputsStream(runResult.id, {
            thread_id: threadId,
            tool_outputs,
          }),
        );
      }
    },
  );
}
