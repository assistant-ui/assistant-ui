import type { AdkEvent, AdkStructuredEvent } from "./types";

/**
 * Checks if an event is a final response using the same logic as ADK's
 * `isFinalResponse()`. Returns true when:
 * - `skipSummarization` is set, OR
 * - `longRunningToolIds` is non-empty, OR
 * - Event is non-partial, has content parts, no function calls/responses,
 *   and no trailing code execution result.
 */
function isFinalResponse(event: AdkEvent): boolean {
  if (
    event.actions?.skipSummarization ||
    (event.longRunningToolIds && event.longRunningToolIds.length > 0)
  ) {
    return true;
  }

  const parts = event.content?.parts;
  return (
    !event.partial &&
    (parts?.length ?? 0) > 0 &&
    !parts!.some((p) => p.functionCall) &&
    !parts!.some((p) => p.functionResponse) &&
    !parts![parts!.length - 1]?.codeExecutionResult
  );
}

/**
 * Converts a raw `AdkEvent` into an array of structured, typed events.
 * Useful for building custom event renderers.
 */
export function toAdkStructuredEvents(event: AdkEvent): AdkStructuredEvent[] {
  const result: AdkStructuredEvent[] = [];

  if (event.errorCode || event.errorMessage) {
    result.push({
      type: "error",
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
    });
  }

  const parts = event.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.text != null) {
        if (part.thought) {
          result.push({ type: "thought", content: part.text });
        } else {
          result.push({ type: "content", content: part.text });
        }
      }
      if (part.functionCall) {
        result.push({
          type: "tool_call",
          call: {
            name: part.functionCall.name,
            id: part.functionCall.id,
            args: part.functionCall.args,
          },
        });
      }
      if (part.functionResponse) {
        result.push({
          type: "tool_result",
          result: {
            name: part.functionResponse.name,
            id: part.functionResponse.id,
            response: part.functionResponse.response,
          },
        });
      }
      if (part.executableCode) {
        result.push({
          type: "call_code",
          code: {
            code: part.executableCode.code,
            language: part.executableCode.language,
          },
        });
      }
      if (part.codeExecutionResult) {
        result.push({
          type: "code_result",
          result: {
            output: part.codeExecutionResult.output,
            outcome: part.codeExecutionResult.outcome,
          },
        });
      }
    }
  }

  if (event.actions?.requestedToolConfirmations) {
    result.push({
      type: "tool_confirmation",
      confirmations: event.actions.requestedToolConfirmations,
    });
  }

  if (isFinalResponse(event) && result.length === 0) {
    result.push({ type: "finished" });
  }

  return result;
}
