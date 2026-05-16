import type { ToolModelContentPart } from "assistant-stream";

const ENVELOPE_KEY = "__aui_modelContent";

export type ModelContentEnvelope<TResult = unknown> = {
  readonly [ENVELOPE_KEY]: readonly ToolModelContentPart[];
  readonly value: TResult;
};

export function isModelContentEnvelope(
  value: unknown,
): value is ModelContentEnvelope {
  return (
    value != null &&
    typeof value === "object" &&
    ENVELOPE_KEY in value &&
    Array.isArray((value as Record<string, unknown>)[ENVELOPE_KEY])
  );
}

export function wrapModelContentEnvelope<TResult>(
  result: TResult,
  modelContent: readonly ToolModelContentPart[],
): ModelContentEnvelope<TResult> {
  return { [ENVELOPE_KEY]: modelContent, value: result };
}

export function unwrapModelContentEnvelope(output: unknown): {
  result: unknown;
  modelContent?: readonly ToolModelContentPart[];
} {
  if (isModelContentEnvelope(output)) {
    return {
      result: output.value,
      modelContent: output[ENVELOPE_KEY],
    };
  }
  return { result: output };
}
