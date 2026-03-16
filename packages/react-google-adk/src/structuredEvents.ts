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
    const err: AdkStructuredEvent & { type: "error" } = { type: "error" };
    if (event.errorCode != null) err.errorCode = event.errorCode;
    if (event.errorMessage != null) err.errorMessage = event.errorMessage;
    result.push(err);
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
        const call: AdkStructuredEvent & { type: "tool_call" } = {
          type: "tool_call",
          call: { name: part.functionCall.name, args: part.functionCall.args },
        };
        if (part.functionCall.id != null) call.call.id = part.functionCall.id;
        result.push(call);
      }
      if (part.functionResponse) {
        const tr: AdkStructuredEvent & { type: "tool_result" } = {
          type: "tool_result",
          result: {
            name: part.functionResponse.name,
            response: part.functionResponse.response,
          },
        };
        if (part.functionResponse.id != null)
          tr.result.id = part.functionResponse.id;
        result.push(tr);
      }
      if (part.executableCode) {
        const ce: AdkStructuredEvent & { type: "call_code" } = {
          type: "call_code",
          code: { code: part.executableCode.code },
        };
        if (part.executableCode.language != null)
          ce.code.language = part.executableCode.language;
        result.push(ce);
      }
      if (part.codeExecutionResult) {
        const cr: AdkStructuredEvent & { type: "code_result" } = {
          type: "code_result",
          result: { output: part.codeExecutionResult.output },
        };
        if (part.codeExecutionResult.outcome != null)
          cr.result.outcome = part.codeExecutionResult.outcome;
        result.push(cr);
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
