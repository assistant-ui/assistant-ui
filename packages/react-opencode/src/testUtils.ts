import { vi } from "vitest";

export const rejectWhenThrowing = (error: Error) =>
  vi.fn(
    (_parameters: unknown, options?: { throwOnError?: boolean | undefined }) =>
      options?.throwOnError
        ? Promise.reject(error)
        : Promise.resolve({ data: undefined, error }),
  );
