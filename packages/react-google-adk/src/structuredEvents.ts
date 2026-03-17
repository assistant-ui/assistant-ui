import type { AdkEvent, AdkStructuredEvent } from "./types";
import { isFinalResponse } from "./AdkEventAccumulator";

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
