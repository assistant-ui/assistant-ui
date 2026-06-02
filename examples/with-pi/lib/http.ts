/** Shared response helpers for the Pi example routes. */

/** 500 with a JSON `{ error }` body — `createPiHttpClient` surfaces the text. */
export const fail = (error: unknown): Response =>
  Response.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  );

/** 204 for write endpoints that return nothing. */
export const noContent = (): Response => new Response(null, { status: 204 });
