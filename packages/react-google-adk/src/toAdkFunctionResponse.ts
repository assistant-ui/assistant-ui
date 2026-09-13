import { isRecord } from "@assistant-ui/core/internal";

export const toAdkFunctionResponse = (
  result: unknown,
): Record<string, unknown> => (isRecord(result) ? result : { output: result });
