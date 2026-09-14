import { isRecord } from "@assistant-ui/core/internal";

export const toAdkFunctionResponse = (
  result: unknown,
): Record<string, unknown> =>
  Array.isArray(result)
    ? { results: result }
    : isRecord(result)
      ? result
      : { result };
