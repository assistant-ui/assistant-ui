import { isRecord } from "@assistant-ui/core/internal";

export const isAdkFunctionError = (response: unknown): boolean =>
  isRecord(response) &&
  Object.hasOwn(response, "error") &&
  response.error !== undefined;

export const toAdkFunctionResponse = (
  result: unknown,
  isError = false,
): Record<string, unknown> => {
  if (isError && !isAdkFunctionError(result)) return { error: result ?? null };
  return Array.isArray(result)
    ? { results: result }
    : isRecord(result)
      ? result
      : { result };
};
