/** Browser-safe error → message text. */
export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
