import {
  createAssistantStreamResponse,
  type ToolCallStreamController,
} from "assistant-stream";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "assistant-stream/utils";
import { playFixture } from "./fixtures";
import { fixtureStepsFor } from "./request";

/** Answers `createVSCodeModelAdapter` with an assistant-stream data stream. */
export async function POST(req: Request): Promise<Response> {
  const steps = await fixtureStepsFor(req);

  return createAssistantStreamResponse(async (controller) => {
    const toolCalls = new Map<string, ToolCallStreamController>();
    for await (const event of playFixture(steps, { signal: req.signal })) {
      switch (event.type) {
        case "text-delta":
          controller.appendText(event.delta);
          break;
        case "tool-call": {
          const toolCall = controller.addToolCallPart({
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args as ReadonlyJSONObject,
          });
          toolCalls.set(event.toolCallId, toolCall);
          break;
        }
        case "tool-result":
          toolCalls.get(event.toolCallId)?.setResponse({
            result: event.result as ReadonlyJSONValue,
          });
          toolCalls.delete(event.toolCallId);
          break;
        case "error":
          throw new Error(event.message);
      }
    }
    for (const toolCall of toolCalls.values()) toolCall.close();
  });
}
